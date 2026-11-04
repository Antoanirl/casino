import { games } from "@/lib/games";

/**
 * Pure maths for the dashboard statistics. The database query (stats.ts) returns one row of
 * totals per game; this turns them into the figures the dashboard shows. Amounts are minor units.
 */

/** Totals for one game, straight from the round tables. */
export interface RoundTotals {
  /** Ledger game name: "blackjack", "roulette", "slots:classic"... */
  game: string;
  rounds: number;
  /** Everything staked, doubles and splits included. */
  staked: number;
  /** Everything paid back, stakes included (a push returns the stake). */
  returned: number;
  /** Rounds that paid back more than they staked. */
  roundsWon: number;
  /** Largest profit in a single round (payout minus stake), 0 if no round made a profit. */
  biggestWin: number;
}

export interface GameStats extends RoundTotals {
  name: string;
  /** returned - staked: what the player is up (positive) or down (negative). */
  net: number;
  /** returned / staked, e.g. 0.96; null before the first round. */
  returnRate: number | null;
  /** roundsWon / rounds; null before the first round. */
  winRate: number | null;
}

export interface StatsSummary {
  /** Every game in the catalogue, in catalogue order, including ones not played yet. */
  games: GameStats[];
  /** All games together. */
  total: GameStats;
}

/** Ledger game names for every game in the catalogue, in catalogue order. */
export const ledgerGames: readonly { game: string; name: string }[] = games.map((g) => ({
  game: g.category === "slots" ? `slots:${g.slug}` : g.slug,
  name: g.name,
}));

function withRates(totals: RoundTotals, name: string): GameStats {
  return {
    ...totals,
    name,
    net: totals.returned - totals.staked,
    returnRate: totals.staked > 0 ? totals.returned / totals.staked : null,
    winRate: totals.rounds > 0 ? totals.roundsWon / totals.rounds : null,
  };
}

const empty = (game: string): RoundTotals => ({
  game,
  rounds: 0,
  staked: 0,
  returned: 0,
  roundsWon: 0,
  biggestWin: 0,
});

export function summarise(rows: readonly RoundTotals[]): StatsSummary {
  const byGame = new Map(rows.map((row) => [row.game, row]));
  const gameStats = ledgerGames.map(({ game, name }) =>
    withRates(byGame.get(game) ?? empty(game), name),
  );

  const total = gameStats.reduce<RoundTotals>(
    (sum, g) => ({
      game: "all",
      rounds: sum.rounds + g.rounds,
      staked: sum.staked + g.staked,
      returned: sum.returned + g.returned,
      roundsWon: sum.roundsWon + g.roundsWon,
      biggestWin: Math.max(sum.biggestWin, g.biggestWin),
    }),
    empty("all"),
  );
  return { games: gameStats, total: withRates(total, "All games") };
}

/** "96.1%", or an em dash before there is anything to divide. */
export function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${(rate * 100).toFixed(1)}%`;
}
