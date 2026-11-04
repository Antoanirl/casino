import type { Metadata } from "next";
import Link from "next/link";
import { AccountSummary } from "@/components/dashboard/account-summary";
import { BalanceChart } from "@/components/dashboard/balance-chart";
import { GameStatsTable } from "@/components/dashboard/game-stats-table";
import { HistoryFilters, HistoryPager } from "@/components/dashboard/history-controls";
import { LedgerPage } from "@/components/ledger/ledger-page";
import { defaultFilters, gameFilters, kindFilters, parseLedgerFilters } from "@/lib/ledger-filters";
import { STARTING_BALANCE, formatCredits } from "@/lib/money";
import { requireUser } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { balanceHistory, getPlayerStats, ledgerHistory } from "@/server/stats";

export const metadata: Metadata = { title: "Your ledger" };

interface DashboardProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const user = await requireUser();
  const filters = parseLedgerFilters(await searchParams);
  const db = getDb();
  const [stats, history, page] = await Promise.all([
    getPlayerStats(db, user.id),
    balanceHistory(db, user.id),
    ledgerHistory(db, user.id, filters),
  ]);

  const filtered = filters.game !== defaultFilters.game || filters.kind !== defaultFilters.kind;
  const describe = [
    filters.kind !== "all" ? kindFilters.find((k) => k.value === filters.kind)?.label : "Entries",
    filters.game !== "all"
      ? `for ${gameFilters.find((g) => g.value === filters.game)?.label}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const from = (page.page - 1) * page.pageSize + 1;
  const to = from + page.rows.length - 1;

  return (
    <div className="space-y-14">
      <header className="space-y-3">
        <h1 className="font-display text-5xl">Your ledger</h1>
        <p className="text-ink-soft max-w-2xl">
          How every game has gone for you, worked out from the rounds you played, and every credit
          that has moved in or out of your account.
        </p>
      </header>

      <div className="space-y-3">
        <AccountSummary total={stats.total} balance={stats.balance} />
        {stats.inPlay > 0 ? (
          <p className="text-ink-soft text-sm">
            {formatCredits(stats.inPlay)} credits are on an unfinished{" "}
            <Link href="/blackjack" className="text-ink underline underline-offset-4">
              blackjack hand
            </Link>
            ; they count once the hand is settled.
          </p>
        ) : null}
      </div>

      <section aria-labelledby="balance-heading" className="space-y-4">
        <h2 id="balance-heading" className="font-display text-3xl">
          Balance
        </h2>
        <BalanceChart
          points={history.points}
          complete={history.complete}
          reference={STARTING_BALANCE}
          referenceLabel={`Starting balance, ${formatCredits(STARTING_BALANCE)}`}
        />
      </section>

      <section aria-labelledby="games-heading" className="space-y-4">
        <h2 id="games-heading" className="font-display text-3xl">
          By game
        </h2>
        <GameStatsTable games={stats.games} total={stats.total} />
        <p className="text-ink-soft max-w-2xl text-xs">
          Return is what came back as a share of what you staked; over many rounds it drifts towards
          each game&apos;s published figure. A round counts as won when it paid back more than its
          stake, so a blackjack push isn&apos;t a win.
        </p>
      </section>

      <section aria-labelledby="history" className="scroll-mt-6 space-y-6">
        <h2 id="history" className="font-display text-3xl">
          Every entry
        </h2>
        <div className="grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
          <HistoryFilters filters={filters} />
          <div className="space-y-4">
            <LedgerPage
              title={filtered ? describe : `${user.username}'s ledger`}
              rows={[...page.rows].reverse()}
              showBalance={!filtered && page.page === 1}
              emptyMessage={
                filtered
                  ? "No entries match these filters."
                  : "No entries yet. Your first bet will be written here."
              }
              caption={
                page.total === 0
                  ? undefined
                  : page.pageCount === 1
                    ? `${page.total} ${page.total === 1 ? "entry" : "entries"}, newest at the bottom.`
                    : `Entries ${from.toLocaleString("en-US")} to ${to.toLocaleString("en-US")} of ${page.total.toLocaleString("en-US")}, newest at the bottom.`
              }
            />
            <HistoryPager filters={filters} page={page.page} pageCount={page.pageCount} />
          </div>
        </div>
      </section>
    </div>
  );
}
