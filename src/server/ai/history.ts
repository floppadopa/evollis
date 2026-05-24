import { MessageRole } from "@prisma/client";
import type OpenAI from "openai";

/** A conversation turn. `images` (data URLs) are only meaningful on USER turns. */
export type ThreadMessage = {
  role: MessageRole;
  content: string;
  images?: string[];
};

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/**
 * Map a stored conversation thread to OpenAI chat messages.
 *
 * - USER (the customer)            → "user" (multimodal if it has images)
 * - ASSISTANT / OPERATOR (our side)→ "assistant"
 * - SYSTEM (audit events)          → dropped
 *
 * Private notes are expected to be filtered out by the caller's query.
 */
export function toChatMessages(messages: ThreadMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of messages) {
    if (m.role === MessageRole.USER) {
      // OpenAI can only fetch data: URIs or absolute http(s) URLs — drop
      // anything else (e.g. relative "/seed/..." demo paths) so the vision
      // call doesn't 400 on an image it can't download.
      const usable = (m.images ?? []).filter(
        (u) =>
          u.startsWith("data:") ||
          u.startsWith("http://") ||
          u.startsWith("https://"),
      );
      if (usable.length > 0) {
        // Vision turn: text part (if any) followed by each image.
        out.push({
          role: "user",
          content: [
            ...(m.content
              ? [{ type: "text" as const, text: m.content }]
              : []),
            ...usable.map((url) => ({
              type: "image_url" as const,
              image_url: { url },
            })),
          ],
        });
      } else {
        out.push({ role: "user", content: m.content });
      }
    } else if (
      m.role === MessageRole.ASSISTANT ||
      m.role === MessageRole.OPERATOR
    ) {
      out.push({ role: "assistant", content: m.content });
    }
    // SYSTEM messages carry no conversational value for the model.
  }
  return out;
}

/** Flatten a thread into a plain transcript, for the classifier prompt.
 *  Text-only: the classifiers don't use images. */
export function toTranscript(messages: ThreadMessage[]): string {
  return messages
    .filter(
      (m) =>
        m.role === MessageRole.USER ||
        m.role === MessageRole.ASSISTANT ||
        m.role === MessageRole.OPERATOR,
    )
    .map((m) => {
      const speaker = m.role === MessageRole.USER ? "Client" : "Evollis";
      const imageNote =
        m.images && m.images.length > 0
          ? ` [${m.images.length} image(s) jointe(s)]`
          : "";
      return `${speaker}: ${m.content}${imageNote}`;
    })
    .join("\n");
}

/** Safely pull the image data-URL list out of a Message.metadata JSON value. */
export function imagesFromMetadata(metadata: unknown): string[] {
  if (metadata && typeof metadata === "object" && "images" in metadata) {
    const imgs = (metadata as { images?: unknown }).images;
    if (Array.isArray(imgs)) {
      return imgs.filter((u): u is string => typeof u === "string");
    }
  }
  return [];
}
