import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { STARTING_BALANCE } from "@/lib/money";
import { defaultFilters } from "@/lib/ledger-filters";
import { createWallet, postLedgerEntry } from "@/server/ledger";
import { balanceHistory, getPlayerStats, ledgerHistory } from "@/server/stats";

// Real PostgreSQL. DELETES ALL ROWS: point DATABASE_URL_TEST at a throwaway database.
const url = process.env.DATABASE_URL_TEST;

describe.skipIf(!url)("dashboard statistics (database)", () => {
  const db = new PrismaClient({
    datasourceUrl: url,
    transactionOptions: { maxWait: 15_000, timeout: 15_000 },
  });

  async function createPlayer() {
    const user = await db.user.create({
      data: {
        email: `st-${crypto.randomUUID()}@test.local`,
        username: `st-${crypto.randomUUID()}`,
        passwordHash: "not-a-real-hash",
      },
    });
    await db.$transaction((tx) => createWallet(tx, user.id));
    return user.id;
  }

  /** A bet and (if anything came back) its payout, as the games write them. */
  async function play(userId: string, game: string, stake: number, payout: number) {
    const ref = crypto.randomUUID();
    await postLedgerEntry(db, {
      userId,
      type: "BET",
      amount: -stake,
      idempotencyKey: `${ref}:bet`,
      game,
      reference: ref,
    });
    if (payout > 0) {
      await postLedgerEntry(db, {
        userId,
        type: payout === stake ? "REFUND" : "PAYOUT",
        amount: payout,
        idempotencyKey: `${ref}:payout`,
        game,
        reference: ref,
      });
    }
  }

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

  it("totals rounds per game from the round tables", async () => {
    const userId = await createPlayer();
    const other = await createPlayer();
    const round = (stake: number, payout: number | null, status: "ACTIVE" | "SETTLED") => ({
      userId,
      status,
      state: {},
      dealKey: crypto.randomUUID(),
      totalStake: stake,
      totalPayout: payout,
    });
    await db.blackjackRound.createMany({
      data: [
        round(1_000, 2_500, "SETTLED"), // blackjack: +1,500
        round(2_000, 0, "SETTLED"), // doubled and lost
        round(500, 500, "SETTLED"), // push
        round(700, null, "ACTIVE"), // still being played: not counted yet
      ],
    });
    const spin = (u: string, stake: number, payout: number) => ({
      userId: u,
      spinKey: crypto.randomUUID(),
      bets: [],
      pocket: 0,
      totalStake: stake,
      totalPayout: payout,
    });
    await db.rouletteSpin.createMany({ data: [spin(userId, 1_000, 3_600), spin(other, 1_000, 0)] });
    await db.slotSpin.createMany({
      data: [
        { userId, game: "gems", spinKey: "a", bet: 100, stops: [], totalPayout: 0 },
        { userId, game: "gems", spinKey: "b", bet: 100, stops: [], totalPayout: 250 },
        { userId, game: "adventure", spinKey: "c", bet: 500, stops: [], totalPayout: 100 },
      ],
    });

    const stats = await getPlayerStats(db, userId);
    expect(stats.balance).toBe(STARTING_BALANCE);
    expect(stats.inPlay).toBe(700);

    const byGame = Object.fromEntries(stats.games.map((g) => [g.game, g]));
    expect(byGame.blackjack).toMatchObject({
      rounds: 3,
      staked: 3_500,
      returned: 3_000,
      net: -500,
      roundsWon: 1,
      biggestWin: 1_500,
    });
    expect(byGame.roulette).toMatchObject({
      rounds: 1,
      net: 2_600,
      roundsWon: 1,
      biggestWin: 2_600,
    });
    expect(byGame["slots:gems"]).toMatchObject({
      rounds: 2,
      staked: 200,
      returned: 250,
      roundsWon: 1,
      biggestWin: 150,
    });
    expect(byGame["slots:adventure"]).toMatchObject({
      rounds: 1,
      net: -400,
      roundsWon: 0,
      biggestWin: 0,
    });
    expect(byGame["slots:classic"]).toMatchObject({ rounds: 0, returnRate: null });
    expect(stats.total).toMatchObject({
      rounds: 7,
      staked: 5_200,
      returned: 6_950,
      biggestWin: 2_600,
    });
  });

  it("returns the balance after each entry, oldest first, and says when it was cut short", async () => {
    const userId = await createPlayer();
    await play(userId, "roulette", 1_000, 0);
    await play(userId, "slots:gems", 500, 1_200);

    const full = await balanceHistory(db, userId);
    expect(full.complete).toBe(true);
    expect(full.points.map((p) => p.balance)).toEqual([
      STARTING_BALANCE,
      STARTING_BALANCE - 1_000,
      STARTING_BALANCE - 1_500,
      STARTING_BALANCE - 300,
    ]);

    const recent = await balanceHistory(db, userId, 2);
    expect(recent.complete).toBe(false);
    expect(recent.points.map((p) => p.balance)).toEqual([
      STARTING_BALANCE - 1_500,
      STARTING_BALANCE - 300,
    ]);
  });

  it("pages and filters the ledger history", async () => {
    const userId = await createPlayer();
    for (let i = 0; i < 6; i++) await play(userId, "slots:gems", 100, i % 2 ? 300 : 0); // 6 bets, 3 wins
    await play(userId, "blackjack", 1_000, 1_000); // bet + refund (push)
    await play(userId, "slots:classic", 200, 0);

    const all = await ledgerHistory(db, userId, defaultFilters, 5);
    expect(all.total).toBe(1 + 9 + 2 + 1); // signup bonus, gems, blackjack, classic
    expect(all.pageCount).toBe(3);
    expect(all.rows).toHaveLength(5);
    expect(all.rows[0]).toMatchObject({ game: "slots:classic", type: "BET" }); // newest first

    const last = await ledgerHistory(db, userId, { ...defaultFilters, page: 3 }, 5);
    expect(last.rows.map((r) => r.type)).toEqual(["BET", "BET", "SIGNUP_BONUS"]);
    // A page past the end returns the last page.
    expect((await ledgerHistory(db, userId, { ...defaultFilters, page: 99 }, 5)).page).toBe(3);

    const gems = await ledgerHistory(db, userId, { ...defaultFilters, game: "gems" }, 50);
    expect(gems.total).toBe(9);
    const slots = await ledgerHistory(db, userId, { ...defaultFilters, game: "slots" }, 50);
    expect(slots.total).toBe(10);
    const wins = await ledgerHistory(db, userId, { ...defaultFilters, kind: "wins" }, 50);
    expect(wins.rows.map((r) => r.type).sort()).toEqual(["PAYOUT", "PAYOUT", "PAYOUT", "REFUND"]);
    const bonuses = await ledgerHistory(db, userId, { ...defaultFilters, kind: "bonuses" }, 50);
    expect(bonuses.rows.map((r) => r.type)).toEqual(["SIGNUP_BONUS"]);
    const none = await ledgerHistory(db, userId, { game: "roulette", kind: "wins", page: 1 }, 50);
    expect(none).toMatchObject({ total: 0, page: 1, pageCount: 1, rows: [] });
  });
});
