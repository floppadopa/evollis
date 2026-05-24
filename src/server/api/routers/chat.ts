import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { MessageRole, IntentCategory } from "@prisma/client";

import {
  createTRPCRouter,
  publicProcedure,
  clientProcedure,
} from "~/server/api/trpc";
import { classifyConversation } from "~/server/ai/classify";
import { generateReply } from "~/server/ai/respond";
import { imagesFromMetadata, type ThreadMessage } from "~/server/ai/history";

/**
 * End-user chat router (the Evollis chat front).
 *
 * Scoped to the cookie-identified customer (`clientProcedure`): the sidebar and
 * threads only ever surface the logged-in client's own conversations.
 */
export const chatRouter = createTRPCRouter({
  // Seeded customer profiles for the demo connection modal.
  listClientProfiles: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, avatarUrl: true, channel: true },
    });
  }),

  // The currently connected customer (or null).
  me: publicProcedure.query(async ({ ctx }) => {
    if (ctx.currentClientId === null) return null;
    return ctx.db.client.findUnique({
      where: { id: ctx.currentClientId },
      select: { id: true, name: true, email: true, avatarUrl: true, channel: true },
    });
  }),

  // List the connected customer's conversations for the sidebar, most-recent first.
  listConversations: clientProcedure.query(async ({ ctx }) => {
    return ctx.db.conversation.findMany({
      // Archived conversations are hidden from the customer's sidebar.
      where: { clientId: ctx.currentClientId, status: { not: "ARCHIVED" } },
      orderBy: { lastMessageAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        category: true,
        lastMessageAt: true,
        client: { select: { name: true } },
      },
    });
  }),

  // Full message thread for one of the connected customer's conversations.
  getConversation: clientProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const conv = await ctx.db.conversation.findFirst({
        // Scoped to the current client so a customer can't load someone else's thread.
        where: { id: input.id, clientId: ctx.currentClientId },
        select: {
          id: true,
          title: true,
          status: true,
          category: true,
          takenOver: true, // true once a human has been handed the thread
          client: {
            select: { name: true, email: true, avatarUrl: true },
          },
          messages: {
            // Customers never see internal private notes.
            where: { isPrivate: false },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              role: true,
              content: true,
              category: true,
              metadata: true, // holds attached image data URLs
              authorAgent: { select: { name: true, avatarUrl: true } },
              createdAt: true,
            },
          },
        },
      });

      if (!conv) return null;

      // Surface attached images as a clean `images` array (drop raw metadata).
      return {
        ...conv,
        messages: conv.messages.map(({ metadata, ...m }) => ({
          ...m,
          images: imagesFromMetadata(metadata),
        })),
      };
    }),

  // Customer feedback on the conversation: "Résolu" closes it, "Pas résolu"
  // hands the thread over to a human (escalation).
  submitFeedback: clientProcedure
    .input(z.object({ conversationId: z.string(), resolved: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // updateMany scopes by clientId so a customer can only act on their own thread.
      await ctx.db.conversation.updateMany({
        where: { id: input.conversationId, clientId: ctx.currentClientId },
        data: input.resolved
          ? { status: "RESOLVED", resolvedAt: new Date(), takenOver: false }
          : { status: "ESCALATED", takenOver: true },
      });
      return { resolved: input.resolved };
    }),

  // Archive one of the customer's own conversations (hides it from the sidebar).
  archiveConversation: clientProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // updateMany scopes by clientId so a customer can only archive their own.
      await ctx.db.conversation.updateMany({
        where: { id: input.conversationId, clientId: ctx.currentClientId },
        data: { status: "ARCHIVED" },
      });
      return { id: input.conversationId };
    }),

  // Permanently delete one of the customer's own conversations (messages and
  // participants cascade — see schema onDelete).
  deleteConversation: clientProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // deleteMany scopes by clientId so a customer can only delete their own.
      await ctx.db.conversation.deleteMany({
        where: { id: input.conversationId, clientId: ctx.currentClientId },
      });
      return { id: input.conversationId };
    }),

  // Send a message from the connected customer, then run the AI pipeline:
  //   1. persist the USER message
  //   2. classify the WHOLE conversation (BILLING / TECHNICAL / GENERAL)
  //   3. generate + persist an ASSISTANT reply (unless a human took over)
  // A null/"new" conversationId starts a fresh conversation for the customer.
  sendMessage: clientProcedure
    .input(
      z
        .object({
          conversationId: z.string().nullable(),
          content: z.string().trim().default(""),
          // Attached images as base64 data URLs (sent to OpenAI vision).
          images: z
            .array(z.string().startsWith("data:image/"))
            .max(6)
            .optional(),
        })
        // A message must carry text or at least one image.
        .refine((d) => d.content.length > 0 || (d.images?.length ?? 0) > 0, {
          message: "Message vide.",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const isNew =
        input.conversationId === null || input.conversationId === "new";

      // ── 1. Resolve (or create) the conversation, scoped to this client ──────
      let conversation: {
        id: string;
        status: string;
        takenOver: boolean;
      } | null;

      if (isNew) {
        const created = await ctx.db.conversation.create({
          data: {
            clientId: ctx.currentClientId,
            channel: "WEB",
            status: "OPEN",
            title: input.content.slice(0, 60) || "Pièce jointe",
            lastMessageAt: now,
          },
          select: { id: true, status: true, takenOver: true },
        });
        conversation = created;
      } else {
        conversation = await ctx.db.conversation.findFirst({
          where: { id: input.conversationId!, clientId: ctx.currentClientId },
          select: { id: true, status: true, takenOver: true },
        });
      }

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation introuvable.",
        });
      }

      const conversationId = conversation.id;

      // ── 2. Persist the customer message (with any attached images) ──────────
      const userMessage = await ctx.db.message.create({
        data: {
          conversationId,
          role: MessageRole.USER,
          content: input.content,
          channel: "WEB",
          ...(input.images && input.images.length > 0
            ? { metadata: { images: input.images } }
            : {}),
        },
      });
      await ctx.db.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: now },
      });

      // ── 3. Classify the whole conversation (text only) ──────────────────────
      const threadRows = await ctx.db.message.findMany({
        where: { conversationId, isPrivate: false },
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true, metadata: true },
      });
      const thread: ThreadMessage[] = threadRows.map((m) => ({
        role: m.role,
        content: m.content,
        images: imagesFromMetadata(m.metadata),
      }));

      const { category, confidence } = await classifyConversation(thread);

      // Denormalize onto the conversation (for inbox filtering) and tag the
      // customer message that triggered this classification.
      await Promise.all([
        ctx.db.conversation.update({
          where: { id: conversationId },
          data: { category },
        }),
        ctx.db.message.update({
          where: { id: userMessage.id },
          data: { category, categoryConfidence: confidence },
        }),
      ]);

      // A human is handling the thread → don't let the bot reply.
      if (conversation.takenOver || conversation.status === "ESCALATED") {
        return { conversationId, category, assistantMessage: null };
      }

      // ── 4. Generate + persist the assistant reply ───────────────────────────
      const reply = await generateReply(category, thread);
      const replyAt = new Date();

      const assistantMessage = await ctx.db.message.create({
        data: {
          conversationId,
          role: MessageRole.ASSISTANT,
          content: reply.content,
          channel: "WEB",
          modelName: reply.modelName,
          tokensIn: reply.tokensIn,
          tokensOut: reply.tokensOut,
          latencyMs: reply.latencyMs,
        },
      });

      // The model can hand the thread to a human via the internal marker —
      // this triggers the same state as the customer's "Pas résolu".
      await ctx.db.conversation.update({
        where: { id: conversationId },
        data: reply.escalate
          ? { lastMessageAt: replyAt, status: "ESCALATED", takenOver: true }
          : { lastMessageAt: replyAt },
      });
      if (reply.escalate) {
        await ctx.db.message.create({
          data: {
            conversationId,
            role: MessageRole.SYSTEM,
            content: "Transféré à un conseiller (escalade automatique de l'IA).",
            channel: "WEB",
          },
        });
      }

      return {
        conversationId,
        category,
        assistantMessage,
        escalated: reply.escalate,
      };
    }),

  // Regenerate the latest AI reply (the "Régénérer" action on a bot message):
  // drop the last ASSISTANT message and generate a fresh one from the remaining
  // history, reusing the conversation's current category.
  regenerateReply: clientProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conv = await ctx.db.conversation.findFirst({
        where: { id: input.conversationId, clientId: ctx.currentClientId },
        select: { id: true, category: true, status: true, takenOver: true },
      });
      if (!conv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation introuvable.",
        });
      }
      // A human owns the thread → no bot regeneration.
      if (conv.takenOver || conv.status === "ESCALATED") {
        return { regenerated: false as const };
      }

      // Drop the most recent AI reply so the thread ends on the customer turn.
      const lastAssistant = await ctx.db.message.findFirst({
        where: {
          conversationId: conv.id,
          role: MessageRole.ASSISTANT,
          isPrivate: false,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (lastAssistant) {
        await ctx.db.message.delete({ where: { id: lastAssistant.id } });
      }

      const threadRows = await ctx.db.message.findMany({
        where: { conversationId: conv.id, isPrivate: false },
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true, metadata: true },
      });
      const thread: ThreadMessage[] = threadRows.map((m) => ({
        role: m.role,
        content: m.content,
        images: imagesFromMetadata(m.metadata),
      }));

      const reply = await generateReply(
        conv.category ?? IntentCategory.GENERAL,
        thread,
      );

      const assistantMessage = await ctx.db.message.create({
        data: {
          conversationId: conv.id,
          role: MessageRole.ASSISTANT,
          content: reply.content,
          channel: "WEB",
          modelName: reply.modelName,
          tokensIn: reply.tokensIn,
          tokensOut: reply.tokensOut,
          latencyMs: reply.latencyMs,
        },
      });
      await ctx.db.conversation.update({
        where: { id: conv.id },
        data: reply.escalate
          ? { lastMessageAt: new Date(), status: "ESCALATED", takenOver: true }
          : { lastMessageAt: new Date() },
      });
      if (reply.escalate) {
        await ctx.db.message.create({
          data: {
            conversationId: conv.id,
            role: MessageRole.SYSTEM,
            content: "Transféré à un conseiller (escalade automatique de l'IA).",
            channel: "WEB",
          },
        });
      }

      return {
        regenerated: true as const,
        assistantMessage,
        escalated: reply.escalate,
      };
    }),
});
