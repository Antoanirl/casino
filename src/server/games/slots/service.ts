import "server-only";
import { Prisma, type PrismaClient, type SlotSpin } from "@prisma/client";
import {
  evaluateSpin,
  settleRound,
  type SlotConfig,
  type SlotOutcome,
} from "@/server/games/slots/engine";
import { getSlotConfig } from "@/server/games/slots/games";
import { applyLedgerEntry } from "@/server/ledger";
import { randomInt } from "@/server/rng";

/**
 * Slot spins, for every slot game. Same shape as roulette: one spin is one transaction
 * (pick stops -> save the spin -> debit the bet -> credit any win), and (userId, spinKey)
 * is unique so a repeated request returns the original spin instead of charging again.
 *
 * A paid spin that starts free spins is settled as one round: the server draws the free
 * spins' stops straight away, stores every set of stops on the same row, and pays the whole
 * round's win as a single ledger entry. The browser only plays the round back.
 */

export class UnknownSlotGameError extends Error {
  constructor(readonly game: string) {
    super("That slot game doesn't exist");
    this.name = "UnknownSlotGameError";
  }
}

export interface SlotSpinView extends Omit<SlotOutcome, "payout"> {
  spinId: string;
  game: string;
  createdAt: string;
  /** Minor units returned for the paid spin alone. */
  basePayout: number;
  /** Free spins this spin started, in order (empty for most spins). */
  freeSpins: SlotOutcome[];
  /** Minor units returned for the whole round: paid spin plus free spins. */
  payout: number;
}

export interface SlotSpinResult {
  spin: SlotSpinView;
  /** Wallet balance after the spin, in minor units. */
  balance: number;
  replayed: boolean;
}

export interface SlotOptions {
  /**
   * Replaces the secure RNG. Called once for the paid spin, then once per free spin it awards.
   * Tests use it to choose the stops; production never sets it.
   */
  chooseStops?: (config: SlotConfig) => number[];
}

function configFor(game: string): SlotConfig {
  const config = getSlotConfig(game);
  if (!config) throw new UnknownSlotGameError(game);
  return config;
}

/** Stops are stored as one list per spin of the round; Phase 6 rows hold a single flat list. */
function storedStops(value: Prisma.JsonValue): number[][] {
  const list = value as unknown as number[] | number[][];
  return typeof list[0] === "number" ? [list as number[]] : (list as number[][]);
}

function toView(spin: SlotSpin): SlotSpinView {
  const config = configFor(spin.game);
  const round = settleRound(config, storedStops(spin.stops), spin.bet);
  return {
    ...round.base,
    basePayout: round.base.payout,
    freeSpins: round.freeSpins,
    payout: round.payout,
    spinId: spin.id,
    game: spin.game,
    createdAt: spin.createdAt.toISOString(),
  };
}

function secureStops(config: SlotConfig): number[] {
  return config.reels.map((strip) => randomInt(0, strip.length));
}

/**
 * Spins a slot game. Throws UnknownSlotGameError, InvalidSlotBetError (bet not on the game's
 * list) or InsufficientFundsError (balance can't cover the bet).
 */
export async function spinSlot(
  db: PrismaClient,
  userId: string,
  input: { game: string; bet: number; spinKey: string },
  options: SlotOptions = {},
): Promise<SlotSpinResult> {
  const config = configFor(input.game);
  const choose = options.chooseStops ?? secureStops;
  const first = choose(config);
  // Validates the bet and the stops before anything is written.
  const awarded = evaluateSpin(config, first, input.bet).freeSpinsAwarded;
  const stops = [first, ...Array.from({ length: awarded }, () => choose(config))];
  const outcome = settleRound(config, stops, input.bet);
  const ledgerGame = `slots:${config.slug}`;

  try {
    return await db.$transaction(async (tx) => {
      const spin = await tx.slotSpin.create({
        data: {
          userId,
          game: config.slug,
          spinKey: input.spinKey,
          bet: input.bet,
          stops,
          totalPayout: outcome.payout,
        },
      });

      let { balance } = await applyLedgerEntry(tx, {
        userId,
        type: "BET",
        amount: -input.bet,
        idempotencyKey: `${ledgerGame}:${spin.id}:bet`,
        game: ledgerGame,
        reference: spin.id,
        metadata: { stops: first },
      });

      if (outcome.payout > 0) {
        ({ balance } = await applyLedgerEntry(tx, {
          userId,
          type: "PAYOUT",
          amount: outcome.payout,
          idempotencyKey: `${ledgerGame}:${spin.id}:payout`,
          game: ledgerGame,
          reference: spin.id,
          metadata: { freeSpins: awarded },
        }));
      }

      return { spin: toView(spin), balance, replayed: false };
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"))
      throw error;
    // Repeated spin key: that spin already happened (its duplicate rolled back). Return it.
    const existing = await db.slotSpin.findUniqueOrThrow({
      where: { userId_spinKey: { userId, spinKey: input.spinKey } },
    });
    const wallet = await db.wallet.findUniqueOrThrow({ where: { userId } });
    return { spin: toView(existing), balance: wallet.balance, replayed: true };
  }
}

/** The player's latest spins on one game, newest first. */
export async function recentSlotSpins(
  db: PrismaClient,
  userId: string,
  game: string,
  take = 8,
): Promise<SlotSpinView[]> {
  const spins = await db.slotSpin.findMany({
    where: { userId, game },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
  return spins.map(toView);
}
