import "server-only";
import { Prisma, type BlackjackRound, type PrismaClient } from "@prisma/client";
import { createShoe, type Card } from "@/server/games/blackjack/cards";
import {
  RULES,
  additionalStake,
  applyAction,
  startRound,
  toPublicView,
  totalPayout,
  totalStake,
  type Action,
  type PublicRound,
  type RoundState,
} from "@/server/games/blackjack/engine";
import { applyLedgerEntry } from "@/server/ledger";
import { shuffle } from "@/server/rng";

/**
 * Blackjack rounds: the engine's rules + the database + the ledger.
 *
 * Every operation runs in one transaction that starts by locking the player's wallet row
 * (SELECT ... FOR UPDATE). Two requests from the same player therefore never interleave:
 * the second waits, then sees the first one's result. Inside that lock:
 * - stakes are debited through the ledger BEFORE cards are drawn,
 * - the payout is credited in the same transaction that settles the round,
 * - every move names the round version it was made from, so a repeated click is rejected.
 */

export const GAME = "blackjack";

export interface BlackjackView extends PublicRound {
  roundId: string;
  version: number;
}

export interface BlackjackResult {
  round: BlackjackView;
  /** The player's wallet balance after this operation, in minor units. */
  balance: number;
}

export class RoundInProgressError extends Error {
  constructor(readonly round: BlackjackView) {
    super("Finish the round in progress before dealing a new one");
    this.name = "RoundInProgressError";
  }
}

export class RoundNotFoundError extends Error {
  constructor() {
    super("That round doesn't exist");
    this.name = "RoundNotFoundError";
  }
}

/** The move was made from an older view of the round (a double click or a second tab). */
export class StaleRoundError extends Error {
  constructor(readonly round: BlackjackView) {
    super("This round has already moved on");
    this.name = "StaleRoundError";
  }
}

export interface BlackjackOptions {
  /** Replaces the secure shuffle. Tests use it to deal rigged shoes; production never sets it. */
  shuffleShoe?: (shoe: Card[]) => Card[];
}

type Tx = Prisma.TransactionClient;

function readState(round: BlackjackRound): RoundState {
  return round.state as unknown as RoundState;
}

function toView(round: BlackjackRound): BlackjackView {
  return { ...toPublicView(readState(round)), roundId: round.id, version: round.version };
}

/** Serialises all blackjack work for one player. Must be the first statement in the transaction. */
async function lockWallet(tx: Tx, userId: string): Promise<number> {
  const rows = await tx.$queryRaw<{ balance: number }[]>`
    SELECT "balance" FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
  const row = rows[0];
  if (!row) throw new Error(`No wallet for user ${userId}`);
  return row.balance;
}

async function currentBalance(tx: Tx, userId: string): Promise<number> {
  const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
  return wallet.balance;
}

/** Credits the round's winnings (if any) and marks it settled. */
async function settleRound(tx: Tx, round: BlackjackRound, state: RoundState) {
  const payout = totalPayout(state);
  const stake = totalStake(state);
  if (payout > 0) {
    await applyLedgerEntry(tx, {
      userId: round.userId,
      type: payout === stake ? "REFUND" : "PAYOUT",
      amount: payout,
      idempotencyKey: `${GAME}:${round.id}:payout`,
      game: GAME,
      reference: round.id,
    });
  }
  return { status: "SETTLED" as const, totalPayout: payout, settledAt: new Date() };
}

const transactionOptions = { maxWait: 10_000, timeout: 15_000 };

/** The player's unfinished round, if there is one. */
export async function getActiveRound(
  db: PrismaClient,
  userId: string,
): Promise<BlackjackView | null> {
  const round = await db.blackjackRound.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  return round ? toView(round) : null;
}

/**
 * Takes the bet and deals. Repeating the same `dealKey` returns the round it created
 * (and charges nothing). Throws RoundInProgressError if another round is unfinished,
 * InsufficientFundsError if the balance can't cover the bet, InvalidBetError for bad amounts.
 */
export async function startBlackjackRound(
  db: PrismaClient,
  userId: string,
  input: { bet: number; dealKey: string },
  options: BlackjackOptions = {},
): Promise<BlackjackResult> {
  return db.$transaction(async (tx) => {
    await lockWallet(tx, userId);

    const repeated = await tx.blackjackRound.findUnique({
      where: { userId_dealKey: { userId, dealKey: input.dealKey } },
    });
    if (repeated) return { round: toView(repeated), balance: await currentBalance(tx, userId) };

    const active = await tx.blackjackRound.findFirst({ where: { userId, status: "ACTIVE" } });
    if (active) throw new RoundInProgressError(toView(active));

    // Validates the bet (throws InvalidBetError) before anything is written.
    const shoe = (options.shuffleShoe ?? shuffle)(createShoe(RULES.decks));
    const state = startRound(shoe, input.bet);

    const created = await tx.blackjackRound.create({
      data: {
        userId,
        dealKey: input.dealKey,
        state: state as unknown as Prisma.InputJsonValue,
        totalStake: input.bet,
      },
    });

    // Throws InsufficientFundsError and rolls the whole round back if the bet isn't covered.
    await applyLedgerEntry(tx, {
      userId,
      type: "BET",
      amount: -input.bet,
      idempotencyKey: `${GAME}:${created.id}:deal`,
      game: GAME,
      reference: created.id,
    });

    // A blackjack on either side settles the round at the deal.
    const round =
      state.phase === "settled"
        ? await tx.blackjackRound.update({
            where: { id: created.id },
            data: await settleRound(tx, created, state),
          })
        : created;

    return { round: toView(round), balance: await currentBalance(tx, userId) };
  }, transactionOptions);
}

/**
 * Applies one move. `version` must equal the round's current version, otherwise
 * StaleRoundError is thrown with the up-to-date round so the table can catch up.
 */
export async function playBlackjackAction(
  db: PrismaClient,
  userId: string,
  input: { roundId: string; action: Action; version: number },
): Promise<BlackjackResult> {
  return db.$transaction(async (tx) => {
    await lockWallet(tx, userId);

    const round = await tx.blackjackRound.findFirst({ where: { id: input.roundId, userId } });
    if (!round) throw new RoundNotFoundError();
    if (round.status !== "ACTIVE" || round.version !== input.version) {
      throw new StaleRoundError(toView(round));
    }

    const before = readState(round);
    // Throws IllegalActionError before any money moves if the move isn't allowed.
    const after = applyAction(before, input.action);

    const extra = additionalStake(before, input.action);
    if (extra > 0) {
      await applyLedgerEntry(tx, {
        userId,
        type: "BET",
        amount: -extra,
        idempotencyKey: `${GAME}:${round.id}:v${round.version}:${input.action}`,
        game: GAME,
        reference: round.id,
      });
    }

    const settled = after.phase === "settled" ? await settleRound(tx, round, after) : {};
    const updated = await tx.blackjackRound.update({
      where: { id: round.id },
      data: {
        state: after as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
        totalStake: totalStake(after),
        ...settled,
      },
    });

    return { round: toView(updated), balance: await currentBalance(tx, userId) };
  }, transactionOptions);
}
