"use server";

import { z } from "zod";
import { formatCredits } from "@/lib/money";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { IllegalActionError, InvalidBetError } from "@/server/games/blackjack/engine";
import {
  RoundInProgressError,
  RoundNotFoundError,
  StaleRoundError,
  getActiveRound,
  playBlackjackAction,
  startBlackjackRound,
  type BlackjackView,
} from "@/server/games/blackjack/service";
import { InsufficientFundsError } from "@/server/ledger";
import { checkPlayRate } from "@/server/rate-limit";

/**
 * What the blackjack table calls. Every input is validated here; the browser only says
 * what the player wants to do. Results carry the round as the player is allowed to see it.
 */

export type BlackjackResponse =
  | { ok: true; round: BlackjackView; balance: number }
  | {
      ok: false;
      error: string;
      /** When the table is out of date, the current round so it can catch up. */
      round?: BlackjackView;
    };

const dealSchema = z.object({
  /** Whole credits, converted to minor units on the server. */
  credits: z.number().int().min(1).max(500),
  dealKey: z.uuid(),
});

const actionSchema = z.object({
  roundId: z.string().min(1).max(64),
  action: z.enum(["hit", "stand", "double", "split"]),
  version: z.number().int().min(0),
});

function failure(error: unknown): BlackjackResponse {
  if (error instanceof StaleRoundError || error instanceof RoundInProgressError) {
    return { ok: false, error: error.message, round: error.round };
  }
  if (error instanceof InsufficientFundsError) {
    return {
      ok: false,
      error: `Not enough credits: that needs ${formatCredits(error.requested)} and you have ${formatCredits(error.available)}.`,
    };
  }
  if (
    error instanceof InvalidBetError ||
    error instanceof IllegalActionError ||
    error instanceof RoundNotFoundError
  ) {
    return { ok: false, error: error.message };
  }
  console.error("Blackjack request failed", error);
  return { ok: false, error: "The table couldn't process that. Nothing was charged; try again." };
}

const signedOut: BlackjackResponse = { ok: false, error: "Log in to play." };

export async function dealBlackjack(input: unknown): Promise<BlackjackResponse> {
  const user = await getCurrentUser();
  if (!user) return signedOut;
  const throttled = await checkPlayRate(getDb(), user.id);
  if (throttled) return { ok: false, error: throttled };

  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bets are whole credits from 1 to 500." };

  try {
    const result = await startBlackjackRound(getDb(), user.id, {
      bet: parsed.data.credits * 100,
      dealKey: parsed.data.dealKey,
    });
    return { ok: true, ...result };
  } catch (error) {
    return failure(error);
  }
}

export async function playBlackjack(input: unknown): Promise<BlackjackResponse> {
  const user = await getCurrentUser();
  if (!user) return signedOut;
  const throttled = await checkPlayRate(getDb(), user.id);
  if (throttled) return { ok: false, error: throttled };

  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That move isn't valid." };

  try {
    const result = await playBlackjackAction(getDb(), user.id, parsed.data);
    return { ok: true, ...result };
  } catch (error) {
    return failure(error);
  }
}

/** The unfinished round to resume after a reload, if any. */
export async function currentBlackjackRound(): Promise<BlackjackView | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return getActiveRound(getDb(), user.id);
}
