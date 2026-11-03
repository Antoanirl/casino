"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { dealBlackjack, playBlackjack, type BlackjackResponse } from "@/app/actions/blackjack";
import { PlayingCard } from "@/components/blackjack/playing-card";
import { formatCredits } from "@/lib/money";
import type { Card, HandValue } from "@/server/games/blackjack/cards";
import type { Action, HandResult, PublicHand } from "@/server/games/blackjack/engine";
import type { BlackjackView } from "@/server/games/blackjack/service";

const CHIPS = [1, 5, 25, 100] as const;
const MAX_BET = 500;
/**
 * After the table changes, clicks are ignored for a moment. Without this, the second click
 * of a double click lands on whichever new button just appeared under the pointer.
 */
const SETTLE_MS = 450;

const actionLabels: Record<Action, string> = {
  hit: "Hit",
  stand: "Stand",
  double: "Double",
  split: "Split",
};

const resultLabels: Record<HandResult, string> = {
  blackjack: "Blackjack",
  win: "Win",
  push: "Push",
  lose: "Lose",
};

function credits(minor: number): string {
  return `${formatCredits(minor)} ${minor === 100 ? "credit" : "credits"}`;
}

function valueLabel(value: HandValue): string {
  if (value.total > 21) return `${value.total}, bust`;
  return value.soft ? `soft ${value.total}` : String(value.total);
}

function cardKey(card: Card | null, i: number): string {
  return card ? `${card.rank}${card.suit}-${i}` : `hidden-${i}`;
}

/** Why a hand stopped without the player choosing to stand, if it did. */
function handNote(hand: PublicHand): string | null {
  if (hand.status === "blackjack") return "Blackjack";
  if (hand.splitAces) return "Split aces take one card each";
  if (hand.doubled) return "Doubled: one card only";
  if (hand.status === "stood" && hand.value.total === 21) return "21 stands automatically";
  return null;
}

/** One line under a finished round, written from the player's side. */
function roundSummary(round: BlackjackView): string {
  const net = (round.totalPayout ?? 0) - round.totalStake;
  if (net > 0) return `You won ${credits(net)}.`;
  if (net < 0) return `You lost ${credits(-net)}.`;
  const allPush = round.hands.every((hand) => hand.outcome?.result === "push");
  return allPush
    ? `Push: your ${credits(round.totalStake)} came back.`
    : `You broke even: ${credits(round.totalStake)} staked, the same back.`;
}

function HandView({
  label,
  cards,
  value,
  offset = 0,
  active = false,
  hand,
}: {
  label: string;
  cards: (Card | null)[];
  value: HandValue;
  offset?: number;
  active?: boolean;
  hand?: PublicHand;
}) {
  const note = hand ? handNote(hand) : null;
  return (
    <div
      className={`rounded-xl p-2 transition-colors sm:p-3 ${active ? "bg-felt-deep/70 ring-brass ring-2" : ""}`}
      aria-current={active ? "true" : undefined}
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="text-paper font-semibold">{label}</span>
        <span className="figures text-paper/75">{valueLabel(value)}</span>
        {hand ? <span className="figures text-paper/75">bet {formatCredits(hand.bet)}</span> : null}
        {hand?.outcome ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              hand.outcome.result === "lose" ? "bg-paper/15 text-paper" : "bg-brass text-felt-deep"
            }`}
          >
            {resultLabels[hand.outcome.result]}
          </span>
        ) : null}
      </div>
      <div className="flex">
        {cards.map((card, i) => (
          <div key={cardKey(card, i)} className={i === 0 ? "" : "-ml-8 sm:-ml-10"}>
            <PlayingCard card={card} delay={offset + i * 120} />
          </div>
        ))}
      </div>
      {note && !hand?.outcome ? <p className="text-brass mt-2 text-xs">{note}</p> : null}
    </div>
  );
}

export function BlackjackTable({
  initialRound,
  initialBalance,
}: {
  initialRound: BlackjackView | null;
  initialBalance: number;
}) {
  const router = useRouter();
  const [round, setRound] = useState(initialRound);
  const [balance, setBalance] = useState(initialBalance);
  const [bet, setBet] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const busy = pending || settling;
  const inPlay = round?.phase === "player";
  const affordable = bet * 100 <= balance;
  const multipleHands = (round?.hands.length ?? 0) > 1;

  function handle(response: BlackjackResponse) {
    if (response.ok) {
      setRound(response.round);
      setBalance(response.balance);
      setError(null);
      router.refresh(); // updates the balance in the header
    } else {
      setError(response.error);
      if (response.round) setRound(response.round);
    }
    setSettling(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSettling(false), SETTLE_MS);
  }

  function deal() {
    // A fresh key per click; the server deals at most once per key.
    const dealKey = crypto.randomUUID();
    startTransition(async () => handle(await dealBlackjack({ credits: bet, dealKey })));
  }

  function act(action: Action) {
    if (!round) return;
    const move = { roundId: round.roundId, action, version: round.version };
    startTransition(async () => handle(await playBlackjack(move)));
  }

  return (
    <div className="space-y-4">
      <section
        aria-label="Blackjack table"
        className="on-felt bg-felt text-paper ring-felt-deep overflow-hidden rounded-2xl ring-1"
      >
        <div className="px-3 pt-5 pb-4 sm:px-6">
          {round ? (
            <div className="space-y-4">
              <HandView label="Dealer" cards={round.dealer} value={round.dealerValue} offset={60} />
              <div className="flex flex-wrap gap-2">
                {round.hands.map((hand, i) => (
                  <HandView
                    key={i}
                    label={multipleHands ? `Hand ${i + 1}` : "You"}
                    cards={hand.cards}
                    value={hand.value}
                    hand={hand}
                    active={inPlay && multipleHands && i === round.active}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <p className="font-display text-3xl">Place your bet</p>
              <p className="text-paper/75 mt-2 max-w-xs text-sm">
                Add chips, then deal. Blackjack pays 3 to 2; the dealer stands on 17.
              </p>
            </div>
          )}
        </div>

        {/* Controls sit on the table, right under the cards, so they're always in view. */}
        <div className="border-paper/15 bg-felt-deep/60 border-t px-3 py-4 sm:px-6">
          <div aria-live="polite" className="mb-3 min-h-7">
            {round?.phase === "settled" ? (
              <p className="font-display text-2xl">{roundSummary(round)}</p>
            ) : round && round.phase === "player" ? (
              <p className="text-paper/80 text-sm">
                {multipleHands
                  ? `Your move on hand ${round.active + 1} of ${round.hands.length}.`
                  : "Your move."}
              </p>
            ) : null}
          </div>

          {round && round.phase === "player" ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Your move">
              {round.actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={busy}
                  onClick={() => act(action)}
                  className={`min-w-24 rounded-md px-5 py-3 text-base font-semibold transition-colors disabled:opacity-50 ${
                    action === "hit" || action === "stand"
                      ? "bg-paper text-ink hover:bg-sheet"
                      : "border-paper/50 text-paper hover:bg-felt border"
                  }`}
                >
                  {actionLabels[action]}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-2" role="group" aria-label="Add chips">
                {CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={busy || bet + chip > MAX_BET}
                    onClick={() => setBet((b) => Math.min(MAX_BET, b + chip))}
                    aria-label={`Add ${chip} to the bet`}
                    className="figures border-brass bg-felt text-paper hover:bg-felt-deep flex h-11 w-11 items-center justify-center rounded-full border-4 border-dashed text-sm font-semibold shadow disabled:opacity-40"
                  >
                    {chip}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setBet(1)}
                  className="text-paper/80 px-2 text-sm underline-offset-4 hover:underline"
                >
                  Reset
                </button>
              </div>
              <div className="flex items-center gap-4">
                <p className="figures">
                  <span className="font-display text-3xl">{bet}</span>{" "}
                  <span className="text-paper/75 text-sm">{bet === 1 ? "credit" : "credits"}</span>
                </p>
                <button
                  type="button"
                  disabled={busy || !affordable}
                  onClick={deal}
                  className="bg-brass text-felt-deep hover:bg-brass/85 rounded-md px-6 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? "Dealing…" : round ? "Deal again" : "Deal"}
                </button>
              </div>
            </div>
          )}

          {!inPlay && !affordable ? (
            <p className="text-brass mt-3 text-sm">That bet is more than your balance.</p>
          ) : null}
        </div>
      </section>

      {error ? (
        <p
          role="alert"
          className="border-stamp/40 bg-stamp/5 text-stamp rounded-md border px-3 py-2 text-sm"
        >
          {error}
        </p>
      ) : null}

      <p className="figures text-ink-soft text-sm">Balance {credits(balance)}</p>
    </div>
  );
}
