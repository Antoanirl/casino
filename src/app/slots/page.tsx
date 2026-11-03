import type { Metadata } from "next";
import { GameCard } from "@/components/games/game-card";
import { slotGames } from "@/lib/games";

export const metadata: Metadata = { title: "Slots" };

export default function SlotsHubPage() {
  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl sm:text-6xl">Slots</h1>
        <p className="text-ink-soft mt-5 text-lg leading-relaxed">
          Three machines on one engine. Each is a set of reels, symbols and a paytable, so they play
          by exactly the same rules for bets and payouts.
        </p>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {slotGames.map((game) => (
          <li key={game.slug}>
            <GameCard game={game} size="small" />
          </li>
        ))}
      </ul>
    </div>
  );
}
