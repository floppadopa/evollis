import "server-only";

import type { IntentCategory } from "@prisma/client";

import { openai, OPENAI_MODEL } from "./openai";
import { SYSTEM_PROMPT, CATEGORY_PROMPTS } from "./prompts";
import { toChatMessages, type ThreadMessage } from "./history";

export type GeneratedReply = {
  content: string;
  /** True when the model emitted the internal hand-off marker. */
  escalate: boolean;
  modelName: string;
  tokensIn: number | null;
  tokensOut: number | null;
  latencyMs: number;
};

/** Internal hand-off signal the model appends when transferring to a human.
 *  Stripped before the reply is stored/shown, so the client never sees it. */
const ESCALATE_MARKER = /\[\[ESCALATE\]\]/gi;

/**
 * Generate the assistant reply for a conversation.
 *
 * Messages are stacked as:
 *   1. SYSTEM_PROMPT             (generic Evollis context, always)
 *   2. CATEGORY_PROMPTS[category](category-specific guidance)
 *   3. …conversation history
 */
export async function generateReply(
  category: IntentCategory,
  messages: ThreadMessage[],
): Promise<GeneratedReply> {
  const start = Date.now();

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    // No custom temperature: GPT-5-family reasoning models only accept the
    // default value.
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: CATEGORY_PROMPTS[category] },
      ...toChatMessages(messages),
    ],
  });

  const raw =
    completion.choices[0]?.message.content?.trim() ??
    "Je suis désolé, je n'ai pas pu générer de réponse. Un conseiller Evollis va prendre le relais.";

  // Detect the hand-off marker, then strip it so it never reaches the client.
  const escalate = ESCALATE_MARKER.test(raw);
  const content =
    raw.replace(ESCALATE_MARKER, "").trim() ||
    "Je transmets votre demande à un conseiller Evollis.";

  return {
    content,
    escalate,
    modelName: completion.model ?? OPENAI_MODEL,
    tokensIn: completion.usage?.prompt_tokens ?? null,
    tokensOut: completion.usage?.completion_tokens ?? null,
    latencyMs: Date.now() - start,
  };
}
