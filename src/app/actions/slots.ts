"use server";

import { z } from "zod";
import { MINOR_UNITS_PER_CREDIT, formatCredits } from "@/lib/money";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { InvalidSlotBetError } from "@/server/games/slots/engine";
import { UnknownSlotGameError, spinSlot, type SlotSpinView } from "@/server/games/slots/service";
import { InsufficientFundsError } from "@/server/ledger";

/** What the slot machines call. The browser chooses the game and the bet; the server spins. */

export type SlotResponse =
  { ok: true; spin: SlotSpinView; balance: number } | { ok: false; error: string };

const spinSchema = z.object({
  game: z.string().min(1).max(32),
  credits: z.number().int().min(1).max(1_000),
  spinKey: z.uuid(),
});

export async function spinSlotAction(input: unknown): Promise<SlotResponse> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Log in to play." };

  const parsed = spinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That bet isn't valid on this machine." };

  try {
    const { spin, balance } = await spinSlot(getDb(), user.id, {
      game: parsed.data.game,
      bet: parsed.data.credits * MINOR_UNITS_PER_CREDIT,
      spinKey: parsed.data.spinKey,
    });
    return { ok: true, spin, balance };
  } catch (error) {
    if (error instanceof InvalidSlotBetError || error instanceof UnknownSlotGameError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof InsufficientFundsError) {
      return {
        ok: false,
        error: `Not enough credits: this spin needs ${formatCredits(error.requested)} and you have ${formatCredits(error.available)}.`,
      };
    }
    console.error("Slot spin failed", error);
    return { ok: false, error: "The machine couldn't spin. Nothing was charged; try again." };
  }
}
