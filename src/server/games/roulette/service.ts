import "server-only";
import { Prisma, type PrismaClient, type RouletteSpin } from "@prisma/client";
import {
  POCKET_COUNT,
  normalizeBets,
  pocketColor,
  settleSpin,
  type Bet,
  type BetResult,
  type PocketColor,
} from "@/server/games/roulette/engine";
import { applyLedgerEntry } from "@/server/ledger";
import { randomInt } from "@/server/rng";

/**
 * Roulette spins. One spin is one transaction:
 *   validate bets -> draw the pocket -> save the spin -> debit the stake -> credit the payout.
 * If the player can't cover the stake, the whole transaction rolls back and nothing is saved.
 * The (userId, spinKey) unique key makes a repeated request return the first spin instead of
 * charging again, even when the duplicates arrive at the same moment.
 */

export const GAME = "roulette";

export interface SpinView {
  spinId: string;
  pocket: number;
  color: PocketColor;
  results: BetResult[];
  totalStake: number;
  totalPayout: number;
  createdAt: string;
}

export interface SpinOutcome {
  spin: SpinView;
  /** Wallet balance after the spin, in minor units. */
  balance: number;
  /** True when this spin key had been used before and the original spin was returned. */
  replayed: boolean;
}

export interface RouletteOptions {
  /** Replaces the secure RNG. Tests use it to land on chosen pockets; production never sets it. */
  drawPocket?: () => number;
}

function toView(spin: RouletteSpin): SpinView {
  const bets = spin.bets as unknown as Bet[];
  return {
    spinId: spin.id,
    pocket: spin.pocket,
    color: pocketColor(spin.pocket),
    results: settleSpin(bets, spin.pocket).results,
    totalStake: spin.totalStake,
    totalPayout: spin.totalPayout,
    createdAt: spin.createdAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Spins the wheel. Throws InvalidBetsError for bets outside the table limits and
 * InsufficientFundsError when the balance can't cover the total stake.
 */
export async function spinRoulette(
  db: PrismaClient,
  userId: string,
  input: { bets: Bet[]; spinKey: string },
  options: RouletteOptions = {},
): Promise<SpinOutcome> {
  const bets = normalizeBets(input.bets);

  try {
    return await db.$transaction(async (tx) => {
      const pocket = (options.drawPocket ?? (() => randomInt(0, POCKET_COUNT)))();
      const result = settleSpin(bets, pocket);

      const spin = await tx.rouletteSpin.create({
        data: {
          userId,
          spinKey: input.spinKey,
          bets: bets as unknown as Prisma.InputJsonValue,
          pocket,
          totalStake: result.totalStake,
          totalPayout: result.totalPayout,
        },
      });

      await applyLedgerEntry(tx, {
        userId,
        type: "BET",
        amount: -result.totalStake,
        idempotencyKey: `${GAME}:${spin.id}:bet`,
        game: GAME,
        reference: spin.id,
        metadata: { pocket },
      });

      let balance: number | undefined;
      if (result.totalPayout > 0) {
        ({ balance } = await applyLedgerEntry(tx, {
          userId,
          type: "PAYOUT",
          amount: result.totalPayout,
          idempotencyKey: `${GAME}:${spin.id}:payout`,
          game: GAME,
          reference: spin.id,
          metadata: { pocket },
        }));
      }
      balance ??= (await tx.wallet.findUniqueOrThrow({ where: { userId } })).balance;

      return { spin: toView(spin), balance, replayed: false };
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // The same spin key was used before (or by a simultaneous duplicate that won the race).
    // Its transaction rolled back, so nothing was charged twice: return the original spin.
    const existing = await db.rouletteSpin.findUniqueOrThrow({
      where: { userId_spinKey: { userId, spinKey: input.spinKey } },
    });
    const wallet = await db.wallet.findUniqueOrThrow({ where: { userId } });
    return { spin: toView(existing), balance: wallet.balance, replayed: true };
  }
}

/** The player's latest spins, newest first, for the results strip next to the table. */
export async function recentSpins(
  db: PrismaClient,
  userId: string,
  take = 12,
): Promise<SpinView[]> {
  const spins = await db.rouletteSpin.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
  return spins.map(toView);
}
