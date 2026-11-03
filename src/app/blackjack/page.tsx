import type { Metadata } from "next";
import { BlackjackTable } from "@/components/blackjack/blackjack-table";
import { GameShell } from "@/components/games/game-shell";
import { getGame } from "@/lib/games";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { getActiveRound } from "@/server/games/blackjack/service";
import { getBalance } from "@/server/ledger";

export const metadata: Metadata = { title: "Blackjack" };

export default async function BlackjackPage() {
  const game = getGame("blackjack")!;
  const user = await getCurrentUser();
  if (!user) return <GameShell game={game} />;

  // Resume an unfinished round after a reload.
  const [round, balance] = await Promise.all([
    getActiveRound(getDb(), user.id),
    getBalance(getDb(), user.id),
  ]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:gap-14">
      <div className="space-y-6">
        <h1 className="font-display text-5xl">Blackjack</h1>
        <BlackjackTable initialRound={round} initialBalance={balance} />
      </div>

      <aside aria-labelledby="rules-heading" className="lg:pt-20">
        <h2 id="rules-heading" className="font-display text-2xl">
          House rules
        </h2>
        <dl className="divide-rule border-rule mt-4 divide-y border-y">
          {game.rules.map((rule) => (
            <div key={rule.term} className="py-3 text-sm">
              <dt className="font-semibold">{rule.term}</dt>
              <dd className="text-ink-soft mt-0.5">{rule.detail}</dd>
            </div>
          ))}
        </dl>
        <p className="text-ink-soft mt-4 text-sm">
          Six decks, shuffled fresh every round. Double on any two cards, split pairs up to four
          hands. Every bet and win is written to your ledger.
        </p>
      </aside>
    </div>
  );
}
