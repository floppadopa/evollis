// Pure cookie helpers shared by the tRPC context and the auth server actions.
// Kept free of `next/headers` so it can be imported anywhere (including the
// tRPC context, which only has the raw request Headers).

export const AGENT_COOKIE = "evollis_agent";
export const CLIENT_COOKIE = "evollis_client";

/** Read a cookie value out of a raw `Cookie:` header. */
function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("=")) || null;
    }
  }
  return null;
}

/** The logged-in agent id (employee inbox). */
export function parseAgentId(cookieHeader: string | null): string | null {
  return readCookie(cookieHeader, AGENT_COOKIE);
}

/** The logged-in client id (customer chat). */
export function parseClientId(cookieHeader: string | null): string | null {
  return readCookie(cookieHeader, CLIENT_COOKIE);
}
