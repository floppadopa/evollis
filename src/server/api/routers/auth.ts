import { Availability } from "@prisma/client";
import { z } from "zod";

import { agentProcedure, createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const agentSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true,
  availability: true,
} as const;

export const authRouter = createTRPCRouter({
  listProfiles: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.agent.findMany({
      select: agentSelect,
      orderBy: { name: "asc" },
    });
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (ctx.currentAgentId === null) return null;
    return ctx.db.agent.findUnique({
      where: { id: ctx.currentAgentId },
      select: agentSelect,
    });
  }),

  setAvailability: agentProcedure
    .input(z.object({ availability: z.nativeEnum(Availability) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.agent.update({
        where: { id: ctx.currentAgentId },
        data: {
          availability: input.availability,
          lastSeenAt: new Date(),
        },
        select: agentSelect,
      });
    }),
});
