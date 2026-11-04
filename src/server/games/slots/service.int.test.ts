import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { STARTING_BALANCE } from "@/lib/money";
import { InvalidSlotBetError } from "@/server/games/slots/engine";
import { UnknownSlotGameError, recentSlotSpins, spinSlot } from "@/server/games/slots/service";
import { InsufficientFundsError, createWallet, getBalance, verifyWallet } from "@/server/ledger";

// Real PostgreSQL. DELETES ALL ROWS: point DATABASE_URL_TEST at a throwaway database.
const url = process.env.DATABASE_URL_TEST;

// Classic Slots stops: sevens across the middle line, and a spin with no win at all.
const SEVENS = [2, 5, 10];
const NOTHING = [0, 0, 2];
// Adventure Slots stops with a map on the top row of reels 1-3 (8 free spins), then the free spins.
const THREE_MAPS = [23, 11, 28, 2, 0];
const FREE_SPINS = Array.from({ length: 8 }, (_, i) => [i, i, i, i, i]);

describe.skipIf(!url)("slot spins (database)", () => {
  const db = new PrismaClient({
    datasourceUrl: url,
    transactionOptions: { maxWait: 15_000, timeout: 15_000 },
  });

  async function createPlayer() {
    const user = await db.user.create({
      data: {
        email: `sl-${crypto.randomUUID()}@test.local`,
        username: `sl-${crypto.randomUUID()}`,
        passwordHash: "not-a-real-hash",
      },
    });
    await db.$transaction((tx) => createWallet(tx, user.id));
    return user.id;
  }

  const spin = (userId: string, stops: number[], bet = 500, spinKey = crypto.randomUUID()) =>
    spinSlot(db, userId, { game: "classic", bet, spinKey }, { chooseStops: () => stops });

  beforeEach(async () => {
    await db.slotSpin.deleteMany();
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

  it("takes the bet and pays a win through the ledger", async () => {
    const userId = await createPlayer();
    const result = await spin(userId, SEVENS);
    expect(result.spin.lineWins.some((w) => w.symbol === "seven")).toBe(true);
    expect(result.balance).toBe(STARTING_BALANCE - 500 + result.spin.payout);

    const entries = await db.ledgerEntry.findMany({
      where: { userId, reference: result.spin.spinId },
      orderBy: { createdAt: "asc" },
    });
    expect(entries.map((e) => [e.type, e.amount, e.game])).toEqual([
      ["BET", -500, "slots:classic"],
      ["PAYOUT", result.spin.payout, "slots:classic"],
    ]);
    expect((await verifyWallet(db, userId)).consistent).toBe(true);
  });

  it("writes only the bet on a losing spin", async () => {
    const userId = await createPlayer();
    const result = await spin(userId, NOTHING);
    expect(result.spin.payout).toBe(0);
    expect(result.balance).toBe(STARTING_BALANCE - 500);
    expect(await db.ledgerEntry.count({ where: { userId, type: "PAYOUT" } })).toBe(0);
  });

  it("returns the same spin for a repeated request, even with different stops", async () => {
    const userId = await createPlayer();
    const key = crypto.randomUUID();
    const first = await spin(userId, NOTHING, 500, key);
    const again = await spin(userId, SEVENS, 500, key);
    expect(again.replayed).toBe(true);
    expect(again.spin.spinId).toBe(first.spin.spinId);
    expect(again.spin.stops).toEqual(NOTHING);
    expect(await getBalance(db, userId)).toBe(STARTING_BALANCE - 500);
  });

  it("charges simultaneous duplicate spins only once", async () => {
    const userId = await createPlayer();
    const key = crypto.randomUUID();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => spin(userId, NOTHING, 500, key)),
    );
    expect(new Set(results.map((r) => r.spin.spinId)).size).toBe(1);
    expect(await db.slotSpin.count()).toBe(1);
    expect(await getBalance(db, userId)).toBe(STARTING_BALANCE - 500);
  });

  it("rejects unknown games, bets off the list and unaffordable bets without saving", async () => {
    const userId = await createPlayer();
    await expect(
      spinSlot(db, userId, { game: "poker", bet: 500, spinKey: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(UnknownSlotGameError);
    await expect(spin(userId, NOTHING, 300)).rejects.toBeInstanceOf(InvalidSlotBetError);

    await db.wallet.update({ where: { userId }, data: { balance: 100 } });
    await expect(spin(userId, NOTHING, 500)).rejects.toBeInstanceOf(InsufficientFundsError);
    expect(await db.slotSpin.count()).toBe(0);
  });

  it("settles a paid spin and its free spins as one round with one payout", async () => {
    const userId = await createPlayer();
    const queue = [THREE_MAPS, ...FREE_SPINS];
    const result = await spinSlot(
      db,
      userId,
      { game: "adventure", bet: 500, spinKey: crypto.randomUUID() },
      { chooseStops: () => queue.shift()! },
    );
    expect(queue).toEqual([]);
    expect(result.spin.freeSpinsAwarded).toBe(8);
    expect(result.spin.freeSpins.map((s) => s.stops)).toEqual(FREE_SPINS);
    expect(result.spin.scatterWin).toMatchObject({ symbol: "map", count: 3 });
    expect(result.spin.payout).toBe(
      result.spin.basePayout + result.spin.freeSpins.reduce((sum, s) => sum + s.payout, 0),
    );
    expect(result.spin.payout).toBeGreaterThan(result.spin.basePayout);
    expect(result.balance).toBe(STARTING_BALANCE - 500 + result.spin.payout);

    const entries = await db.ledgerEntry.findMany({
      where: { userId, reference: result.spin.spinId },
      orderBy: { createdAt: "asc" },
    });
    expect(entries.map((e) => [e.type, e.amount, e.game])).toEqual([
      ["BET", -500, "slots:adventure"],
      ["PAYOUT", result.spin.payout, "slots:adventure"],
    ]);

    // Reading it back replays the same round from the stored stops.
    const [saved] = await recentSlotSpins(db, userId, "adventure");
    expect(saved).toEqual(result.spin);
    expect((await verifyWallet(db, userId)).consistent).toBe(true);
  });

  it("still reads spins saved before free spins existed", async () => {
    const userId = await createPlayer();
    await db.slotSpin.create({
      data: {
        userId,
        game: "classic",
        spinKey: "old",
        bet: 500,
        stops: SEVENS,
        totalPayout: 50_000,
      },
    });
    const [old] = await recentSlotSpins(db, userId, "classic");
    expect(old?.stops).toEqual(SEVENS);
    expect(old?.freeSpins).toEqual([]);
    expect(old?.payout).toBe(old?.basePayout);
  });

  it("lists a player's recent spins on one game, newest first", async () => {
    const userId = await createPlayer();
    await spin(userId, NOTHING);
    await spin(userId, SEVENS);
    const recent = await recentSlotSpins(db, userId, "classic");
    expect(recent.map((s) => s.stops)).toEqual([SEVENS, NOTHING]);
  });
});
