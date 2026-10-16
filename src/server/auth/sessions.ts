import "server-only";
import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { randomToken } from "@/server/rng";

/**
 * Database-backed sessions.
 * - The browser cookie holds a random 256-bit token.
 * - The database stores only SHA-256(token) as the session id. Someone who reads the
 *   database can't turn a row back into a working cookie.
 * - Logging out deletes the row, so the session dies immediately on every device that had it.
 */

export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(db: PrismaClient, userId: string) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.session.create({ data: { id: hashSessionToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export interface SessionUser {
  id: string;
  username: string;
  email: string;
}

/** Returns the session's user, or null if the token is unknown or expired. */
export async function validateSessionToken(
  db: PrismaClient,
  token: string,
): Promise<{ user: SessionUser; expiresAt: Date } | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;

  const id = hashSessionToken(token);
  const session = await db.session.findUnique({
    where: { id },
    include: { user: { select: { id: true, username: true, email: true } } },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.deleteMany({ where: { id } });
    return null;
  }
  return { user: session.user, expiresAt: session.expiresAt };
}

export async function invalidateSession(db: PrismaClient, token: string): Promise<void> {
  await db.session.deleteMany({ where: { id: hashSessionToken(token) } });
}

/** Logs a user out everywhere (used later for password changes). */
export async function invalidateAllSessions(db: PrismaClient, userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}
