/**
 * Shared slot engine. A slot game is pure data (a SlotConfig); this file knows nothing about
 * fruit, gems or maps. Pure and deterministic: the server picks the reel stops with the
 * secure RNG and passes them in, so every rule can be tested with chosen stops.
 *
 * Pays are written in hundredths of the TOTAL bet ("pays: 500" means 5x the bet), so a
 * whole-credit bet always produces a whole number of minor units.
 */

export type SymbolKind = "normal" | "wild" | "scatter";

export interface SlotSymbol {
  id: string;
  name: string;
  kind: SymbolKind;
}

export interface SlotConfig {
  slug: string;
  name: string;
  /** Visible rows per reel. */
  rows: number;
  symbols: readonly SlotSymbol[];
  /** One strip per reel, top to bottom; a stop shows strip[stop], strip[stop + 1], ... wrapping. */
  reels: readonly (readonly string[])[];
  /** Each payline gives the row it uses on every reel, left to right. */
  paylines: readonly (readonly number[])[];
  /** Optional plain-language names for the paylines, e.g. "top row". */
  paylineNames?: readonly string[];
  /** symbol id -> count of matching symbols from the left -> pays (hundredths of total bet). */
  linePays: Readonly<Record<string, Readonly<Partial<Record<number, number>>>>>;
  /** scatter count anywhere on screen -> pays (hundredths of total bet). */
  scatterPays?: Readonly<Partial<Record<number, number>>>;
  /** Allowed total bets, in minor units (whole credits). */
  bets: readonly number[];
}

export interface LineWin {
  /** Index into config.paylines. */
  line: number;
  symbol: string;
  count: number;
  /** Hundredths of the total bet. */
  pays: number;
  /** [reel, row] of each symbol that formed the win. */
  cells: [number, number][];
}

export interface ScatterWin {
  symbol: string;
  count: number;
  pays: number;
  cells: [number, number][];
}

export interface SlotOutcome {
  stops: number[];
  /** window[reel][row]: the symbol ids on screen. */
  window: string[][];
  lineWins: LineWin[];
  scatterWin: ScatterWin | null;
  /** Total pays in hundredths of the bet. */
  pays: number;
  bet: number;
  /** Minor units returned to the player, including the stake (0 on a loss). */
  payout: number;
}

export class InvalidSlotBetError extends Error {
  constructor(config: SlotConfig) {
    super(`Choose a bet of ${config.bets.map((b) => b / 100).join(", ")} credits.`);
    this.name = "InvalidSlotBetError";
  }
}

function kindOf(config: SlotConfig, id: string): SymbolKind {
  return config.symbols.find((s) => s.id === id)?.kind ?? "normal";
}

/** Checks a config is internally consistent. Run in tests for every game. */
export function validateConfig(config: SlotConfig): string[] {
  const problems: string[] = [];
  const ids = new Set(config.symbols.map((s) => s.id));
  if (ids.size !== config.symbols.length) problems.push("duplicate symbol ids");
  config.reels.forEach((strip, r) => {
    if (strip.length < config.rows) problems.push(`reel ${r} is shorter than the window`);
    for (const id of strip) if (!ids.has(id)) problems.push(`reel ${r} uses unknown symbol ${id}`);
  });
  config.paylines.forEach((line, i) => {
    if (line.length !== config.reels.length) problems.push(`payline ${i} has the wrong length`);
    if (line.some((row) => row < 0 || row >= config.rows))
      problems.push(`payline ${i} leaves the window`);
  });
  for (const id of Object.keys(config.linePays)) {
    if (!ids.has(id)) problems.push(`paytable uses unknown symbol ${id}`);
  }
  if (config.bets.some((bet) => bet <= 0 || bet % 100 !== 0))
    problems.push("bets must be whole credits");
  const allPays = [
    ...Object.values(config.linePays).flatMap((p) => Object.values(p)),
    ...Object.values(config.scatterPays ?? {}),
  ];
  if (allPays.some((p) => p === undefined || !Number.isInteger(p) || p <= 0)) {
    problems.push("pays must be positive whole hundredths");
  }
  return problems;
}

export function windowAt(config: SlotConfig, stops: readonly number[]): string[][] {
  return config.reels.map((strip, r) => {
    const stop = stops[r]!;
    return Array.from({ length: config.rows }, (_, row) => strip[(stop + row) % strip.length]!);
  });
}

/**
 * Best win on one line, reading left to right. A wild stands in for any normal symbol;
 * a scatter breaks the line. A run of wilds can also pay as wilds, whichever is worth more.
 */
export function evaluateLine(
  config: SlotConfig,
  symbols: readonly string[],
): { symbol: string; count: number; pays: number } | null {
  const target = symbols.find((id) => kindOf(config, id) !== "wild");
  let best: { symbol: string; count: number; pays: number } | null = null;

  if (target !== undefined && kindOf(config, target) === "normal") {
    let count = 0;
    while (count < symbols.length) {
      const id = symbols[count]!;
      if (id !== target && kindOf(config, id) !== "wild") break;
      count++;
    }
    const pays = config.linePays[target]?.[count];
    if (pays) best = { symbol: target, count, pays };
  }

  const wild = symbols[0];
  if (wild !== undefined && kindOf(config, wild) === "wild") {
    let count = 0;
    while (count < symbols.length && symbols[count] === wild) count++;
    const pays = config.linePays[wild]?.[count];
    if (pays && (!best || pays > best.pays)) best = { symbol: wild, count, pays };
  }
  return best;
}

/** Settles a spin for the given reel stops and total bet (minor units). */
export function evaluateSpin(
  config: SlotConfig,
  stops: readonly number[],
  bet: number,
): SlotOutcome {
  if (!config.bets.includes(bet)) throw new InvalidSlotBetError(config);
  if (stops.length !== config.reels.length) throw new RangeError("one stop per reel");
  stops.forEach((stop, r) => {
    if (!Number.isInteger(stop) || stop < 0 || stop >= config.reels[r]!.length) {
      throw new RangeError(`stop ${stop} is off reel ${r}`);
    }
  });

  const window = windowAt(config, stops);
  const lineWins: LineWin[] = [];
  config.paylines.forEach((rows, line) => {
    const symbols = rows.map((row, reel) => window[reel]![row]!);
    const win = evaluateLine(config, symbols);
    if (win) {
      lineWins.push({
        line,
        ...win,
        cells: rows.slice(0, win.count).map((row, reel) => [reel, row] as [number, number]),
      });
    }
  });

  let scatterWin: ScatterWin | null = null;
  const scatter = config.symbols.find((s) => s.kind === "scatter");
  if (scatter && config.scatterPays) {
    const cells: [number, number][] = [];
    window.forEach((column, reel) =>
      column.forEach((id, row) => {
        if (id === scatter.id) cells.push([reel, row]);
      }),
    );
    const pays = config.scatterPays[cells.length];
    if (pays) scatterWin = { symbol: scatter.id, count: cells.length, pays, cells };
  }

  const pays = lineWins.reduce((sum, w) => sum + w.pays, 0) + (scatterWin?.pays ?? 0);
  return {
    stops: [...stops],
    window,
    lineWins,
    scatterWin,
    pays,
    bet,
    payout: (bet * pays) / 100,
  };
}

// ---------------------------------------------------------------------------
// Exact return to player
// ---------------------------------------------------------------------------

/** How often each symbol appears on a strip, as a probability. */
function frequencies(strip: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of strip) counts.set(id, (counts.get(id) ?? 0) + 1);
  return new Map([...counts].map(([id, n]) => [id, n / strip.length]));
}

/**
 * Exact theoretical return to player, as a fraction of the bet (0.96 = 96%).
 *
 * Every stop is equally likely, so on each reel any single row shows each symbol with the
 * strip's frequency, independently of the other reels. That makes every payline's expected
 * pay identical, computed by enumerating symbol combinations weighted by probability. Scatter
 * pays use the distribution of scatter counts per reel window, combined across reels.
 */
export function theoreticalRtp(config: SlotConfig): number {
  const perReel = config.reels.map(frequencies);

  let lineExpectation = 0;
  const walk = (reel: number, symbols: string[], probability: number) => {
    if (reel === perReel.length) {
      lineExpectation += probability * (evaluateLine(config, symbols)?.pays ?? 0);
      return;
    }
    for (const [id, p] of perReel[reel]!) walk(reel + 1, [...symbols, id], probability * p);
  };
  walk(0, [], 1);

  let scatterExpectation = 0;
  const scatter = config.symbols.find((s) => s.kind === "scatter");
  if (scatter && config.scatterPays) {
    let distribution = [1]; // P(total scatters = index)
    for (const strip of config.reels) {
      const perStop = new Map<number, number>();
      for (let stop = 0; stop < strip.length; stop++) {
        let n = 0;
        for (let row = 0; row < config.rows; row++) {
          if (strip[(stop + row) % strip.length] === scatter.id) n++;
        }
        perStop.set(n, (perStop.get(n) ?? 0) + 1 / strip.length);
      }
      const next = new Array<number>(distribution.length + config.rows).fill(0);
      distribution.forEach((p, total) => {
        for (const [n, q] of perStop) next[total + n]! += p * q;
      });
      distribution = next;
    }
    distribution.forEach((p, count) => {
      scatterExpectation += p * (config.scatterPays![count] ?? 0);
    });
  }

  return (config.paylines.length * lineExpectation + scatterExpectation) / 100;
}
