import { formatSignedCredits } from "@/lib/ledger-display";
import { formatCredits } from "@/lib/money";
import { formatRate, type GameStats } from "@/server/stats";

/**
 * The account at a glance, set out like the summary at the top of a bank statement:
 * one ruled row of figures, with the balance carried to the right.
 */
export function AccountSummary({ total, balance }: { total: GameStats; balance: number }) {
  const played = total.rounds > 0;
  const figures = [
    { label: "Rounds played", value: total.rounds.toLocaleString("en-US") },
    { label: "Staked", value: played ? formatCredits(total.staked) : "—" },
    {
      label: "Net result",
      value: played ? formatSignedCredits(total.net) : "—",
      negative: total.net < 0,
    },
    { label: "Return", value: formatRate(total.returnRate) },
    { label: "Biggest win", value: total.biggestWin > 0 ? formatCredits(total.biggestWin) : "—" },
  ];

  return (
    <section
      aria-label="Account summary"
      className="border-ink/70 grid border-y-2 sm:grid-cols-[1fr_auto]"
    >
      <dl className="divide-rule grid grid-cols-2 sm:grid-cols-5 sm:divide-x">
        {figures.map(({ label, value, negative }) => (
          <div
            key={label}
            className="border-rule border-b px-1 py-4 last:border-b-0 sm:border-b-0 sm:px-4"
          >
            <dt className="text-ink-soft text-xs">{label}</dt>
            <dd className={`figures mt-1 text-xl font-semibold ${negative ? "text-stamp" : ""}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {/* On a phone the balance leads; from sm up it is carried to the right, like a statement. */}
      <p className="border-ink/70 sm:bg-sheet order-first border-b px-1 py-4 sm:order-none sm:border-b-0 sm:border-l-2 sm:px-6 sm:text-right">
        <span className="text-ink-soft block text-xs">Balance</span>
        <span className="figures font-display text-4xl">{formatCredits(balance)}</span>
      </p>
    </section>
  );
}
