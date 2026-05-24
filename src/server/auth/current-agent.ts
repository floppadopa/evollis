import "server-only";

import { cookies } from "next/headers";

import { db } from "~/server/db";
import { AGENT_COOKIE } from "./cookie";

/** Read the logged-in agent id from the cookie (server components / RSC). */
export async function getCurrentAgentId(): Promise<string | null> {
  const store = await cookies();
  return store.get(AGENT_COOKIE)?.value ?? null;
}

/** Load the full logged-in agent, or null if not signed in. */
export async function getCurrentAgent() {
  const id = await getCurrentAgentId();
  if (!id) return null;
  return db.agent.findUnique({ where: { id } });
}
