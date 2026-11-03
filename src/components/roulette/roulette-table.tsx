"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { spinRouletteAction } from "@/app/actions/roulette";
import { RouletteWheel, SPIN_MS, rotationFor } from "@/components/roulette/roulette-wheel";
import { formatCredits } from "@/lib/money";
import { pocketColor, spotKey, spotWins, type BetSpot } from "@/server/games/roulette/engine";
import type { SpinView } from "@/server/games/roulette/service";

const CHIPS = [1, 5, 25, 100] as const;
const MAX_SPOT = 500;
const MAX_TOTAL = 1_000;

interface Placement {
  spot: BetSpot;
  credits: number;
}

const colorName = { red: "red", black: "black", green: "green" } as const;

function credits(n: number): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? "credit" : "credits"}`;
}

function spotLabel(spot: BetSpot): string {
  switch (spot.kind) {
    case "straight":
      return spot.number === 0 ? "0" : `${spot.number} ${pocketColor(spot.number)}`;
    case "dozen":
      return `${["1st", "2nd", "3rd"][spot.dozen - 1]} dozen`;
    case "column":
      return `column ${spot.column}`;
    default:
      return spot.kind;
  }
}

/** Plain-language outcome of a spin, from the player's side. */
function spinSummary(spin: SpinView): string {
  const pocket = `${spin.pocket} ${colorName[spin.color]}.`;
  const stake = spin.totalStake / 100;
  const payout = spin.totalPayout / 100;
  const net = payout - stake;
  if (payout === 0) return `${pocket} You lost ${credits(stake)}.`;
  if (net > 0) return `${pocket} You won ${credits(net)}.`;
  if (net === 0) return `${pocket} You broke even.`;
  return `${pocket} ${credits(payout)} back on ${credits(stake)} staked.`;
}

const straight = (number: number): BetSpot => ({ kind: "straight", number });

/** Number grid in table order: three rows (3, 6 ... 36 on top) by twelve columns. */
const numberRows = [3, 2, 1].map((offset) =>
  Array.from({ length: 12 }, (_, col) => col * 3 + offset),
);

function cellColor(spot: BetSpot): string {
  if (spot.kind === "straight") {
    const color = pocketColor(spot.number);
    if (color === "red") return "bg-stamp text-paper";
    if (color === "black") return "bg-ink text-paper";
    return "bg-felt-deep text-paper";
  }
  if (spot.kind === "red") return "bg-stamp text-paper";
  if (spot.kind === "black") return "bg-ink text-paper";
  return "bg-felt text-paper";
}

interface SpotProps {
  spot: BetSpot;
  label: string;
  className?: string;
  /** Credits on this spot, if any. */
  stack?: number;
  /** The last spin, used to highlight what won. */
  result: SpinView | null;
  disabled: boolean;
  onPlace: (spot: BetSpot) => void;
}

function Spot({ spot, label, className = "", stack, result, disabled, onPlace }: SpotProps) {
  const won = result !== null && stack !== undefined && spotWins(spot, result.pocket);
  const hit = result !== null && spot.kind === "straight" && spot.number === result.pocket;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPlace(spot)}
      aria-label={`Bet on ${spotLabel(spot)}${stack ? `, ${credits(stack)} placed` : ""}`}
      className={`relative flex items-center justify-center rounded-[3px] text-sm font-semibold transition-[filter] hover:brightness-110 disabled:cursor-wait ${cellColor(spot)} ${
        hit || won
          ? "ring-brass z-10 ring-3"
          : cellColor(spot).includes("bg-felt")
            ? "ring-paper/25 ring-1 ring-inset"
            : ""
      } ${className}`}
    >
      <span className="figures">{label}</span>
      {stack ? (
        <span
          className={`figures absolute top-1/2 left-1/2 flex h-6 min-w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-dashed px-1 text-[11px] font-bold shadow ${
            won ? "border-felt-deep bg-brass text-felt-deep" : "border-brass bg-paper text-ink"
          }`}
        >
          {stack}
        </span>
      ) : null}
    </button>
  );
}

export function RouletteTable({
  initialBalance,
  initialRecent,
}: {
  initialBalance: number;
  initialRecent: SpinView[];
}) {
  const router = useRouter();
  const [chip, setChip] = useState<number>(5);
  const [placed, setPlaced] = useState<Placement[]>([]);
  const [balance, setBalance] = useState(initialBalance);
  const [recent, setRecent] = useState(initialRecent);
  const [result, setResult] = useState<SpinView | null>(null);
  const [rotation, setRotation] = useState(() =>
    initialRecent[0] ? rotationFor(initialRecent[0].pocket, 0, 0) : 0,
  );
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const revealTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => clearTimeout(revealTimer.current), []);

  const busy = pending || spinning;

  // Chips on the same spot add up; the table shows one stack per spot.
  const stacks = new Map<string, Placement>();
  for (const p of placed) {
    const key = spotKey(p.spot);
    stacks.set(key, { spot: p.spot, credits: (stacks.get(key)?.credits ?? 0) + p.credits });
  }
  const total = placed.reduce((sum, p) => sum + p.credits, 0);
  const affordable = total * 100 <= balance;

  function place(spot: BetSpot) {
    if (busy) return;
    const onSpot = stacks.get(spotKey(spot))?.credits ?? 0;
    if (onSpot + chip > MAX_SPOT) return setMessage("Each spot takes at most 500 credits.");
    if (total + chip > MAX_TOTAL) return setMessage("A spin can carry at most 1,000 credits.");
    setMessage(null);
    setResult(null);
    setPlaced((list) => [...list, { spot, credits: chip }]);
  }

  function spin() {
    if (busy || placed.length === 0) return;
    const bets = [...stacks.values()].map(({ spot, credits: c }) => ({ spot, credits: c }));
    const spinKey = crypto.randomUUID();
    setMessage(null);
    setResult(null);

    startTransition(async () => {
      const response = await spinRouletteAction({ spinKey, bets });
      if (!response.ok) {
        setMessage(response.error);
        return;
      }
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setSpinning(true);
      // On a phone the wheel is above the betting grid: bring it into view to watch the spin.
      const wheel = wheelRef.current?.getBoundingClientRect();
      if (wheel && (wheel.bottom < 0 || wheel.top > window.innerHeight * 0.5)) {
        wheelRef.current?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      }
      setRotation((current) => rotationFor(response.spin.pocket, current, reduceMotion ? 0 : 5));
      revealTimer.current = setTimeout(
        () => {
          setSpinning(false);
          setResult(response.spin);
          setBalance(response.balance);
          setRecent((list) => [response.spin, ...list].slice(0, 12));
          router.refresh(); // updates the balance in the header
        },
        reduceMotion ? 0 : SPIN_MS,
      );
    });
  }

  const spotProps = (spot: BetSpot) => ({
    spot,
    stack: stacks.get(spotKey(spot))?.credits,
    result,
    disabled: busy,
    onPlace: place,
  });

  const outside = (
    <>
      <Spot {...spotProps({ kind: "even" })} label="Even" />
      <Spot {...spotProps({ kind: "red" })} label="Red" />
      <Spot {...spotProps({ kind: "black" })} label="Black" />
      <Spot {...spotProps({ kind: "odd" })} label="Odd" />
    </>
  );

  return (
    <div className="space-y-4">
      <section
        aria-label="Roulette table"
        className="on-felt bg-felt text-paper ring-felt-deep overflow-hidden rounded-2xl ring-1"
      >
        <div className="grid items-start gap-6 px-3 pt-6 pb-4 sm:px-6 lg:grid-cols-[18rem_1fr]">
          <div ref={wheelRef} className="scroll-mt-4">
            <RouletteWheel rotation={rotation} spinning={spinning} />
            <div aria-live="polite" className="mt-4 min-h-14 text-center">
              {spinning ? (
                <p className="text-paper/80 text-sm">No more bets.</p>
              ) : result ? (
                <p className="font-display text-xl">{spinSummary(result)}</p>
              ) : null}
            </div>
          </div>

          {/* Wide screens: the classic horizontal layout. */}
          <div className="hidden gap-1 md:grid md:grid-cols-[2.5rem_repeat(12,minmax(0,1fr))_3.25rem] md:grid-rows-[repeat(3,2.75rem)_2.5rem_2.5rem]">
            <Spot {...spotProps(straight(0))} label="0" className="row-span-3" />
            {numberRows.map((row, r) => (
              <div key={r} className="contents">
                {row.map((n) => (
                  <Spot key={n} {...spotProps(straight(n))} label={String(n)} />
                ))}
                <Spot
                  {...spotProps({ kind: "column", column: (3 - r) as 1 | 2 | 3 })}
                  label="2:1"
                  className="text-xs"
                />
              </div>
            ))}
            <div />
            {([1, 2, 3] as const).map((dozen) => (
              <Spot
                key={dozen}
                {...spotProps({ kind: "dozen", dozen })}
                label={`${["1st", "2nd", "3rd"][dozen - 1]} 12`}
                className="col-span-4"
              />
            ))}
            <div />
            <div />
            <div className="col-span-12 grid grid-cols-4 gap-1">{outside}</div>
          </div>

          {/* Phones: the same table turned upright. */}
          <div className="grid gap-1 md:hidden">
            <Spot {...spotProps(straight(0))} label="0" className="h-10" />
            <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_4.5rem] gap-1">
              {Array.from({ length: 12 }, (_, row) => (
                <div key={row} className="contents">
                  {[1, 2, 3].map((offset) => {
                    const n = row * 3 + offset;
                    return (
                      <Spot
                        key={n}
                        {...spotProps(straight(n))}
                        label={String(n)}
                        className="h-10"
                      />
                    );
                  })}
                  {row % 4 === 0 ? (
                    <Spot
                      {...spotProps({ kind: "dozen", dozen: (row / 4 + 1) as 1 | 2 | 3 })}
                      label={`${["1st", "2nd", "3rd"][row / 4]} 12`}
                      className="row-span-4 text-xs"
                    />
                  ) : null}
                </div>
              ))}
              {([1, 2, 3] as const).map((column) => (
                <Spot
                  key={column}
                  {...spotProps({ kind: "column", column })}
                  label="2:1"
                  className="h-10 text-xs"
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1 [&>button]:h-10">{outside}</div>
          </div>
        </div>

        <div className="border-paper/15 bg-felt-deep/60 flex flex-wrap items-center gap-x-6 gap-y-4 border-t px-3 py-4 sm:px-6">
          <div className="flex items-center gap-2" role="radiogroup" aria-label="Chip value">
            {CHIPS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={chip === value}
                onClick={() => setChip(value)}
                className={`figures flex h-11 w-11 items-center justify-center rounded-full border-4 border-dashed text-sm font-semibold shadow transition-colors ${
                  chip === value
                    ? "border-felt-deep bg-brass text-felt-deep"
                    : "border-brass bg-felt text-paper hover:bg-felt-deep"
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          <p className="figures">
            <span className="font-display text-3xl">{total}</span>{" "}
            <span className="text-paper/75 text-sm">
              {total === 1 ? "credit" : "credits"} on the table
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || placed.length === 0 || !affordable}
              onClick={spin}
              className="bg-brass text-felt-deep hover:bg-brass/85 rounded-md px-6 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Spinning…" : result ? "Spin again" : "Spin"}
            </button>
            <button
              type="button"
              disabled={busy || placed.length === 0}
              onClick={() => {
                setPlaced((list) => list.slice(0, -1));
                setResult(null);
              }}
              className="border-paper/40 hover:bg-felt rounded-md border px-4 py-3 text-sm font-semibold disabled:opacity-40"
            >
              Undo
            </button>
            <button
              type="button"
              disabled={busy || placed.length === 0}
              onClick={() => {
                setPlaced([]);
                setResult(null);
                setMessage(null);
              }}
              className="text-paper/80 rounded-md px-3 py-3 text-sm underline-offset-4 hover:underline disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          {!affordable ? (
            <p className="text-brass w-full text-sm">That&apos;s more than your balance.</p>
          ) : null}
        </div>
      </section>

      {message ? (
        <p
          role="alert"
          className="border-stamp/40 bg-stamp/5 text-stamp rounded-md border px-3 py-2 text-sm"
        >
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="figures text-ink-soft text-sm">Balance {formatCredits(balance)} credits</p>
        {recent.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-ink-soft text-sm">Last numbers</span>
            <ol className="flex flex-wrap gap-1" aria-label="Last numbers, newest first">
              {recent.map((spin) => (
                <li
                  key={spin.spinId}
                  className={`figures flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${cellColor(straight(spin.pocket))}`}
                >
                  {spin.pocket}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <p className="text-ink-soft text-sm">
        Pick a chip value, then click the spots you want to bet on. Clicking a spot again adds
        another chip.
      </p>
    </div>
  );
}
