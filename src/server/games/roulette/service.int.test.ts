import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { STARTING_BALANCE } from "@/lib/money";
import { InvalidBetsError, type Bet } from "@/server/games/roulette/engine";
import { recentSpins, spinRoulette } from "@/server/games/roulette/service";
import { InsufficientFundsError, createWallet, getBalance, verifyWallet } from "@/server/ledger";

// Real PostgreSQL. DELETES ALL ROWS: point DATABASE_URL_TEST at a throwaway database.
const url = process.env.DATABASE_URL_TEST;

const ONE = 100;
const landOn = (pocket: number) => ({ drawPocket: () => pocket });

describe.skipIf(!url)("roulette spins (database)", () => {
  const db = new PrismaClient({
    datasourceUrl: url,
    transactionOptions: { maxWait: 15_000, timeout: 15_000 },
  });

  async function createPlayer() {
    const user = await db.user.create({
      data: {
        email: `rl-${crypto.randomUUID()}@test.local`,
        username: `rl-${crypto.randomUUID()}`,
        passwordHash: "not-a-real-hash",
      },
    });
    await db.$transaction((tx) => createWallet(tx, user.id));
    return user.id;
  }

  const spin = (userId: string, bets: Bet[], pocket: number, spinKey = crypto.randomUUID()) =>
    spinRoulette(db, userId, { bets, spinKey }, landOn(pocket));

  beforeEach(async () => {
    await db.rouletteSpin.deleteMany();
    await db.blackjackRound.deleteMany();
    await db.ledgerEntry.deleteMany();
    await db.wallet.deleteMany();
    await db.session.deleteMany();
    await db.user.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("takes the stake and pays a straight-up win at 35 to 1", async () => {
    const userId = await createPlayer();
    const { spin: result, balance } = await spin(
      userId,
      [{ spot: { kind: "straight", number: 17 }, amount: 10 * ONE }],
      17,
    );
    expect(result).toMatchObject({
      pocket: 17,
      color: "black",
      totalStake: 1_000,
      totalPayout: 36_000,
    });
    expect(balance).toBe(STARTING_BALANCE + 35_000);

    const entries = await db.ledgerEntry.findMany({
      where: { userId, reference: result.spinId },
      orderBy: { createdAt: "asc" },
    });
    expect(entries.map((e) => [e.type, e.amount])).toEqual([
      ["BET", -1_000],
      ["PAYOUT", 36_000],
    ]);
    expect((await verifyWallet(db, userId)).consistent).toBe(true);
  });

  it("writes only the bet when everything loses", async () => {
    const userId = await createPlayer();
    const { balance } = await spin(userId, [{ spot: { kind: "red" }, amount: 5 * ONE }], 0);
    expect(balance).toBe(STARTING_BALANCE - 500);
    expect(await db.ledgerEntry.count({ where: { userId, type: "PAYOUT" } })).toBe(0);
  });

  it("returns the same spin when the request is repeated", async () => {
    const userId = await createPlayer();
    const key = crypto.randomUUID();
    const bets: Bet[] = [{ spot: { kind: "black" }, amount: 10 * ONE }];
    const first = await spin(userId, bets, 2, key);
    const again = await spin(userId, bets, 7, key); // a repeat can't re-roll the pocket

    expect(again.replayed).toBe(true);
    expect(again.spin.spinId).toBe(first.spin.spinId);
    expect(again.spin.pocket).toBe(2);
    expect(await getBalance(db, userId)).toBe(STARTING_BALANCE + 1_000);
  });

  it("charges simultaneous duplicate spins only once", async () => {
    const userId = await createPlayer();
    const key = crypto.randomUUID();
    const bets: Bet[] = [{ spot: { kind: "even" }, amount: 10 * ONE }];
    const results = await Promise.all(Array.from({ length: 5 }, () => spin(userId, bets, 3, key)));

    expect(new Set(results.map((r) => r.spin.spinId)).size).toBe(1);
    expect(await db.rouletteSpin.count()).toBe(1);
    expect(await getBalance(db, userId)).toBe(STARTING_BALANCE - 1_000);
    expect((await verifyWallet(db, userId)).consistent).toBe(true);
  });

  it("saves nothing when the stake can't be covered", async () => {
    const userId = await createPlayer();
    await db.wallet.update({ where: { userId }, data: { balance: 500 } });
    await expect(
      spin(userId, [{ spot: { kind: "red" }, amount: 10 * ONE }], 1),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
    expect(await db.rouletteSpin.count()).toBe(0);
  });

  it("rejects bets outside the table limits before touching the database", async () => {
    const userId = await createPlayer();
    await expect(
      spin(userId, [{ spot: { kind: "red" }, amount: 600 * ONE }], 1),
    ).rejects.toBeInstanceOf(InvalidBetsError);
    expect(await db.rouletteSpin.count()).toBe(0);
  });

  it("lists recent spins newest first", async () => {
    const userId = await createPlayer();
    for (const pocket of [5, 0, 32]) {
      await spin(userId, [{ spot: { kind: "odd" }, amount: ONE }], pocket);
    }
    const recent = await recentSpins(db, userId);
    expect(recent.map((s) => s.pocket)).toEqual([32, 0, 5]);
  });
});
