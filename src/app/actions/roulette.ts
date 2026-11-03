"use server";

import { z } from "zod";
import { MINOR_UNITS_PER_CREDIT, formatCredits } from "@/lib/money";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { InvalidBetsError, type Bet } from "@/server/games/roulette/engine";
import { recentSpins, spinRoulette, type SpinView } from "@/server/games/roulette/service";
import { InsufficientFundsError } from "@/server/ledger";

/**
 * What the roulette table calls. The browser sends only the chips it placed (in whole
 * credits); the server validates them, draws the pocket and settles the spin.
 */

export type RouletteResponse =
  { ok: true; spin: SpinView; balance: number } | { ok: false; error: string };

const spotSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("straight"), number: z.number().int().min(0).max(36) }),
  z.object({ kind: z.literal("red") }),
  z.object({ kind: z.literal("black") }),
  z.object({ kind: z.literal("odd") }),
  z.object({ kind: z.literal("even") }),
  z.object({
    kind: z.literal("dozen"),
    dozen: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  z.object({
    kind: z.literal("column"),
    column: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
]);

const spinSchema = z.object({
  spinKey: z.uuid(),
  bets: z
    .array(z.object({ spot: spotSchema, credits: z.number().int().min(1).max(500) }))
    .min(1)
    .max(60),
});

export async function spinRouletteAction(input: unknown): Promise<RouletteResponse> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Log in to play." };

  const parsed = spinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Those bets aren't valid on this table." };

  const bets: Bet[] = parsed.data.bets.map(({ spot, credits }) => ({
    spot,
    amount: credits * MINOR_UNITS_PER_CREDIT,
  }));

  try {
    const { spin, balance } = await spinRoulette(getDb(), user.id, {
      bets,
      spinKey: parsed.data.spinKey,
    });
    return { ok: true, spin, balance };
  } catch (error) {
    if (error instanceof InvalidBetsError) return { ok: false, error: error.message };
    if (error instanceof InsufficientFundsError) {
      return {
        ok: false,
        error: `Not enough credits: these bets need ${formatCredits(error.requested)} and you have ${formatCredits(error.available)}.`,
      };
    }
    console.error("Roulette spin failed", error);
    return { ok: false, error: "The wheel couldn't spin. Nothing was charged; try again." };
  }
}

/** The player's latest results, for the strip next to the table. */
export async function recentRouletteSpins(): Promise<SpinView[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return recentSpins(getDb(), user.id);
}
