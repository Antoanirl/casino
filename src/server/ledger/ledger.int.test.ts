import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { STARTING_BALANCE } from "@/lib/money";
import {
  IdempotencyConflictError,
  InsufficientFundsError,
  InvalidLedgerAmountError,
  createWallet,
  getBalance,
  postLedgerEntry,
  verifyWallet,
} from "@/server/ledger";

// These tests talk to a real PostgreSQL database and DELETE ALL ROWS in it.
// Point DATABASE_URL_TEST at a throwaway database, never at the real one.
const url = process.env.DATABASE_URL_TEST;

describe.skipIf(!url)("ledger (database)", () => {
  // Generous transaction limits: the concurrency tests queue many transactions on a small pool.
  const db = new PrismaClient({
    datasourceUrl: url,
    transactionOptions: { maxWait: 15_000, timeout: 15_000 },
  });

  async function createPlayer() {
    const user = await db.user.create({
      data: {
        email: `player-${crypto.randomUUID()}@test.local`,
        username: `p-${crypto.randomUUID()}`,
        passwordHash: "not-a-real-hash",
      },
    });
    await db.$transaction((tx) => createWallet(tx, user.id));
    return user.id;
  }

  const bet = (userId: string, amount: number, key = crypto.randomUUID()) =>
    postLedgerEntry(db, {
      userId,
      type: "BET",
      amount: -amount,
      idempotencyKey: key,
      game: "test",
    });

  beforeEach(async () => {
    await db.ledgerEntry.deleteMany();
    await db.wallet.deleteMany();
    await db.session.deleteMany();
    await db.user.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("gives a new wallet the starting balance through a ledger entry", async () => {
    const userId = await createPlayer();
    expect(await getBalance(db, userId)).toBe(STARTING_BALANCE);

    const entries = await db.ledgerEntry.findMany({ where: { userId } });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ type: "SIGNUP_BONUS", amount: STARTING_BALANCE });
  });

  it("debits and credits, recording the balance after each entry", async () => {
    const userId = await createPlayer();
    const afterBet = await bet(userId, 2_500);
    expect(afterBet.balance).toBe(STARTING_BALANCE - 2_500);
    expect(afterBet.entry.balanceAfter).toBe(STARTING_BALANCE - 2_500);

    const afterWin = await postLedgerEntry(db, {
      userId,
      type: "PAYOUT",
      amount: 5_000,
      idempotencyKey: crypto.randomUUID(),
    });
    expect(afterWin.balance).toBe(STARTING_BALANCE + 2_500);
    expect((await verifyWallet(db, userId)).consistent).toBe(true);
  });

  it("rejects a bet larger than the balance and changes nothing", async () => {
    const userId = await createPlayer();
    await expect(bet(userId, STARTING_BALANCE + 1)).rejects.toBeInstanceOf(InsufficientFundsError);
    expect(await getBalance(db, userId)).toBe(STARTING_BALANCE);
    expect(await db.ledgerEntry.count({ where: { userId } })).toBe(1);
  });

  it("rejects zero, fractional and oversized amounts", async () => {
    const userId = await createPlayer();
    for (const amount of [0, 1.5, Number.NaN, 10 ** 12]) {
      await expect(
        postLedgerEntry(db, {
          userId,
          type: "ADJUSTMENT",
          amount,
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toBeInstanceOf(InvalidLedgerAmountError);
    }
  });

  it("never lets concurrent bets spend the same credits", async () => {
    const userId = await createPlayer();
    // 20 simultaneous bets of 1/10 of the balance: exactly 10 can succeed.
    const stake = STARTING_BALANCE / 10;
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => bet(userId, stake)));

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(succeeded).toHaveLength(10);
    expect(failed).toHaveLength(10);
    for (const f of failed) expect(f.reason).toBeInstanceOf(InsufficientFundsError);

    expect(await getBalance(db, userId)).toBe(0);
    expect((await verifyWallet(db, userId)).consistent).toBe(true);
  });

  it("charges a repeated request only once (idempotency)", async () => {
    const userId = await createPlayer();
    const first = await bet(userId, 1_000, "bet-123");
    const second = await bet(userId, 1_000, "bet-123");

    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.entry.id).toBe(first.entry.id);
    expect(await getBalance(db, userId)).toBe(STARTING_BALANCE - 1_000);
  });

  it("charges simultaneous duplicate requests only once", async () => {
    const userId = await createPlayer();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => bet(userId, 1_000, "double-click")),
    );

    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect(new Set(results.map((r) => r.entry.id)).size).toBe(1);
    expect(await getBalance(db, userId)).toBe(STARTING_BALANCE - 1_000);
    expect((await verifyWallet(db, userId)).consistent).toBe(true);
  });

  it("refuses to reuse a key for a different amount", async () => {
    const userId = await createPlayer();
    await bet(userId, 1_000, "same-key");
    await expect(bet(userId, 2_000, "same-key")).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(await getBalance(db, userId)).toBe(STARTING_BALANCE - 1_000);
  });

  it("keeps idempotency keys separate per user", async () => {
    const alice = await createPlayer();
    const bob = await createPlayer();
    await bet(alice, 1_000, "shared-key");
    const bobBet = await bet(bob, 1_000, "shared-key");
    expect(bobBet.replayed).toBe(false);
    expect(await getBalance(db, bob)).toBe(STARTING_BALANCE - 1_000);
  });
});
