import Link from "next/link";
import { ledgerFilterHref } from "@/lib/ledger-filters";
import { formatSignedCredits } from "@/lib/ledger-display";
import { formatCredits } from "@/lib/money";
import { formatRate, type GameStats } from "@/server/stats";

function slugOf(game: string): string {
  return game.startsWith("slots:") ? game.slice("slots:".length) : game;
}

function Figures({ stats }: { stats: GameStats }) {
  if (stats.rounds === 0) {
    return (
      <td colSpan={6} className="text-ink-soft py-2.5 pr-2 text-right sm:text-left">
        Not played yet
      </td>
    );
  }
  return (
    <>
      <td className="py-2.5 pr-3 text-right">{stats.rounds.toLocaleString("en-US")}</td>
      <td className="hidden py-2.5 pr-3 text-right sm:table-cell">{formatCredits(stats.staked)}</td>
      <td className={`py-2.5 pr-3 text-right ${stats.net < 0 ? "text-stamp" : ""}`}>
        {formatSignedCredits(stats.net)}
      </td>
      <td className="py-2.5 pr-3 text-right">{formatRate(stats.returnRate)}</td>
      <td className="hidden py-2.5 pr-3 text-right md:table-cell">{formatRate(stats.winRate)}</td>
      <td className="hidden py-2.5 pr-2 text-right sm:table-cell">
        {stats.biggestWin > 0 ? formatCredits(stats.biggestWin) : "—"}
      </td>
    </>
  );
}

/** One row per game, totalled under a double rule as an accountant would. */
export function GameStatsTable({ games, total }: { games: GameStats[]; total: GameStats }) {
  const header = "text-ink-soft py-2 pr-3 text-right text-xs font-normal";
  return (
    <table className="figures w-full text-sm">
      <caption className="sr-only">Results by game</caption>
      <thead>
        <tr className="border-ink/70 border-b-2">
          <th scope="col" className="text-ink-soft py-2 pr-3 pl-2 text-left text-xs font-normal">
            Game
          </th>
          <th scope="col" className={header}>
            Rounds
          </th>
          <th scope="col" className={`${header} hidden sm:table-cell`}>
            Staked
          </th>
          <th scope="col" className={header}>
            Net
          </th>
          <th scope="col" className={header}>
            Return
          </th>
          <th scope="col" className={`${header} hidden md:table-cell`}>
            Rounds won
          </th>
          <th scope="col" className={`${header} hidden pr-2 sm:table-cell`}>
            Biggest win
          </th>
        </tr>
      </thead>
      <tbody>
        {games.map((stats) => (
          <tr key={stats.game} className="border-rule border-b">
            <th scope="row" className="py-2.5 pr-3 pl-2 text-left font-normal">
              <Link
                href={`${ledgerFilterHref({ game: slugOf(stats.game) })}#history`}
                className="underline-offset-4 hover:underline"
              >
                {stats.name}
              </Link>
            </th>
            <Figures stats={stats} />
          </tr>
        ))}
      </tbody>
      <tfoot>
        {/* Double rule above the total: the bookkeeper's sign that a column is summed. */}
        <tr className="border-ink/70 border-t-[3px] border-double font-semibold">
          <th scope="row" className="py-2.5 pr-3 pl-2 text-left">
            {total.name}
          </th>
          <Figures stats={total} />
        </tr>
      </tfoot>
    </table>
  );
}
