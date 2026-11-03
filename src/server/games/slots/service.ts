import "server-only";
import { Prisma, type PrismaClient, type SlotSpin } from "@prisma/client";
import { evaluateSpin, type SlotConfig, type SlotOutcome } from "@/server/games/slots/engine";
import { getSlotConfig } from "@/server/games/slots/games";
import { applyLedgerEntry } from "@/server/ledger";
import { randomInt } from "@/server/rng";

/**
 * Slot spins, for every slot game. Same shape as roulette: one spin is one transaction
 * (pick stops -> save the spin -> debit the bet -> credit any win), and (userId, spinKey)
 * is unique so a repeated request returns the original spin instead of charging again.
 */

export class UnknownSlotGameError extends Error {
  constructor(readonly game: string) {
    super("That slot game doesn't exist");
    this.name = "UnknownSlotGameError";
  }
}

export interface SlotSpinView extends SlotOutcome {
  spinId: string;
  game: string;
  createdAt: string;
}

export interface SlotSpinResult {
  spin: SlotSpinView;
  /** Wallet balance after the spin, in minor units. */
  balance: number;
  replayed: boolean;
}

export interface SlotOptions {
  /** Replaces the secure RNG. Tests use it to choose the stops; production never sets it. */
  chooseStops?: (config: SlotConfig) => number[];
}

function configFor(game: string): SlotConfig {
  const config = getSlotConfig(game);
  if (!config) throw new UnknownSlotGameError(game);
  return config;
}

function toView(spin: SlotSpin): SlotSpinView {
  const config = configFor(spin.game);
  const outcome = evaluateSpin(config, spin.stops as unknown as number[], spin.bet);
  return { ...outcome, spinId: spin.id, game: spin.game, createdAt: spin.createdAt.toISOString() };
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
  const stops = (options.chooseStops ?? secureStops)(config);
  // Validates the bet and the stops before anything is written.
  const outcome = evaluateSpin(config, stops, input.bet);
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
        metadata: { stops },
      });

      if (outcome.payout > 0) {
        ({ balance } = await applyLedgerEntry(tx, {
          userId,
          type: "PAYOUT",
          amount: outcome.payout,
          idempotencyKey: `${ledgerGame}:${spin.id}:payout`,
          game: ledgerGame,
          reference: spin.id,
          metadata: { stops },
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
