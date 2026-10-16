import type { Metadata } from "next";
import { formatCredits } from "@/lib/money";
import { requireUser } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { getBalance } from "@/server/ledger";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const balance = await getBalance(getDb(), user.id);

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-zinc-400">Signed in as</p>
        <h1 className="text-3xl font-bold">{user.username}</h1>
      </div>

      <div className="bg-felt-800 inline-block rounded-lg border border-white/10 px-6 py-4">
        <p className="text-xs tracking-widest text-zinc-400 uppercase">Balance</p>
        <p className="text-gold-400 text-3xl font-bold">{formatCredits(balance)} credits</p>
      </div>

      <p className="max-w-prose text-zinc-300">
        Game history, wins and losses, and the full transaction list arrive in Phase 8.
      </p>
    </section>
  );
}
