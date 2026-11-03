import type { Metadata } from "next";
import { LedgerPage } from "@/components/ledger/ledger-page";
import { requireUser } from "@/server/auth/current-user";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Your ledger" };

const PAGE_SIZE = 20;

export default async function DashboardPage() {
  const user = await requireUser();
  const latest = await getDb().ledgerEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    select: { id: true, type: true, amount: true, balanceAfter: true, game: true, createdAt: true },
  });

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <div>
        <h1 className="font-display text-5xl">Your ledger</h1>
        <p className="text-ink-soft mt-5">
          Every credit that has moved in or out of your account, newest at the bottom like a
          bookkeeper writes it. Statistics, filters and the full history arrive in Phase 8.
        </p>
      </div>
      <LedgerPage
        title={`${user.username}'s ledger`}
        rows={latest.reverse()}
        caption={`Showing your latest ${Math.min(latest.length, PAGE_SIZE)} entries.`}
      />
    </div>
  );
}
