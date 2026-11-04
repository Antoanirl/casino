import Link from "next/link";
import {
  gameFilters,
  kindFilters,
  ledgerFilterHref,
  type LedgerFilters,
} from "@/lib/ledger-filters";

function FilterGroup({
  label,
  options,
  current,
  hrefFor,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  current: string;
  hrefFor: (value: string) => string;
}) {
  return (
    <nav aria-label={label} className="space-y-2">
      <p className="text-ink-soft text-xs">{label}</p>
      <ul className="flex flex-wrap gap-1.5 lg:flex-col lg:items-start">
        {options.map((option) => {
          const active = option.value === current;
          return (
            <li key={option.value}>
              <Link
                href={hrefFor(option.value)}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`inline-block rounded-full border px-3 py-1 text-sm transition-colors ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-rule hover:border-ink-soft hover:bg-sheet"
                }`}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Game and kind filters as plain links: they work without JavaScript and can be bookmarked. */
export function HistoryFilters({ filters }: { filters: LedgerFilters }) {
  return (
    <div className="space-y-5">
      <FilterGroup
        label="Game"
        options={gameFilters}
        current={filters.game}
        hrefFor={(game) => ledgerFilterHref({ ...filters, game, page: 1 })}
      />
      <FilterGroup
        label="Show"
        options={kindFilters}
        current={filters.kind}
        hrefFor={(kind) =>
          ledgerFilterHref({ ...filters, kind: kind as LedgerFilters["kind"], page: 1 })
        }
      />
    </div>
  );
}

/** Older entries are further back, like turning to an earlier page of the ledger. */
export function HistoryPager({
  filters,
  page,
  pageCount,
}: {
  filters: LedgerFilters;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const link =
    "border-rule hover:border-ink-soft hover:bg-sheet rounded-md border px-3 py-1.5 text-sm";
  return (
    <nav aria-label="Ledger pages" className="flex items-center justify-between gap-3">
      {page < pageCount ? (
        <Link
          href={ledgerFilterHref({ ...filters, page: page + 1 })}
          scroll={false}
          className={link}
        >
          Older entries
        </Link>
      ) : (
        <span />
      )}
      <span className="figures text-ink-soft text-sm">
        Page {page} of {pageCount}
      </span>
      {page > 1 ? (
        <Link
          href={ledgerFilterHref({ ...filters, page: page - 1 })}
          scroll={false}
          className={link}
        >
          Newer entries
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
