import type { Metadata } from "next";
import { GameShell } from "@/components/games/game-shell";
import { RouletteTable } from "@/components/roulette/roulette-table";
import { getGame } from "@/lib/games";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { recentSpins } from "@/server/games/roulette/service";
import { getBalance } from "@/server/ledger";

export const metadata: Metadata = { title: "Roulette" };

export default async function RoulettePage() {
  const game = getGame("roulette")!;
  const user = await getCurrentUser();
  if (!user) return <GameShell game={game} />;

  const [recent, balance] = await Promise.all([
    recentSpins(getDb(), user.id),
    getBalance(getDb(), user.id),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-5xl">Roulette</h1>
      <RouletteTable initialBalance={balance} initialRecent={recent} />

      <section aria-labelledby="rules-heading" className="max-w-3xl pt-4">
        <h2 id="rules-heading" className="font-display text-2xl">
          House rules
        </h2>
        <dl className="divide-rule border-rule mt-4 divide-y border-y">
          {game.rules.map((rule) => (
            <div
              key={rule.term}
              className="grid gap-1 py-3 text-sm sm:grid-cols-[9rem_1fr] sm:gap-4"
            >
              <dt className="font-semibold">{rule.term}</dt>
              <dd className="text-ink-soft">{rule.detail}</dd>
            </div>
          ))}
        </dl>
        <p className="text-ink-soft mt-4 text-sm">
          Each spot takes 1 to 500 credits and a spin up to 1,000. The number is drawn on the server
          before the wheel turns; every stake and win is written to your ledger.
        </p>
      </section>
    </div>
  );
}
