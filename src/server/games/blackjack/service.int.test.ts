import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { STARTING_BALANCE } from "@/lib/money";
import type { Card, Rank } from "@/server/games/blackjack/cards";
import { IllegalActionError, InvalidBetError } from "@/server/games/blackjack/engine";
import {
  RoundInProgressError,
  StaleRoundError,
  getActiveRound,
  playBlackjackAction,
  startBlackjackRound,
  type BlackjackOptions,
} from "@/server/games/blackjack/service";
import { InsufficientFundsError, createWallet, getBalance, verifyWallet } from "@/server/ledger";

// Real PostgreSQL. DELETES ALL ROWS: point DATABASE_URL_TEST at a throwaway database.
const url = process.env.DATABASE_URL_TEST;

const BET = 1_000; // 10 credits

/** Deal order: player, dealer, player, dealer, then the rest in order (padded with 2s). */
function rigged(player: [Rank, Rank], dealer: [Rank, Rank], ...rest: Rank[]): BlackjackOptions {
  const suits = ["S", "H", "D", "C"] as const;
  const ranks = [player[0], dealer[0], player[1], dealer[1], ...rest, ...Array<Rank>(30).fill("2")];
  const shoe: Card[] = ranks.map((rank, i) => ({ rank, suit: suits[i % 4]! }));
  return { shuffleShoe: () => shoe };
}

describe.skipIf(!url)("blackjack rounds (database)", () => {
  const db = new PrismaClient({
    datasourceUrl: url,
    transactionOptions: { maxWait: 15_000, timeout: 15_000 },
  });

  async function createPlayer() {
    const user = await db.user.create({
      data: {
        email: `bj-${crypto.randomUUID()}@test.local`,
        username: `bj-${crypto.randomUUID()}`,
        passwordHash: "not-a-real-hash",
      },
    });
    await db.$transaction((tx) => createWallet(tx, user.id));
    return user.id;
  }

  const deal = (
    userId: string,
    options: BlackjackOptions,
    bet = BET,
    dealKey = crypto.randomUUID(),
  ) => startBlackjackRound(db, userId, { bet, dealKey }, options);

  beforeEach(async () => {
    await db.blackjackRound.deleteMany();
    await db.ledgerEntry.deleteMany();
    await db.wallet.deleteMany();
    await db.session.deleteMany();
    await db.user.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("takes the bet and deals, hiding the hole card and the shoe", async () => {
    const userId = await createPlayer();
    const { round, balance } = await deal(userId, rigged(["10", "7"], ["9", "8"]));

    expect(balance).toBe(STARTING_BALANCE - BET);
    expect(round.phase).toBe("player");
    expect(round.version).toBe(0);
    expect(round.dealer[1]).toBeNull();
    expect(round).not.toHaveProperty("shoe");

    const entries = await db.ledgerEntry.findMany({ where: { userId, type: "BET" } });
    expect(entries).toMatchObject([{ amount: -BET, game: "blackjack", reference: round.roundId }]);
  });

  it("pays a win when the round ends and keeps the wallet consistent", async () => {
    const userId = await createPlayer();
    const { round } = await deal(userId, rigged(["10", "9"], ["10", "7"]));
    const result = await playBlackjackAction(db, userId, {
      roundId: round.roundId,
      action: "stand",
      version: round.version,
    });

    expect(result.round.phase).toBe("settled");
    expect(result.round.dealer).toHaveLength(2);
    expect(result.balance).toBe(STARTING_BALANCE + BET);
    expect((await verifyWallet(db, userId)).consistent).toBe(true);
    expect(await getActiveRound(db, userId)).toBeNull();
  });

  it("settles a blackjack at the deal and pays 3 to 2", async () => {
    const userId = await createPlayer();
    const { round, balance } = await deal(userId, rigged(["A", "K"], ["9", "8"]));
    expect(round.phase).toBe("settled");
    expect(balance).toBe(STARTING_BALANCE + 1.5 * BET);
  });

  it("records a push as a refund of the stake", async () => {
    const userId = await createPlayer();
    const { round } = await deal(userId, rigged(["10", "8"], ["9", "9"]));
    const result = await playBlackjackAction(db, userId, {
      roundId: round.roundId,
      action: "stand",
      version: 0,
    });
    expect(result.balance).toBe(STARTING_BALANCE);
    const refund = await db.ledgerEntry.findFirstOrThrow({ where: { userId, type: "REFUND" } });
    expect(refund.amount).toBe(BET);
  });

  it("takes a second stake for a double and pays on the doubled bet", async () => {
    const userId = await createPlayer();
    const { round } = await deal(userId, rigged(["6", "5"], ["10", "7"], "10"));
    const result = await playBlackjackAction(db, userId, {
      roundId: round.roundId,
      action: "double",
      version: 0,
    });

    expect(result.round.totalStake).toBe(2 * BET);
    expect(result.balance).toBe(STARTING_BALANCE + 2 * BET); // staked 2 bets, got 4 back
    expect(await db.ledgerEntry.count({ where: { userId, type: "BET" } })).toBe(2);
    expect((await verifyWallet(db, userId)).consistent).toBe(true);
  });

  it("returns the same round when a deal request is repeated", async () => {
    const userId = await createPlayer();
    const key = crypto.randomUUID();
    const first = await deal(userId, rigged(["10", "7"], ["9", "8"]), BET, key);
    const again = await deal(userId, rigged(["10", "7"], ["9", "8"]), BET, key);

    expect(again.round.roundId).toBe(first.round.roundId);
    expect(again.balance).toBe(STARTING_BALANCE - BET); // charged once
    expect(await db.blackjackRound.count()).toBe(1);
  });

  it("charges simultaneous duplicate deals only once", async () => {
    const userId = await createPlayer();
    const key = crypto.randomUUID();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => deal(userId, rigged(["10", "7"], ["9", "8"]), BET, key)),
    );
    expect(new Set(results.map((r) => r.round.roundId)).size).toBe(1);
    expect(await getBalance(db, userId)).toBe(STARTING_BALANCE - BET);
  });

  it("refuses a new deal while a round is unfinished", async () => {
    const userId = await createPlayer();
    const { round } = await deal(userId, rigged(["10", "7"], ["9", "8"]));
    const attempt = deal(userId, rigged(["10", "7"], ["9", "8"]));
    await expect(attempt).rejects.toBeInstanceOf(RoundInProgressError);
    await expect(attempt).rejects.toMatchObject({ round: { roundId: round.roundId } });
    expect(await getBalance(db, userId)).toBe(STARTING_BALANCE - BET);
  });

  it("acts once when the same move arrives twice (double click)", async () => {
    const userId = await createPlayer();
    const { round } = await deal(userId, rigged(["2", "3"], ["10", "7"], "4", "5", "6"));
    const move = { roundId: round.roundId, action: "hit" as const, version: 0 };

    const results = await Promise.allSettled([
      playBlackjackAction(db, userId, move),
      playBlackjackAction(db, userId, move),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const stale = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(stale).toHaveLength(1);
    expect((stale[0] as PromiseRejectedResult).reason).toBeInstanceOf(StaleRoundError);

    const view = (await getActiveRound(db, userId))!;
    expect(view.hands[0]!.cards).toHaveLength(3); // one hit, not two
    expect(view.version).toBe(1);
  });

  it("rejects bad bets, illegal moves and unaffordable bets without charging", async () => {
    const userId = await createPlayer();
    await expect(deal(userId, rigged(["10", "7"], ["9", "8"]), 150)).rejects.toBeInstanceOf(
      InvalidBetError,
    );

    const { round } = await deal(userId, rigged(["10", "7"], ["9", "8"]));
    await expect(
      playBlackjackAction(db, userId, { roundId: round.roundId, action: "split", version: 0 }),
    ).rejects.toBeInstanceOf(IllegalActionError);

    // Spend almost everything, then try to double.
    await db.wallet.update({ where: { userId }, data: { balance: 500 } });
    await expect(
      playBlackjackAction(db, userId, { roundId: round.roundId, action: "double", version: 0 }),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
    expect((await getActiveRound(db, userId))!.version).toBe(0); // nothing changed
  });

  it("never lets one player act on another player's round", async () => {
    const alice = await createPlayer();
    const bob = await createPlayer();
    const { round } = await deal(alice, rigged(["10", "7"], ["9", "8"]));
    await expect(
      playBlackjackAction(db, bob, { roundId: round.roundId, action: "stand", version: 0 }),
    ).rejects.toThrow("That round doesn't exist");
  });
});
