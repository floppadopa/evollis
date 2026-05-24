"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { db } from "~/server/db";
import { AGENT_COOKIE, CLIENT_COOKIE } from "./cookie";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

/**
 * Demo login: set the agent cookie and flip the agent online. No password
 * check — this is a one-click demo sign-in to a seeded agent profile.
 */
export async function loginAs(agentId: string): Promise<void> {
  const agent = await db.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new Error("Profil introuvable");

  const store = await cookies();
  store.set(AGENT_COOKIE, agentId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });

  await db.agent.update({
    where: { id: agentId },
    data: { availability: "ONLINE", lastSeenAt: new Date() },
  });

  revalidatePath("/inbox");
}

/** Demo logout: flip the agent offline and clear the cookie. */
export async function logout(): Promise<void> {
  const store = await cookies();
  const id = store.get(AGENT_COOKIE)?.value;
  if (id) {
    await db.agent.update({
      where: { id },
      data: { availability: "OFFLINE", lastSeenAt: new Date() },
    });
  }
  store.delete(AGENT_COOKIE);
  revalidatePath("/inbox");
}

/**
 * Demo client sign-in (customer chat): set the client cookie so the chat is
 * scoped to that customer's conversations. One-click, no password.
 */
export async function loginAsClient(clientId: string): Promise<void> {
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) throw new Error("Profil client introuvable");

  const store = await cookies();
  store.set(CLIENT_COOKIE, clientId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });

  revalidatePath("/");
}

/** Demo client sign-out: clear the client cookie. */
export async function clientLogout(): Promise<void> {
  const store = await cookies();
  store.delete(CLIENT_COOKIE);
  revalidatePath("/");
}
