import { authRouter } from "~/server/api/routers/auth";
import { chatRouter } from "~/server/api/routers/chat";
import { inboxRouter } from "~/server/api/routers/inbox";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  chat: chatRouter,
  auth: authRouter,
  inbox: inboxRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.inbox.listAgents();
 */
export const createCaller = createCallerFactory(appRouter);
