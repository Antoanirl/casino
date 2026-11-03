/**
 * European roulette rules. Pure and deterministic: the server draws the pocket with the
 * secure RNG and passes it in, so every payout rule can be tested against every pocket.
 * Money is in minor units (100 = 1 credit), like the ledger.
 */

export const POCKET_COUNT = 37; // 0..36, single zero

/** Pockets in the order they sit around a European wheel, starting at 0. */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type PocketColor = "red" | "black" | "green";

export function pocketColor(pocket: number): PocketColor {
  if (pocket === 0) return "green";
  return RED_NUMBERS.has(pocket) ? "red" : "black";
}

export const LIMITS = {
  /** Per spot: 1 to 500 credits, whole credits only. */
  minBet: 100,
  maxBet: 50_000,
  betStep: 100,
  /** All spots together in one spin: 1,000 credits. */
  maxTotal: 100_000,
} as const;

export type BetSpot =
  | { kind: "straight"; number: number }
  | { kind: "red" }
  | { kind: "black" }
  | { kind: "odd" }
  | { kind: "even" }
  | { kind: "dozen"; dozen: 1 | 2 | 3 }
  | { kind: "column"; column: 1 | 2 | 3 };

export interface Bet {
  spot: BetSpot;
  /** Minor units. */
  amount: number;
}

export interface BetResult {
  bet: Bet;
  won: boolean;
  /** Total returned for this bet, including the stake (0 on a loss). */
  payout: number;
}

export interface SpinResult {
  pocket: number;
  color: PocketColor;
  results: BetResult[];
  totalStake: number;
  totalPayout: number;
}

export class InvalidBetsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBetsError";
  }
}

/** Winnings per unit staked, not counting the stake itself (35 means "35 to 1"). */
export function payoutRatio(spot: BetSpot): number {
  switch (spot.kind) {
    case "straight":
      return 35;
    case "dozen":
    case "column":
      return 2;
    default:
      return 1;
  }
}

/** Whether a spot wins on a pocket. Every bet except a straight-up 0 loses on zero. */
export function spotWins(spot: BetSpot, pocket: number): boolean {
  if (spot.kind === "straight") return spot.number === pocket;
  if (pocket === 0) return false;
  switch (spot.kind) {
    case "red":
      return pocketColor(pocket) === "red";
    case "black":
      return pocketColor(pocket) === "black";
    case "odd":
      return pocket % 2 === 1;
    case "even":
      return pocket % 2 === 0;
    case "dozen":
      return Math.ceil(pocket / 12) === spot.dozen;
    case "column":
      return ((pocket - 1) % 3) + 1 === spot.column;
  }
}

/** A stable name for a spot, used to merge chips placed on the same spot and as a React key. */
export function spotKey(spot: BetSpot): string {
  switch (spot.kind) {
    case "straight":
      return `straight:${spot.number}`;
    case "dozen":
      return `dozen:${spot.dozen}`;
    case "column":
      return `column:${spot.column}`;
    default:
      return spot.kind;
  }
}

function validSpot(spot: BetSpot): boolean {
  switch (spot.kind) {
    case "straight":
      return Number.isInteger(spot.number) && spot.number >= 0 && spot.number < POCKET_COUNT;
    case "dozen":
      return [1, 2, 3].includes(spot.dozen);
    case "column":
      return [1, 2, 3].includes(spot.column);
    default:
      return ["red", "black", "odd", "even"].includes(spot.kind);
  }
}

/**
 * Checks the table limits and merges chips on the same spot into one bet.
 * Throws InvalidBetsError with a message the player can act on.
 */
export function normalizeBets(bets: readonly Bet[]): Bet[] {
  if (bets.length === 0) throw new InvalidBetsError("Place at least one bet.");

  const merged = new Map<string, Bet>();
  for (const bet of bets) {
    if (!validSpot(bet.spot)) throw new InvalidBetsError("That spot isn't on this table.");
    if (!Number.isSafeInteger(bet.amount) || bet.amount <= 0 || bet.amount % LIMITS.betStep !== 0) {
      throw new InvalidBetsError("Bets are whole credits.");
    }
    const key = spotKey(bet.spot);
    const existing = merged.get(key);
    merged.set(key, { spot: bet.spot, amount: (existing?.amount ?? 0) + bet.amount });
  }

  const result = [...merged.values()];
  for (const bet of result) {
    if (bet.amount < LIMITS.minBet || bet.amount > LIMITS.maxBet) {
      throw new InvalidBetsError("Each spot takes 1 to 500 credits.");
    }
  }
  const total = result.reduce((sum, bet) => sum + bet.amount, 0);
  if (total > LIMITS.maxTotal) {
    throw new InvalidBetsError("A spin can carry at most 1,000 credits in total.");
  }
  return result;
}

/** Settles every bet against the pocket the ball landed in. */
export function settleSpin(bets: readonly Bet[], pocket: number): SpinResult {
  if (!Number.isInteger(pocket) || pocket < 0 || pocket >= POCKET_COUNT) {
    throw new RangeError(`Not a pocket: ${pocket}`);
  }
  const normalized = normalizeBets(bets);
  const results = normalized.map((bet) => {
    const won = spotWins(bet.spot, pocket);
    return { bet, won, payout: won ? bet.amount * (payoutRatio(bet.spot) + 1) : 0 };
  });
  return {
    pocket,
    color: pocketColor(pocket),
    results,
    totalStake: results.reduce((sum, r) => sum + r.bet.amount, 0),
    totalPayout: results.reduce((sum, r) => sum + r.payout, 0),
  };
}
