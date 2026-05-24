import "server-only";

import { IntentCategory } from "@prisma/client";

import { env } from "~/env";
import { openai, OPENAI_MODEL } from "./openai";
import { CLASSIFIER_PROMPT } from "./prompts";
import { toTranscript, type ThreadMessage } from "./history";

export type Classification = {
  category: IntentCategory;
  confidence: number;
};

/** Only these three are valid classifier outputs; everything else → UNKNOWN. */
const ALLOWED: ReadonlySet<string> = new Set([
  IntentCategory.BILLING,
  IntentCategory.TECHNICAL,
  IntentCategory.GENERAL,
]);

function coerceCategory(value: unknown): IntentCategory {
  if (typeof value === "string" && ALLOWED.has(value)) {
    return value as IntentCategory;
  }
  return IntentCategory.UNKNOWN;
}

function coerceConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

/**
 * OpenAI provider — asks an LLM which of the three categories fits best.
 * Zero setup, but every message is a billed API call. Uses JSON mode for a
 * parseable result.
 */
async function classifyWithOpenAI(
  messages: ThreadMessage[],
): Promise<Classification> {
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    // No custom temperature: GPT-5-family reasoning models only accept the
    // default. JSON mode keeps the output parseable.
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CLASSIFIER_PROMPT },
      { role: "user", content: `Conversation :\n\n${toTranscript(messages)}` },
    ],
  });

  const raw = completion.choices[0]?.message.content ?? "{}";
  const parsed = JSON.parse(raw) as { category?: unknown; confidence?: unknown };

  return {
    category: coerceCategory(parsed.category),
    confidence: coerceConfidence(parsed.confidence),
  };
}

/**
 * BERTopic provider — delegates to the local Python service (ml/bertopic),
 * which embeds the conversation and assigns it to the nearest category cluster.
 * Free and scalable (no per-message API cost), and the production-grade path
 * once cluster boundaries are fit on proprietary labelled data.
 */
async function classifyWithBertopic(
  messages: ThreadMessage[],
): Promise<Classification> {
  const res = await fetch(`${env.BERTOPIC_SERVICE_URL}/classify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: toTranscript(messages) }),
    // The service holds the embedding model in memory; first call after a cold
    // start can take a moment, so allow some headroom.
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`BERTopic service responded ${res.status}`);
  }

  const data = (await res.json()) as {
    category?: unknown;
    confidence?: unknown;
  };

  return {
    category: coerceCategory(data.category),
    confidence: coerceConfidence(data.confidence),
  };
}

/**
 * Classify the WHOLE conversation into BILLING / TECHNICAL / GENERAL.
 *
 * The active provider is selected by `CLASSIFIER_PROVIDER` (env). Any failure
 * — network, bad JSON, unexpected label, service down — degrades gracefully to
 * UNKNOWN with zero confidence so the send pipeline never breaks on
 * classification.
 */
export async function classifyConversation(
  messages: ThreadMessage[],
): Promise<Classification> {
  try {
    if (env.CLASSIFIER_PROVIDER === "bertopic") {
      return await classifyWithBertopic(messages);
    }
    return await classifyWithOpenAI(messages);
  } catch (err) {
    console.error(
      `[classify] provider "${env.CLASSIFIER_PROVIDER}" failed; defaulting to UNKNOWN:`,
      err,
    );
    return { category: IntentCategory.UNKNOWN, confidence: 0 };
  }
}
