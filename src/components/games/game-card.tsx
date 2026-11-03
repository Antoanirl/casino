import Link from "next/link";
import { GameArt } from "@/components/games/game-art";
import type { Game } from "@/lib/games";

/** A game's place at the table: felt surface, brass illustration, paper-coloured text. */
export function GameCard({ game, size = "large" }: { game: Game; size?: "large" | "small" }) {
  const playable = game.status === "playable";

  return (
    <Link
      href={game.href}
      className="on-felt group bg-felt text-paper ring-felt-deep hover:bg-felt-deep flex h-full flex-col overflow-hidden rounded-xl ring-1 transition-colors"
    >
      <div className={size === "large" ? "px-6 pt-6" : "px-4 pt-4"}>
        <GameArt
          slug={game.slug}
          className={`w-full ${size === "large" ? "h-40" : "h-28"} transition-transform duration-300 group-hover:-translate-y-0.5`}
        />
      </div>
      <div className={`mt-auto ${size === "large" ? "p-6" : "p-4"}`}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={`font-display ${size === "large" ? "text-3xl" : "text-2xl"}`}>
            {game.name}
          </h3>
          {playable ? null : (
            <span className="border-brass/60 text-brass shrink-0 rounded-full border px-2 py-0.5 text-xs">
              Coming soon
            </span>
          )}
        </div>
        <p className="text-paper/75 mt-1.5 text-sm">{game.description}</p>
      </div>
    </Link>
  );
}
