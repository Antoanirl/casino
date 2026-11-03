"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { spinSlotAction } from "@/app/actions/slots";
import { SymbolArt } from "@/components/slots/symbol-art";
import { formatCredits } from "@/lib/money";
import type { SlotConfig } from "@/server/games/slots/engine";
import type { SlotSpinView } from "@/server/games/slots/service";

/** First reel stops after this long; each next reel stops REEL_GAP_MS later. */
const FIRST_STOP_MS = 700;
const REEL_GAP_MS = 380;

const countWords = ["", "One", "Two", "Three", "Four", "Five"];

function credits(minor: number): string {
  return `${formatCredits(minor)} ${minor === 100 ? "credit" : "credits"}`;
}

function times(pays: number): string {
  return `${(pays / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}x`;
}

/** Lines like "Three Bells on the top row: 15x your bet". */
function describeWins(config: SlotConfig, spin: SlotSpinView): string[] {
  const nameOf = (id: string, count: number) => {
    const name = config.symbols.find((s) => s.id === id)?.name ?? id;
    if (count === 1) return name;
    // "Cherry" -> "Cherries", "Bell" -> "Bells"
    return /[^aeiou]y$/i.test(name) ? `${name.slice(0, -1)}ies` : `${name}s`;
  };
  const lines = spin.lineWins.map((win) => {
    const line = config.paylineNames?.[win.line] ?? `line ${win.line + 1}`;
    return `${countWords[win.count] ?? win.count} ${nameOf(win.symbol, win.count)} on the ${line}: ${times(win.pays)} your bet`;
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
  const cell = "flex h-20 items-center justify-center sm:h-24";

  return (
    <div className="bg-sheet relative overflow-hidden rounded-md shadow-inner">
      {spinning ? (
        // Twice the strip, scrolled by half its height in a loop: a seamless blur of symbols.
        <div aria-hidden="true" className="h-60 overflow-hidden sm:h-72">
          <div className="animate-reel-spin blur-[1.5px]">
            {[...strip, ...strip].map((id, i) => (
              <div key={i} className={cell}>
                <SymbolArt id={id} name={symbolName(id)} className="h-14 w-14 sm:h-16 sm:w-16" />
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
                <SymbolArt id={id} name={symbolName(id)} className="h-14 w-14 sm:h-16 sm:w-16" />
              </div>
            ),
          )}
        </div>
      )}
    </div>
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
  const [result, setResult] = useState<SlotSpinView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const spinning = spinningReels.some(Boolean);
  const busy = pending || spinning;
  const affordable = bet * 100 <= balance;

  const highlighted = new Set<string>();
  if (result && !spinning) {
    for (const win of result.lineWins)
      for (const [r, row] of win.cells) highlighted.add(`${r}:${row}`);
    for (const [r, row] of result.scatterWin?.cells ?? []) highlighted.add(`${r}:${row}`);
  }

  function spin() {
    if (busy) return;
    setError(null);
    setResult(null);
    const spinKey = crypto.randomUUID();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) setSpinningReels(config.reels.map(() => true));

    startTransition(async () => {
      const response = await spinSlotAction({ game: config.slug, credits: bet, spinKey });
      if (!response.ok) {
        setSpinningReels(config.reels.map(() => false));
        setError(response.error);
        return;
      }
      const { spin: outcome } = response;
      setStops(outcome.stops);

      const finish = () => {
        setResult(outcome);
        setBalance(response.balance);
        router.refresh(); // updates the balance in the header
      };
      if (reduceMotion) return finish();

      timers.current.forEach(clearTimeout);
      timers.current = config.reels.map((_, reel) =>
        setTimeout(
          () => {
            setSpinningReels((current) => current.map((s, i) => (i === reel ? false : s)));
            if (reel === config.reels.length - 1) finish();
          },
          FIRST_STOP_MS + reel * REEL_GAP_MS,
        ),
      );
    });
  }

  const wins = result ? describeWins(config, result) : [];
  const net = result ? result.payout - result.bet : 0;

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
            {result && !spinning && result.lineWins.length > 0 ? (
              <svg
                aria-hidden="true"
                viewBox={`0 0 ${config.reels.length * 100} ${config.rows * 100}`}
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] sm:inset-3 sm:h-[calc(100%-1.5rem)] sm:w-[calc(100%-1.5rem)]"
              >
                {result.lineWins.map((win) => (
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

          <div aria-live="polite" className="mt-4 min-h-16">
            {spinning ? (
              <p className="text-paper/80 text-sm">Spinning…</p>
            ) : result ? (
              result.payout > 0 ? (
                <div>
                  <p className="font-display text-2xl">
                    You won {credits(result.payout)}
                    {net > 0 ? "" : ` (${credits(result.bet)} staked)`}.
                  </p>
                  <ul className="text-paper/80 mt-1 space-y-0.5 text-sm">
                    {wins.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="font-display text-2xl">No win this time.</p>
              )
            ) : null}
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
