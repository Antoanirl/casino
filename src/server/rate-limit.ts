import "server-only";
import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

/**
 * Fixed-window rate limiting, stored in PostgreSQL so every serverless instance shares the
 * same counters (an in-memory counter would reset on each cold start and differ per instance).
 *
 * One atomic upsert per request: it either opens a new window or adds one to the current one,
 * so two simultaneous requests can't both slip under the limit.
 */

export interface RateLimitRule {
  /** Prefix for the counter key. */
  name: string;
  /** Requests allowed per window. */
  limit: number;
  windowSeconds: number;
}

export const rateLimits = {
  /** Password guessing from one address. */
  loginByIp: { name: "login-ip", limit: 20, windowSeconds: 10 * 60 },
  /** Password guessing against one account, from anywhere. */
  loginByEmail: { name: "login-email", limit: 10, windowSeconds: 15 * 60 },
  /** Mass sign-ups (each new account gets 1,000 credits). */
  registerByIp: { name: "register-ip", limit: 5, windowSeconds: 60 * 60 },
  /** Bets and moves: about two a second, far above what the tables' animations allow. */
  playByUser: { name: "play-user", limit: 120, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets (0 when allowed). */
  retryAfterSeconds: number;
}

/** The stored key: rule name plus a hash of the id, so emails and IPs aren't kept in clear. */
export function rateLimitKey(rule: RateLimitRule, id: string): string {
  return `${rule.name}:${createHash("sha256").update(id).digest("hex")}`;
}

/** Seconds left in a window that opened at `windowStart`, rounded up, never negative. */
export function secondsUntilReset(rule: RateLimitRule, windowStart: Date, now: Date): number {
  const resetAt = windowStart.getTime() + rule.windowSeconds * 1000;
  return Math.max(0, Math.ceil((resetAt - now.getTime()) / 1000));
}

/** "in 40 seconds", "in 1 minute", "in 12 minutes". */
export function describeWait(seconds: number): string {
  if (seconds < 60) {
    const whole = Math.max(seconds, 1);
    return `in ${whole} second${whole === 1 ? "" : "s"}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/**
 * Counts one request against `rule` for `id`. Fails open: if the database can't be reached the
 * request is allowed (and logged), because the action itself will then fail on its own anyway.
 */
export async function consumeRateLimit(
  db: PrismaClient,
  rule: RateLimitRule,
  id: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const key = rateLimitKey(rule, id);
  const cutoff = new Date(now.getTime() - rule.windowSeconds * 1000);
  try {
    const [row] = await db.$queryRaw<{ count: number; windowStart: Date }[]>`
      INSERT INTO "RateLimit" ("key", "windowStart", "count")
      VALUES (${key}, ${now}::timestamp(3), 1)
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."windowStart" <= ${cutoff}::timestamp(3)
                       THEN 1 ELSE "RateLimit"."count" + 1 END,
        "windowStart" = CASE WHEN "RateLimit"."windowStart" <= ${cutoff}::timestamp(3)
                             THEN ${now}::timestamp(3) ELSE "RateLimit"."windowStart" END
      RETURNING "count", "windowStart"`;

    // Now and then, clear counters whose windows ended long ago.
    if (Math.random() < 0.01) {
      await db.rateLimit.deleteMany({
        where: { windowStart: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
      });
    }

    if (!row || row.count <= rule.limit) return { allowed: true, retryAfterSeconds: 0 };
    return { allowed: false, retryAfterSeconds: secondsUntilReset(rule, row.windowStart, now) };
  } catch (error) {
    console.error(`Rate limit check failed (${rule.name})`, error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/**
 * Shared guard for every bet and move. Returns an error message for the player when they are
 * over the limit, or null to go ahead.
 */
export async function checkPlayRate(db: PrismaClient, userId: string): Promise<string | null> {
  const { allowed, retryAfterSeconds } = await consumeRateLimit(db, rateLimits.playByUser, userId);
  return allowed
    ? null
    : `That's faster than the table can keep up with. Try again ${describeWait(retryAfterSeconds)}.`;
}
