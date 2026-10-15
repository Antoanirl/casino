import Link from "next/link";
import { games } from "@/lib/games";
import { siteConfig } from "@/lib/site";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">{siteConfig.name}</h1>
        <p className="max-w-prose text-zinc-300">{siteConfig.tagline}</p>
      </section>

      <section aria-labelledby="games-heading" className="space-y-4">
        <h2 id="games-heading" className="text-xl font-semibold">
          Games
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <li key={game.slug}>
              <Link
                href={game.href}
                className="bg-felt-800 hover:border-gold-500 block h-full rounded-lg border border-white/10 p-5 transition-colors"
              >
                <span className="text-xs tracking-widest text-zinc-400 uppercase">
                  {game.category === "table" ? "Table game" : "Slots"}
                </span>
                <h3 className="mt-1 text-lg font-semibold">{game.name}</h3>
                <p className="mt-2 text-sm text-zinc-300">{game.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
