import { CHART_HEIGHT, CHART_WIDTH, chartGeometry } from "@/lib/balance-chart";
import { formatCredits } from "@/lib/money";
import type { BalancePoint } from "@/server/stats";

/**
 * The balance after each recent ledger entry, drawn in ink across ruled ledger lines, with the
 * starting balance as a dashed red line. Server-rendered SVG: no chart library, no client code.
 */
export function BalanceChart({
  points,
  complete,
  reference,
  referenceLabel,
}: {
  points: BalancePoint[];
  /** False when older entries were left out. */
  complete: boolean;
  reference: number;
  referenceLabel: string;
}) {
  if (points.length < 2) {
    return (
      <p className="border-rule bg-sheet text-ink-soft rounded-sm border px-4 py-10 text-center">
        Your balance line starts with your first bet.
      </p>
    );
  }

  const values = points.map((p) => p.balance);
  const g = chartGeometry(values, reference);
  const low = values[g.lowIndex]!;
  const high = values[g.highIndex]!;
  const first = values[0]!;
  const last = values.at(-1)!;
  const span = complete ? "since you joined" : `over your last ${points.length} entries`;
  const description = `Balance ${span}: from ${formatCredits(first)} to ${formatCredits(last)} credits, lowest ${formatCredits(low)}, highest ${formatCredits(high)}.`;

  return (
    <figure className="space-y-2">
      <div
        className="border-rule bg-sheet relative h-56 rounded-sm border sm:h-64"
        style={{
          // Ruled lines, like the ledger page.
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, var(--color-rule) 31px, var(--color-rule) 32px)",
        }}
      >
        <svg
          role="img"
          aria-label={description}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-x-3 inset-y-4 h-[calc(100%-2rem)] w-[calc(100%-1.5rem)] overflow-visible"
        >
          <line
            x1={0}
            x2={CHART_WIDTH}
            y1={g.referenceAt * CHART_HEIGHT}
            y2={g.referenceAt * CHART_HEIGHT}
            stroke="var(--color-stamp)"
            strokeOpacity={0.7}
            strokeWidth={1.5}
            strokeDasharray="6 5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={g.path}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          aria-hidden="true"
          className="bg-sheet/90 text-stamp absolute right-4 -translate-y-full px-1 text-xs"
          style={{ top: `calc(1rem + ${g.referenceAt} * (100% - 2rem))` }}
        >
          {referenceLabel}
        </span>
      </div>
      <figcaption className="figures text-ink-soft flex flex-wrap justify-between gap-x-6 gap-y-1 text-sm">
        <span>
          {complete ? "Since you joined" : `Last ${points.length} entries`}: {formatCredits(first)}{" "}
          to <span className="text-ink font-semibold">{formatCredits(last)}</span>
        </span>
        <span>
          Low {formatCredits(low)}, high {formatCredits(high)}
        </span>
      </figcaption>
    </figure>
  );
}
