"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { spinSlotAction } from "@/app/actions/slots";
import { SymbolArt } from "@/components/slots/symbol-art";
import { formatCredits } from "@/lib/money";
import type { SlotConfig, SlotOutcome } from "@/server/games/slots/engine";
import type { SlotSpinView } from "@/server/games/slots/service";

/** First reel stops after this long; each next reel stops REEL_GAP_MS later. */
const FIRST_STOP_MS = 700;
const REEL_GAP_MS = 380;
/** Free spins play themselves, a little faster. */
const FREE_FIRST_STOP_MS = 500;
const FREE_REEL_GAP_MS = 200;
/** Pause on the spin that awarded free spins, and after each free spin (longer after a win). */
const BONUS_INTRO_MS = 1_800;
const FREE_PAUSE_MS = 700;
const FREE_WIN_PAUSE_MS = 1_400;

const countWords = ["", "One", "Two", "Three", "Four", "Five"];

function credits(minor: number): string {
  return `${formatCredits(minor)} ${minor === 100 ? "credit" : "credits"}`;
}

function times(pays: number): string {
  return `${(pays / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}x`;
}

function multiplied(times: number): string {
  if (times === 2) return "doubled";
  if (times === 3) return "tripled";
  return `multiplied by ${times}`;
}

/** The paid spin, or free spin number `step` (1-based), of a round. */
function outcomeAt(round: SlotSpinView, step: number): SlotOutcome {
  return step === 0 ? { ...round, payout: round.basePayout } : round.freeSpins[step - 1]!;
}

/** Lines like "Three Bells on the top row: 15x your bet". */
function describeWins(config: SlotConfig, spin: SlotOutcome): string[] {
  const nameOf = (id: string, count: number) => {
    const name = config.symbols.find((s) => s.id === id)?.name ?? id;
    if (count === 1) return name;
    // "Cherry" -> "Cherries", "Topaz" -> "Topazes", "Boots" stays "Boots", "Bell" -> "Bells"
    if (/[^aeiou]y$/i.test(name)) return `${name.slice(0, -1)}ies`;
    if (/s$/i.test(name)) return name;
    if (/(x|z|ch|sh)$/i.test(name)) return `${name}es`;
    return `${name}s`;
  };
  const wild = config.symbols.find((s) => s.kind === "wild");
  const lines = spin.lineWins.map((win) => {
    const line = config.paylineNames?.[win.line] ?? `line ${win.line + 1}`;
    const boost =
      win.wildMultiplier > 1 && wild
        ? `, ${multiplied(win.wildMultiplier)} by the ${wild.name}`
        : "";
    return `${countWords[win.count] ?? win.count} ${nameOf(win.symbol, win.count)} on the ${line}${boost}: ${times(win.pays)} your bet`;
  });
  if (spin.scatterWin) {
    const { symbol, count, pays } = spin.scatterWin;
    lines.push(
      `${countWords[count] ?? count} ${nameOf(symbol, count)} anywhere: ${times(pays)} your bet`,
    );
  }
  return lines;
}

function Reel({
  config,
  reel,
  stop,
  spinning,
  highlighted,
}: {
  config: SlotConfig;
  reel: number;
  stop: number;
  spinning: boolean;
  highlighted: Set<string>;
}) {
  const strip = config.reels[reel]!;
  const symbolName = (id: string) => config.symbols.find((s) => s.id === id)?.name ?? id;
  // Five reels need narrower cells to fit a phone screen.
  const compact = config.reels.length > 3;
  const cell = `flex items-center justify-center ${compact ? "h-16 sm:h-24" : "h-20 sm:h-24"}`;
  const art = compact ? "h-11 w-11 sm:h-16 sm:w-16" : "h-14 w-14 sm:h-16 sm:w-16";

  return (
    <div className="bg-sheet relative overflow-hidden rounded-md shadow-inner">
      {spinning ? (
        // Twice the strip, scrolled by half its height in a loop: a seamless blur of symbols.
        <div
          aria-hidden="true"
          className={`overflow-hidden ${compact ? "h-48 sm:h-72" : "h-60 sm:h-72"}`}
        >
          <div className="animate-reel-spin blur-[1.5px]">
            {[...strip, ...strip].map((id, i) => (
              <div key={i} className={cell}>
                <SymbolArt id={id} name={symbolName(id)} className={art} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="animate-reel-stop">
          {Array.from({ length: config.rows }, (_, row) => strip[(stop + row) % strip.length]!).map(
            (id, row) => (
              <div
                key={`${stop}-${row}`}
                className={`${cell} transition-colors ${highlighted.has(`${reel}:${row}`) ? "bg-brass/35" : ""}`}
              >
                <SymbolArt id={id} name={symbolName(id)} className={art} />
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function WinList({ wins }: { wins: string[] }) {
  if (wins.length === 0) return null;
  return (
    <ul className="text-paper/80 mt-1 space-y-0.5 text-sm">
      {wins.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

export function SlotMachine({
  config,
  initialBalance,
  initialStops,
}: {
  config: SlotConfig;
  initialBalance: number;
  initialStops: number[];
}) {
  const router = useRouter();
  const betChoices = config.bets.map((b) => b / 100);
  const [bet, setBet] = useState(betChoices.includes(5) ? 5 : betChoices[0]!);
  const [balance, setBalance] = useState(initialBalance);
  const [stops, setStops] = useState(initialStops);
  const [spinningReels, setSpinningReels] = useState<boolean[]>(() =>
    config.reels.map(() => false),
  );
  /** The latest round, as soon as the server has settled it; the reels then play it back. */
  const [round, setRound] = useState<SlotSpinView | null>(null);
  /** Which spin of the round is on the reels: 0 = the paid spin, n = free spin n. */
  const [step, setStep] = useState(0);
  /** True from pressing Spin until the whole round, free spins included, has played. */
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const spinning = spinningReels.some(Boolean);
  const busy = pending || playing;
  const affordable = bet * 100 <= balance;

  const current = round ? outcomeAt(round, step) : null;
  const shown = current && !spinning ? current : null;
  const freeCount = round?.freeSpins.length ?? 0;
  const freeMultiplier = config.freeSpins?.multiplier ?? 1;
  // Free-spin winnings on spins that have finished (the one on the reels counts once it stops).
  const freeWon = round
    ? round.freeSpins
        .slice(0, spinning ? Math.max(step - 1, 0) : step)
        .reduce((sum, s) => sum + s.payout, 0)
    : 0;

  const highlighted = new Set<string>();
  if (shown) {
    for (const win of shown.lineWins)
      for (const [r, row] of win.cells) highlighted.add(`${r}:${row}`);
    for (const [r, row] of shown.scatterWin?.cells ?? []) highlighted.add(`${r}:${row}`);
  }

  function after(ms: number, run: () => void) {
    timers.current.push(setTimeout(run, ms));
  }

  /** Stops the (already spinning) reels one by one, then calls done. */
  function stopReels(firstMs: number, gapMs: number, done: () => void) {
    config.reels.forEach((_, reel) =>
      after(firstMs + reel * gapMs, () => {
        setSpinningReels((reels) => reels.map((s, i) => (i === reel ? false : s)));
        if (reel === config.reels.length - 1) done();
      }),
    );
  }

  function finish(balanceAfter: number) {
    setPlaying(false);
    setBalance(balanceAfter);
    router.refresh(); // updates the balance in the header
  }

  /** Jumps to the end of the round: the last free spin on the reels, the total paid. */
  function skipToEnd(outcome: SlotSpinView, balanceAfter: number) {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const last = outcome.freeSpins.length;
    setStep(last);
    setStops(outcomeAt(outcome, last).stops);
    setSpinningReels(config.reels.map(() => false));
    finish(balanceAfter);
  }

  const skip = useRef<(() => void) | null>(null);

  function spin() {
    if (busy) return;
    setError(null);
    setRound(null);
    setStep(0);
    setPlaying(true);
    const spinKey = crypto.randomUUID();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) setSpinningReels(config.reels.map(() => true));

    startTransition(async () => {
      const response = await spinSlotAction({ game: config.slug, credits: bet, spinKey });
      if (!response.ok) {
        setSpinningReels(config.reels.map(() => false));
        setPlaying(false);
        setError(response.error);
        return;
      }
      const { spin: outcome, balance: balanceAfter } = response;
      setRound(outcome);
      setStops(outcome.stops);
      skip.current = () => skipToEnd(outcome, balanceAfter);
      if (reduceMotion) return skipToEnd(outcome, balanceAfter);

      timers.current.forEach(clearTimeout);
      timers.current = [];

      const playFree = (n: number) => {
        if (n > outcome.freeSpins.length) return finish(balanceAfter);
        const free = outcome.freeSpins[n - 1]!;
        setStep(n);
        setStops(free.stops);
        setSpinningReels(config.reels.map(() => true));
        stopReels(FREE_FIRST_STOP_MS, FREE_REEL_GAP_MS, () =>
          after(free.payout > 0 ? FREE_WIN_PAUSE_MS : FREE_PAUSE_MS, () => playFree(n + 1)),
        );
      };

      stopReels(FIRST_STOP_MS, REEL_GAP_MS, () => {
        if (outcome.freeSpins.length > 0) after(BONUS_INTRO_MS, () => playFree(1));
        else finish(balanceAfter);
      });
    });
  }

  const wins = shown ? describeWins(config, shown) : [];
  const inBonus = round !== null && freeCount > 0 && (step > 0 || !spinning);
  const bonusWord = freeMultiplier === 2 ? "double" : `${freeMultiplier}x`;

  return (
    <div className="space-y-4">
      <section
        aria-label={`${config.name} machine`}
        className="on-felt bg-felt text-paper ring-felt-deep overflow-hidden rounded-2xl ring-1"
      >
        <div className="px-3 pt-6 pb-4 sm:px-8">
          <div className="bg-felt-deep ring-brass/70 relative rounded-xl p-2 ring-2 sm:p-3">
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${config.reels.length}, minmax(0, 1fr))` }}
            >
              {config.reels.map((_, reel) => (
                <Reel
                  key={reel}
                  config={config}
                  reel={reel}
                  stop={stops[reel] ?? 0}
                  spinning={spinningReels[reel] ?? false}
                  highlighted={highlighted}
                />
              ))}
            </div>

            {/* Winning paylines, drawn over the reels once they have all stopped. */}
            {shown && shown.lineWins.length > 0 ? (
              <svg
                aria-hidden="true"
                viewBox={`0 0 ${config.reels.length * 100} ${config.rows * 100}`}
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] sm:inset-3 sm:h-[calc(100%-1.5rem)] sm:w-[calc(100%-1.5rem)]"
              >
                {shown.lineWins.map((win) => (
                  <polyline
                    key={win.line}
                    points={config.paylines[win.line]!.map(
                      (row, reel) => `${reel * 100 + 50},${row * 100 + 50}`,
                    ).join(" ")}
                    fill="none"
                    stroke="var(--color-brass)"
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
            ) : null}
          </div>

          {inBonus ? (
            <div className="border-brass/70 bg-felt-deep mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border px-4 py-3">
              <div>
                <p className="font-display text-xl">
                  {step === 0
                    ? `${freeCount} free spins! Every win pays ${bonusWord}.`
                    : `Free spin ${step} of ${freeCount}`}
                </p>
                <p className="figures text-paper/80 text-sm">
                  Won in free spins{playing ? " so far" : ""}: {credits(freeWon)}
                </p>
              </div>
              {playing && round ? (
                <button
                  type="button"
                  onClick={() => skip.current?.()}
                  className="border-brass/70 text-paper hover:bg-felt rounded-md border px-3 py-1.5 text-sm"
                >
                  Skip to the total
                </button>
              ) : null}
            </div>
          ) : null}

          <div aria-live="polite" className="mt-4 min-h-16">
            {!round || (spinning && step === 0) ? (
              spinning ? (
                <p className="text-paper/80 text-sm">Spinning…</p>
              ) : null
            ) : !playing ? (
              <div>
                {round.payout > 0 ? (
                  <p className="font-display text-2xl">
                    You won {credits(round.payout)}
                    {freeCount > 0 ? " this round" : ""}
                    {round.payout > round.bet ? "" : ` (${credits(round.bet)} staked)`}.
                  </p>
                ) : (
                  <p className="font-display text-2xl">No win this time.</p>
                )}
                {freeCount > 0 ? (
                  <p className="figures text-paper/80 mt-1 text-sm">
                    Paid spin {credits(round.basePayout)}, {freeCount} free spins{" "}
                    {credits(round.payout - round.basePayout)}.
                  </p>
                ) : null}
                <WinList wins={wins} />
              </div>
            ) : (
              <WinList wins={wins} />
            )}
          </div>
        </div>

        <div className="border-paper/15 bg-felt-deep/60 flex flex-wrap items-center gap-x-6 gap-y-4 border-t px-3 py-4 sm:px-8">
          <div
            className="flex flex-wrap items-center gap-1.5 sm:gap-2"
            role="radiogroup"
            aria-label="Bet"
          >
            <span className="text-paper/75 mr-1 text-sm">Bet</span>
            {betChoices.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={bet === value}
                disabled={busy}
                onClick={() => setBet(value)}
                className={`figures h-9 min-w-9 rounded-full border-2 px-1.5 text-sm font-semibold transition-colors disabled:opacity-60 sm:h-10 sm:min-w-10 sm:px-2 ${
                  bet === value
                    ? "border-brass bg-brass text-felt-deep"
                    : "border-brass/60 text-paper hover:bg-felt"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={busy || !affordable}
            onClick={spin}
            className="bg-brass text-felt-deep hover:bg-brass/85 rounded-md px-8 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Spinning…" : "Spin"}
          </button>
          {!affordable ? (
            <p className="text-brass text-sm">That bet is more than your balance.</p>
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
