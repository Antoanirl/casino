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
  /** Wilds only: a line win this wild takes part in pays this many times over (whole number). */
  multiplier?: number;
}

export interface FreeSpinsRule {
  /** Scatter count anywhere on screen -> number of free spins awarded. */
  triggers: Readonly<Partial<Record<number, number>>>;
  /** Every free-spin win is multiplied by this (whole number). Free spins can't retrigger. */
  multiplier: number;
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
  /** Optional bonus: enough scatters award free spins at the same bet. */
  freeSpins?: FreeSpinsRule;
  /** Allowed total bets, in minor units (whole credits). */
  bets: readonly number[];
}

export interface LineWin {
  /** Index into config.paylines. */
  line: number;
  symbol: string;
  count: number;
  /** Hundredths of the total bet, after any wild and free-spin multipliers. */
  pays: number;
  /** Multiplier applied because a multiplying wild took part (1 if none). */
  wildMultiplier: number;
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
  /** Minor units returned to the player for this spin, including the stake (0 on a loss). */
  payout: number;
  /** Free spins this spin awards (always 0 during free spins: they can't retrigger). */
  freeSpinsAwarded: number;
}

/** A paid spin plus any free spins it triggered: one bet, one combined payout. */
export interface SlotRound {
  base: SlotOutcome;
  freeSpins: SlotOutcome[];
  /** Minor units returned for the whole round. */
  payout: number;
}

export class InvalidSlotBetError extends Error {
  constructor(config: SlotConfig) {
    super(`Choose a bet of ${config.bets.map((b) => b / 100).join(", ")} credits.`);
    this.name = "InvalidSlotBetError";
  }
}

function symbolOf(config: SlotConfig, id: string): SlotSymbol | undefined {
  return config.symbols.find((s) => s.id === id);
}

function kindOf(config: SlotConfig, id: string): SymbolKind {
  return symbolOf(config, id)?.kind ?? "normal";
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
  if (config.paylineNames && config.paylineNames.length !== config.paylines.length) {
    problems.push("payline names don't match the paylines");
  }
  for (const id of Object.keys(config.linePays)) {
    if (!ids.has(id)) problems.push(`paytable uses unknown symbol ${id}`);
  }
  for (const symbol of config.symbols) {
    if (
      symbol.multiplier !== undefined &&
      (symbol.kind !== "wild" || !Number.isInteger(symbol.multiplier) || symbol.multiplier < 1)
    ) {
      problems.push(`${symbol.id}: only wilds take a whole-number multiplier`);
    }
  }
  if (config.symbols.filter((s) => s.kind === "scatter").length > 1)
    problems.push("at most one scatter");
  if (
    (config.scatterPays || config.freeSpins) &&
    !config.symbols.some((s) => s.kind === "scatter")
  ) {
    problems.push("scatter pays or free spins need a scatter symbol");
  }
  if (
    config.freeSpins &&
    (!Number.isInteger(config.freeSpins.multiplier) || config.freeSpins.multiplier < 1)
  ) {
    problems.push("free-spin multiplier must be a whole number");
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
 * Best win on one line, reading left to right. A wild stands in for any normal symbol and,
 * if it has a multiplier, multiplies that win (once per line, using the largest multiplier in
 * the run). A scatter breaks the line. A run of wilds can also pay as wilds (unmultiplied),
 * whichever is worth more.
 */
export function evaluateLine(
  config: SlotConfig,
  symbols: readonly string[],
): { symbol: string; count: number; pays: number; wildMultiplier: number } | null {
  const target = symbols.find((id) => kindOf(config, id) !== "wild");
  let best: { symbol: string; count: number; pays: number; wildMultiplier: number } | null = null;

  if (target !== undefined && kindOf(config, target) === "normal") {
    let count = 0;
    let wildMultiplier = 1;
    while (count < symbols.length) {
      const id = symbols[count]!;
      if (id !== target && kindOf(config, id) !== "wild") break;
      if (id !== target)
        wildMultiplier = Math.max(wildMultiplier, symbolOf(config, id)?.multiplier ?? 1);
      count++;
    }
    const pays = config.linePays[target]?.[count];
    if (pays) best = { symbol: target, count, pays: pays * wildMultiplier, wildMultiplier };
  }

  const wild = symbols[0];
  if (wild !== undefined && kindOf(config, wild) === "wild") {
    let count = 0;
    while (count < symbols.length && symbols[count] === wild) count++;
    const pays = config.linePays[wild]?.[count];
    if (pays && (!best || pays > best.pays))
      best = { symbol: wild, count, pays, wildMultiplier: 1 };
  }
  return best;
}

function scatterCells(config: SlotConfig, window: string[][]): [number, number][] {
  const scatter = config.symbols.find((s) => s.kind === "scatter");
  const cells: [number, number][] = [];
  if (!scatter) return cells;
  window.forEach((column, reel) =>
    column.forEach((id, row) => {
      if (id === scatter.id) cells.push([reel, row]);
    }),
  );
  return cells;
}

/**
 * Settles one spin for the given reel stops and total bet (minor units).
 * `freeSpin` marks a spin played inside a bonus: its wins are multiplied and it awards nothing.
 */
export function evaluateSpin(
  config: SlotConfig,
  stops: readonly number[],
  bet: number,
  freeSpin = false,
): SlotOutcome {
  if (!config.bets.includes(bet)) throw new InvalidSlotBetError(config);
  if (stops.length !== config.reels.length) throw new RangeError("one stop per reel");
  stops.forEach((stop, r) => {
    if (!Number.isInteger(stop) || stop < 0 || stop >= config.reels[r]!.length) {
      throw new RangeError(`stop ${stop} is off reel ${r}`);
    }
  });

  const bonusMultiplier = freeSpin ? (config.freeSpins?.multiplier ?? 1) : 1;
  const window = windowAt(config, stops);
  const lineWins: LineWin[] = [];
  config.paylines.forEach((rows, line) => {
    const symbols = rows.map((row, reel) => window[reel]![row]!);
    const win = evaluateLine(config, symbols);
    if (win) {
      lineWins.push({
        line,
        ...win,
        pays: win.pays * bonusMultiplier,
        cells: rows.slice(0, win.count).map((row, reel) => [reel, row] as [number, number]),
      });
    }
  });

  const cells = scatterCells(config, window);
  let scatterWin: ScatterWin | null = null;
  const scatterPays = config.scatterPays?.[cells.length];
  if (scatterPays) {
    const scatter = config.symbols.find((s) => s.kind === "scatter")!;
    scatterWin = {
      symbol: scatter.id,
      count: cells.length,
      pays: scatterPays * bonusMultiplier,
      cells,
    };
  }

  const freeSpinsAwarded = freeSpin ? 0 : (config.freeSpins?.triggers[cells.length] ?? 0);
  const pays = lineWins.reduce((sum, w) => sum + w.pays, 0) + (scatterWin?.pays ?? 0);
  return {
    stops: [...stops],
    window,
    lineWins,
    scatterWin,
    pays,
    bet,
    payout: (bet * pays) / 100,
    freeSpinsAwarded,
  };
}

/**
 * Settles a whole round: the paid spin (stopsList[0]) and exactly as many free spins as it
 * awarded (stopsList[1..]). The server draws the extra stops only after seeing the award.
 */
export function settleRound(
  config: SlotConfig,
  stopsList: readonly (readonly number[])[],
  bet: number,
): SlotRound {
  const [first, ...rest] = stopsList;
  if (!first) throw new RangeError("a round needs at least one spin");
  const base = evaluateSpin(config, first, bet);
  if (rest.length !== base.freeSpinsAwarded) {
    throw new RangeError(`expected ${base.freeSpinsAwarded} free spins, got ${rest.length}`);
  }
  const freeSpins = rest.map((stops) => evaluateSpin(config, stops, bet, true));
  const payout = base.payout + freeSpins.reduce((sum, s) => sum + s.payout, 0);
  return { base, freeSpins, payout };
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

/** Probability of seeing exactly k scatters on screen, for k = 0, 1, 2, ... */
export function scatterDistribution(config: SlotConfig): number[] {
  const scatter = config.symbols.find((s) => s.kind === "scatter");
  if (!scatter) return [1];
  let distribution = [1];
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
  return distribution;
}

/** Expected pays (hundredths of the bet) of one ordinary paid spin, ignoring any bonus. */
function expectedSpinPays(config: SlotConfig): number {
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

  const scatterExpectation = scatterDistribution(config).reduce(
    (sum, p, count) => sum + p * (config.scatterPays?.[count] ?? 0),
    0,
  );
  return config.paylines.length * lineExpectation + scatterExpectation;
}

/**
 * Exact theoretical return to player, as a fraction of the bet (0.96 = 96%).
 *
 * Every stop is equally likely, so on any single row each reel shows each symbol with the
 * strip's frequency, independently of the other reels. Every payline therefore has the same
 * expected pay, computed by enumerating symbol combinations weighted by probability. Scatter
 * pays use the distribution of scatter counts in each reel's window, combined across reels.
 *
 * Free spins: a free spin is an ordinary spin with its wins multiplied and no retrigger, so
 * it is worth multiplier x (one spin's expected pays). The bonus adds, for each scatter count
 * k, P(k) x spins awarded for k x that value.
 */
export function theoreticalRtp(config: SlotConfig): number {
  const spin = expectedSpinPays(config);
  let bonus = 0;
  if (config.freeSpins) {
    const { triggers, multiplier } = config.freeSpins;
    scatterDistribution(config).forEach((p, count) => {
      bonus += p * (triggers[count] ?? 0) * multiplier * spin;
    });
  }
  return (spin + bonus) / 100;
}

/** Probability that a paid spin starts free spins. */
export function freeSpinsChance(config: SlotConfig): number {
  if (!config.freeSpins) return 0;
  return scatterDistribution(config).reduce(
    (sum, p, count) => sum + ((config.freeSpins!.triggers[count] ?? 0) > 0 ? p : 0),
    0,
  );
}
