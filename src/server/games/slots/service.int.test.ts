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

  it("lists a player's recent spins on one game, newest first", async () => {
    const userId = await createPlayer();
    await spin(userId, NOTHING);
    await spin(userId, SEVENS);
    const recent = await recentSlotSpins(db, userId, "classic");
    expect(recent.map((s) => s.stops)).toEqual([SEVENS, NOTHING]);
  });
});
