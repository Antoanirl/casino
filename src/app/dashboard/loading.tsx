import { LedgerSkeleton } from "@/components/ledger/ledger-skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-14">
      <h1 className="font-display text-5xl">Your ledger</h1>
      <div role="status" aria-live="polite" className="border-ink/70 border-y-2 py-4">
        <span className="sr-only">Loading your statistics</span>
        <div className="bg-paper-deep h-12 animate-pulse rounded" />
      </div>
      <div className="bg-paper-deep h-56 animate-pulse rounded-sm sm:h-64" />
      <LedgerSkeleton />
    </div>
  );
}
