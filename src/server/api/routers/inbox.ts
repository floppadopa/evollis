import { z } from "zod";
import { ConversationStatus, Priority, MessageRole } from "@prisma/client";

import { createTRPCRouter, agentProcedure } from "~/server/api/trpc";
import { imagesFromMetadata } from "~/server/ai/history";

const ACTIVE_STATUSES: ConversationStatus[] = [
  ConversationStatus.OPEN,
  ConversationStatus.PENDING,
  ConversationStatus.SNOOZED,
  ConversationStatus.ESCALATED,
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build the status filter clause from the optional input. */
function statusFilter(
  status: ConversationStatus | "ALL" | undefined,
): { status?: { in: ConversationStatus[] } | ConversationStatus } {
  if (status === undefined) return { status: { in: ACTIVE_STATUSES } };
  if (status === "ALL") return {};
  return { status };
}

/** Build the assignee filter clause from the filter string. */
function assigneeFilter(
  filter: "mine" | "unassigned" | "all",
  agentId: string,
): { assigneeId?: string | null } {
  if (filter === "mine") return { assigneeId: agentId };
  if (filter === "unassigned") return { assigneeId: null };
  return {};
}

/** Build the search clause (title / client name / client email). */
function searchFilter(search: string | undefined) {
  if (!search || search.trim() === "") return {};
  const contains = { contains: search, mode: "insensitive" as const };
  return {
    OR: [
      { title: contains },
      { client: { name: contains } },
      { client: { email: contains } },
    ],
  };
}

/** Inputs shared by `counts` and `listConversations` so the tab counts always
 *  match the filtered list. */
const filterInput = z.object({
  status: z
    .union([z.nativeEnum(ConversationStatus), z.literal("ALL")])
    .optional(),
  search: z.string().optional(),
});

// ─── Router ─────────────────────────────────────────────────────────────────

export const inboxRouter = createTRPCRouter({
  // ── counts ─────────────────────────────────────────────────────────────────
  // Per-tab badge = number of UNREAD conversations in that bucket, under the
  // SAME status/search filter as the list. A conversation is unread when its
  // latest customer (USER) message is newer than the agent's read marker.
  counts: agentProcedure
    .input(filterInput.optional())
    .query(async ({ ctx, input }) => {
      const base = {
        ...statusFilter(input?.status),
        ...searchFilter(input?.search),
      };

      // One query for the whole filtered set; bucket + unread are derived here.
      const convos = await ctx.db.conversation.findMany({
        where: base,
        select: {
          assigneeId: true,
          agentLastReadAt: true,
          messages: {
            where: { role: MessageRole.USER, isPrivate: false },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      });

      let mine = 0;
      let unassigned = 0;
      let all = 0;
      for (const c of convos) {
        const lastInbound = c.messages[0]?.createdAt;
        if (!lastInbound) continue;
        const readUpTo = c.agentLastReadAt ?? new Date(0);
        if (lastInbound <= readUpTo) continue; // already read

        all += 1;
        if (c.assigneeId === ctx.currentAgentId) mine += 1;
        else if (c.assigneeId === null) unassigned += 1;
      }

      return { mine, unassigned, all };
    }),

  // ── listConversations ──────────────────────────────────────────────────────
  listConversations: agentProcedure
    .input(filterInput.extend({ filter: z.enum(["mine", "unassigned", "all"]) }))
    .query(async ({ ctx, input }) => {
      const conversations = await ctx.db.conversation.findMany({
        where: {
          ...assigneeFilter(input.filter, ctx.currentAgentId),
          ...statusFilter(input.status),
          ...searchFilter(input.search),
        },
        orderBy: { lastMessageAt: "desc" },
        include: {
          client: { select: { id: true, name: true, avatarUrl: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          labels: { select: { id: true, name: true, color: true } },
          messages: {
            where: { isPrivate: false },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true, role: true },
          },
        },
      });

      // Compute unread counts in parallel
      const unreadCounts = await Promise.all(
        conversations.map((conv) =>
          ctx.db.message.count({
            where: {
              conversationId: conv.id,
              role: MessageRole.USER,
              isPrivate: false,
              createdAt: { gt: conv.agentLastReadAt ?? new Date(0) },
            },
          }),
        ),
      );

      return conversations.map((conv, i) => {
        const lastMsg = conv.messages[0] ?? null;
        return {
          id: conv.id,
          title: conv.title,
          status: conv.status,
          priority: conv.priority,
          category: conv.category,
          channel: conv.channel,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: unreadCounts[i] ?? 0,
          lastMessagePreview: lastMsg?.content ?? null,
          lastMessageRole: lastMsg?.role ?? null,
          client: conv.client,
          assignee: conv.assignee,
          labels: conv.labels,
        };
      });
    }),

  // ── getConversation ────────────────────────────────────────────────────────
  getConversation: agentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const conv = await ctx.db.conversation.findUnique({
        where: { id: input.id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              company: true,
              avatarUrl: true,
              channel: true,
              createdAt: true,
            },
          },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          labels: { select: { id: true, name: true, color: true } },
          participants: {
            include: {
              agent: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              role: true,
              content: true,
              isPrivate: true,
              createdAt: true,
              category: true,
              metadata: true, // holds attached image data URLs
              authorAgent: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
        },
      });

      if (!conv) return null;

      return {
        id: conv.id,
        title: conv.title,
        status: conv.status,
        priority: conv.priority,
        category: conv.category,
        channel: conv.channel,
        takenOver: conv.takenOver,
        createdAt: conv.createdAt,
        lastMessageAt: conv.lastMessageAt,
        snoozedUntil: conv.snoozedUntil,
        resolvedAt: conv.resolvedAt,
        client: conv.client,
        assignee: conv.assignee,
        labels: conv.labels,
        participants: conv.participants.map((p) => p.agent),
        messages: conv.messages.map(({ metadata, ...m }) => ({
          ...m,
          images: imagesFromMetadata(metadata),
        })),
      };
    }),

  // ── previousConversations ─────────────────────────────────────────────────
  previousConversations: agentProcedure
    .input(z.object({ clientId: z.string(), excludeId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.conversation.findMany({
        where: {
          clientId: input.clientId,
          id: { not: input.excludeId },
        },
        orderBy: { lastMessageAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          lastMessageAt: true,
        },
      });
    }),

  // ── listAgents ─────────────────────────────────────────────────────────────
  listAgents: agentProcedure.query(async ({ ctx }) => {
    return ctx.db.agent.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, avatarUrl: true, availability: true },
    });
  }),

  // ── listLabels ─────────────────────────────────────────────────────────────
  listLabels: agentProcedure.query(async ({ ctx }) => {
    return ctx.db.label.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    });
  }),

  // ── sendReply ─────────────────────────────────────────────────────────────
  sendReply: agentProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [message] = await Promise.all([
        ctx.db.message.create({
          data: {
            conversationId: input.conversationId,
            role: MessageRole.OPERATOR,
            isPrivate: false,
            authorAgentId: ctx.currentAgentId,
            content: input.content,
          },
        }),
        ctx.db.conversation.update({
          where: { id: input.conversationId },
          data: { lastMessageAt: now },
        }),
      ]);
      return message;
    }),

  // ── addPrivateNote ────────────────────────────────────────────────────────
  addPrivateNote: agentProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.message.create({
        data: {
          conversationId: input.conversationId,
          role: MessageRole.OPERATOR,
          isPrivate: true,
          authorAgentId: ctx.currentAgentId,
          content: input.content,
        },
      });
    }),

  // ── assign ────────────────────────────────────────────────────────────────
  assign: agentProcedure
    .input(
      z.object({
        conversationId: z.string(),
        agentId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: { assigneeId: input.agentId },
      });
    }),

  // ── setStatus ─────────────────────────────────────────────────────────────
  setStatus: agentProcedure
    .input(
      z.object({
        conversationId: z.string(),
        status: z.nativeEnum(ConversationStatus),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: {
          status: input.status,
          resolvedAt:
            input.status === ConversationStatus.RESOLVED ? new Date() : null,
          snoozedUntil:
            input.status !== ConversationStatus.SNOOZED ? null : undefined,
        },
      });
    }),

  // ── setPriority ───────────────────────────────────────────────────────────
  setPriority: agentProcedure
    .input(
      z.object({
        conversationId: z.string(),
        priority: z.nativeEnum(Priority),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: { priority: input.priority },
      });
    }),

  // ── addLabel ──────────────────────────────────────────────────────────────
  addLabel: agentProcedure
    .input(z.object({ conversationId: z.string(), labelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: { labels: { connect: { id: input.labelId } } },
      });
    }),

  // ── removeLabel ───────────────────────────────────────────────────────────
  removeLabel: agentProcedure
    .input(z.object({ conversationId: z.string(), labelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: { labels: { disconnect: { id: input.labelId } } },
      });
    }),

  // ── snooze ────────────────────────────────────────────────────────────────
  snooze: agentProcedure
    .input(
      z.object({
        conversationId: z.string(),
        until: z.coerce.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: {
          status: ConversationStatus.SNOOZED,
          snoozedUntil: input.until,
        },
      });
    }),

  // ── markRead ──────────────────────────────────────────────────────────────
  markRead: agentProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: { agentLastReadAt: new Date() },
      });
    }),

  // ── updateContact ─────────────────────────────────────────────────────────
  updateContact: agentProcedure
    .input(
      z.object({
        clientId: z.string(),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { clientId, ...fields } = input;
      return ctx.db.client.update({
        where: { id: clientId },
        data: fields,
      });
    }),

  // ── addParticipant ────────────────────────────────────────────────────────
  addParticipant: agentProcedure
    .input(z.object({ conversationId: z.string(), agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.participant.create({
        data: {
          conversationId: input.conversationId,
          agentId: input.agentId,
        },
      });
    }),

  // ── removeParticipant ─────────────────────────────────────────────────────
  removeParticipant: agentProcedure
    .input(z.object({ conversationId: z.string(), agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.participant.delete({
        where: {
          conversationId_agentId: {
            conversationId: input.conversationId,
            agentId: input.agentId,
          },
        },
      });
    }),
});
