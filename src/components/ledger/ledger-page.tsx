import { formatCredits } from "@/lib/money";
import {
  entryLabel,
  formatEntryDate,
  formatSignedCredits,
  type LedgerRow,
} from "@/lib/ledger-display";

interface LedgerPageProps {
  title: string;
  /** Rows in chronological order (oldest first), like a real ledger page. */
  rows: LedgerRow[];
  caption?: React.ReactNode;
}

/**
 * A page from an accounting ledger: ruled lines, a red margin rule, negative amounts in red.
 * Used on the homepage (sample or the player's real entries) and later on the dashboard.
 */
export function LedgerPage({ title, rows, caption }: LedgerPageProps) {
  const balance = rows.at(-1)?.balanceAfter;

  return (
    <figure className="border-rule bg-sheet relative rounded-sm border shadow-[0_1px_0_var(--color-rule),0_18px_40px_-24px_rgb(29_43_58/0.45)]">
      <div className="border-ink/70 flex items-baseline justify-between gap-4 border-b-2 px-4 pt-5 pb-3 sm:px-6">
        <h2 className="font-display text-2xl">{title}</h2>
        <span className="text-ink-soft text-xs">Credits</span>
      </div>

      <div className="relative">
        {/* Red double margin rule, as printed on ledger paper. */}
        <div
          aria-hidden="true"
          className="border-stamp/45 pointer-events-none absolute inset-y-0 left-[5.5rem] w-[5px] border-x sm:left-[6.5rem]"
        />
        <table className="figures w-full table-fixed text-sm">
          <thead className="sr-only sm:not-sr-only">
            <tr className="border-rule text-ink-soft border-b text-left text-xs">
              <th scope="col" className="w-[5.5rem] py-2 pl-4 font-normal sm:w-[6.5rem] sm:pl-6">
                When
              </th>
              <th scope="col" className="py-2 pl-4 font-normal">
                Entry
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-normal">
                Amount
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-normal sm:pr-6">
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="border-rule border-b">
                <td colSpan={4} className="text-ink-soft py-8 pr-4 pl-[7rem] sm:pl-[8rem]">
                  No entries yet. Your first bet will be written here.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id} className="border-rule border-b">
                <td className="text-ink-soft w-[5.5rem] py-2.5 pl-4 text-xs whitespace-nowrap sm:w-[6.5rem] sm:pl-6">
                  {formatEntryDate(row.createdAt)}
                </td>
                <td className="py-2.5 pl-4">{entryLabel(row)}</td>
                <td
                  className={`py-2.5 pr-3 text-right whitespace-nowrap ${row.amount < 0 ? "text-stamp" : ""}`}
                >
                  {formatSignedCredits(row.amount)}
                </td>
                <td className="py-2.5 pr-4 text-right whitespace-nowrap sm:pr-6">
                  {formatCredits(row.balanceAfter)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-end justify-between gap-4 px-4 pt-4 pb-5 sm:px-6">
        {rows.length > 0 ? (
          <span
            aria-hidden="true"
            className="border-stamp font-display text-stamp/90 -rotate-6 rounded-sm border-2 px-2 py-0.5 text-lg"
          >
            Balanced
          </span>
        ) : (
          <span />
        )}
        {balance !== undefined ? (
          <p className="text-right">
            <span className="text-ink-soft block text-xs">Balance</span>
            <span className="figures font-display text-3xl">{formatCredits(balance)}</span>
          </p>
        ) : null}
      </div>

      {caption ? (
        <figcaption className="border-rule text-ink-soft border-t px-4 py-3 text-xs sm:px-6">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
