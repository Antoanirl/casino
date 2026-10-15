import type { Metadata } from "next";
import Link from "next/link";
import { slotGames } from "@/lib/games";

export const metadata: Metadata = { title: "Slots" };

export default function SlotsHubPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Slots</h1>
      <p className="max-w-prose text-zinc-300">
        Three games running on one shared slot engine. Each game is a configuration of reels,
        symbols and paytable.
      </p>
      <ul className="grid gap-4 sm:grid-cols-3">
        {slotGames.map((game) => (
          <li key={game.slug}>
            <Link
              href={game.href}
              className="bg-felt-800 hover:border-gold-500 block h-full rounded-lg border border-white/10 p-5 transition-colors"
            >
              <h2 className="text-lg font-semibold">{game.name}</h2>
              <p className="mt-2 text-sm text-zinc-300">{game.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
