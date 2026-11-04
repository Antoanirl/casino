import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { ledgerGameMatch, ledgerTypesFor, type LedgerFilters } from "@/lib/ledger-filters";
import type { LedgerEntryKind, LedgerRow } from "@/lib/ledger-display";
import { getBalance } from "@/server/ledger";
import { summarise, type RoundTotals, type StatsSummary } from "@/server/stats/summary";

/**
 * Read-only queries behind the dashboard. Nothing here changes a balance.
 *
 * Per-game statistics come from the round tables (one row per blackjack round, roulette spin or
 * slot round), because a round's stake and payout are what a player thinks of as "a game";
 * the ledger holds the same money split into separate bet and payout entries.
 */

export interface PlayerStats extends StatsSummary {
  balance: number;
  /** Stake tied up in an unfinished blackjack hand (not yet counted in the statistics). */
  inPlay: number;
}

interface TotalsRow {
  game: string;
  rounds: bigint | number;
  staked: bigint | number | null;
  returned: bigint | number | null;
  won: bigint | number;
  best: bigint | number | null;
}

export async function getPlayerStats(db: PrismaClient, userId: string): Promise<PlayerStats> {
  const [rows, balance, active] = await Promise.all([
    db.$queryRaw<TotalsRow[]>`
      SELECT game,
             COUNT(*) AS rounds,
             SUM(stake) AS staked,
             SUM(payout) AS returned,
             COUNT(*) FILTER (WHERE payout > stake) AS won,
             GREATEST(MAX(payout - stake), 0) AS best
      FROM (
        SELECT 'blackjack' AS game, "totalStake" AS stake, "totalPayout" AS payout
          FROM "BlackjackRound"
          WHERE "userId" = ${userId} AND status = 'SETTLED' AND "totalPayout" IS NOT NULL
        UNION ALL
        SELECT 'roulette', "totalStake", "totalPayout"
          FROM "RouletteSpin" WHERE "userId" = ${userId}
        UNION ALL
        SELECT 'slots:' || game, bet, "totalPayout"
          FROM "SlotSpin" WHERE "userId" = ${userId}
      ) AS rounds
      GROUP BY game`,
    getBalance(db, userId),
    db.blackjackRound.aggregate({
      where: { userId, status: "ACTIVE" },
      _sum: { totalStake: true },
    }),
  ]);

  const totals: RoundTotals[] = rows.map((row) => ({
    game: row.game,
    rounds: Number(row.rounds),
    staked: Number(row.staked ?? 0),
    returned: Number(row.returned ?? 0),
    roundsWon: Number(row.won),
    biggestWin: Number(row.best ?? 0),
  }));
  return { ...summarise(totals), balance, inPlay: active._sum.totalStake ?? 0 };
}

export interface BalancePoint {
  at: Date;
  /** Minor units, after this entry. */
  balance: number;
}

/**
 * The balance after each of the player's latest ledger entries, oldest first.
 * `complete` is false when older entries were left out.
 */
export async function balanceHistory(
  db: PrismaClient,
  userId: string,
  take = 200,
): Promise<{ points: BalancePoint[]; complete: boolean }> {
  const entries = await db.ledgerEntry.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    select: { balanceAfter: true, createdAt: true },
  });
  const complete = entries.length <= take;
  return {
    points: entries
      .slice(0, take)
      .reverse()
      .map((e) => ({ at: e.createdAt, balance: e.balanceAfter })),
    complete,
  };
}

export interface LedgerHistoryPage {
  /** Newest first. */
  rows: LedgerRow[];
  /** Entries matching the filters, across all pages. */
  total: number;
  /** The page actually returned (requests past the end get the last page). */
  page: number;
  pageCount: number;
  pageSize: number;
}

export function ledgerWhere(userId: string, filters: LedgerFilters): Prisma.LedgerEntryWhereInput {
  const game = ledgerGameMatch(filters.game);
  const types = ledgerTypesFor(filters.kind);
  return {
    userId,
    ...(game ? { game } : {}),
    ...(types ? { type: { in: types as LedgerEntryKind[] } } : {}),
  };
}

/** One page of the player's ledger, filtered by game and kind of entry. */
export async function ledgerHistory(
  db: PrismaClient,
  userId: string,
  filters: LedgerFilters,
  pageSize = 25,
): Promise<LedgerHistoryPage> {
  const where = ledgerWhere(userId, filters);
  const total = await db.ledgerEntry.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, pageCount);
  const rows = await db.ledgerEntry.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: { id: true, type: true, amount: true, balanceAfter: true, game: true, createdAt: true },
  });
  return { rows, total, page, pageCount, pageSize };
}
