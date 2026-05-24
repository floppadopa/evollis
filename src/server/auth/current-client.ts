import "server-only";

import { cookies } from "next/headers";

import { db } from "~/server/db";
import { CLIENT_COOKIE } from "./cookie";

/** Read the logged-in client id from the cookie (server components / RSC). */
export async function getCurrentClientId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CLIENT_COOKIE)?.value ?? null;
}

/** Load the full logged-in client, or null if not signed in. */
export async function getCurrentClient() {
  const id = await getCurrentClientId();
  if (!id) return null;
  return db.client.findUnique({ where: { id } });
}
