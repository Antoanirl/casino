import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { consumeRateLimit } from "@/server/rate-limit";

// Real PostgreSQL. DELETES ALL ROWS: point DATABASE_URL_TEST at a throwaway database.
const url = process.env.DATABASE_URL_TEST;

describe.skipIf(!url)("rate limiting (database)", () => {
  const db = new PrismaClient({ datasourceUrl: url });
  const rule = { name: "test", limit: 3, windowSeconds: 60 };
  const at = (seconds: number) => new Date(Date.UTC(2026, 0, 1, 10, 0, seconds));

  beforeEach(async () => {
    await db.rateLimit.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("allows up to the limit in a window, then refuses until it resets", async () => {
    const results = [];
    for (const s of [0, 10, 20, 30]) results.push(await consumeRateLimit(db, rule, "a", at(s)));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[3]!.retryAfterSeconds).toBe(30);

    // A new window opens once the old one has passed.
    expect(await consumeRateLimit(db, rule, "a", at(61))).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });

  it("keeps separate counters per id and per rule", async () => {
    for (let i = 0; i < 3; i++) await consumeRateLimit(db, rule, "a", at(i));
    expect((await consumeRateLimit(db, rule, "a", at(5))).allowed).toBe(false);
    expect((await consumeRateLimit(db, rule, "b", at(5))).allowed).toBe(true);
    expect((await consumeRateLimit(db, { ...rule, name: "other" }, "a", at(5))).allowed).toBe(true);
  });

  it("counts simultaneous requests exactly once each", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => consumeRateLimit(db, rule, "burst", at(0))),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(3);
    const row = await db.rateLimit.findFirstOrThrow();
    expect(row.count).toBe(10);
  });
});
