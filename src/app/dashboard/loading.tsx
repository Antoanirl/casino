import { LedgerSkeleton } from "@/components/ledger/ledger-skeleton";

export default function DashboardLoading() {
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <div>
        <h1 className="font-display text-5xl">Your ledger</h1>
      </div>
      <LedgerSkeleton />
    </div>
  );
}
