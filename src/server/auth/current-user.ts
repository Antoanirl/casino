import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/server/db";
import { createSession, invalidateSession, validateSessionToken } from "@/server/auth/sessions";

/** Cookie glue between Next.js and the session store. */

export const SESSION_COOKIE = "session";

async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true, // JavaScript in the page can't read it, so XSS can't steal the session
    secure: process.env.NODE_ENV === "production", // HTTPS only on the live site
    sameSite: "lax", // not sent on cross-site POSTs (CSRF protection)
    path: "/",
    expires: expiresAt,
  });
}

/** Starts a session for the user and sets the cookie. Server actions only. */
export async function signIn(userId: string) {
  const { token, expiresAt } = await createSession(getDb(), userId);
  await setSessionCookie(token, expiresAt);
}

/** Ends the current session and clears the cookie. Server actions only. */
export async function signOut() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await invalidateSession(getDb(), token);
  store.delete(SESSION_COOKIE);
}

/**
 * The logged-in user, or null. `cache` makes repeated calls within one request
 * (header, page, ...) share a single database lookup.
 */
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await validateSessionToken(getDb(), token);
  return result?.user ?? null;
});

/** For pages that need a logged-in user: sends everyone else to the login page. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
