/** Shown while a page's server data loads: ruled lines being filled in, like a ledger page. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="max-w-xl space-y-6">
      <span className="sr-only">Loading</span>
      <div className="bg-paper-deep h-12 w-3/4 animate-pulse rounded" />
      <div className="space-y-3">
        {[100, 92, 96, 70].map((width) => (
          <div
            key={width}
            className="bg-paper-deep h-4 animate-pulse rounded"
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
    </div>
  );
}
