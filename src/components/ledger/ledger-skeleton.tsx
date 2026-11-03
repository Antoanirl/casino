/** Placeholder with the ledger page's shape, shown while entries load. */
export function LedgerSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="border-rule bg-sheet rounded-sm border shadow-[0_1px_0_var(--color-rule)]"
    >
      <span className="sr-only">Loading your ledger</span>
      <div className="border-ink/70 border-b-2 px-4 pt-5 pb-3 sm:px-6">
        <div className="bg-paper-deep h-7 w-48 animate-pulse rounded" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="border-rule flex items-center gap-4 border-b px-4 py-3.5 sm:px-6">
          <div className="bg-paper-deep h-3 w-14 animate-pulse rounded" />
          <div className="bg-paper-deep h-3 flex-1 animate-pulse rounded" />
          <div className="bg-paper-deep h-3 w-16 animate-pulse rounded" />
        </div>
      ))}
      <div className="h-20" />
    </div>
  );
}
