import Link from "next/link";
import { GameArt } from "@/components/games/game-art";
import { ButtonLink } from "@/components/ui/button";
import type { Game } from "@/lib/games";
import { STARTING_BALANCE_CREDITS, formatCredits } from "@/lib/money";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { getBalance } from "@/server/ledger";

interface GameShellProps {
  game: Game;
  backHref?: string;
  backLabel?: string;
}

/**
 * A game's page before the game itself is built: the closed table, how the game plays,
 * and what the visitor can do now. Each game replaces the table area in its own phase.
 */
export async function GameShell({ game, backHref = "/", backLabel = "All games" }: GameShellProps) {
  const user = await getCurrentUser();
  const balance = user ? await getBalance(getDb(), user.id) : null;

  return (
    <div className="space-y-10">
      <Link href={backHref} className="text-ink-soft text-sm underline-offset-4 hover:underline">
        {backLabel}
      </Link>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-14">
        <aside className="space-y-8">
          <div>
            <h1 className="font-display text-5xl sm:text-6xl">{game.name}</h1>
            <p className="text-ink-soft mt-4 text-lg leading-relaxed">{game.description}</p>
          </div>

          <dl className="divide-rule border-rule divide-y border-y">
            {game.rules.map((rule) => (
              <div key={rule.term} className="grid grid-cols-[7rem_1fr] gap-4 py-3 text-sm">
                <dt className="font-semibold">{rule.term}</dt>
                <dd className="text-ink-soft">{rule.detail}</dd>
              </div>
            ))}
          </dl>

          {user && balance !== null ? (
            <p className="text-ink-soft text-sm">
              Your balance is{" "}
              <span className="figures text-ink font-semibold">
                {formatCredits(balance)} credits
              </span>
              . It will be ready at this table when it opens.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-ink-soft text-sm">
                Create an account now and your {STARTING_BALANCE_CREDITS.toLocaleString("en-US")}{" "}
                starting credits will be waiting.
              </p>
              <ButtonLink href="/register">Create an account</ButtonLink>
            </div>
          )}
        </aside>

        <section
          aria-label={`${game.name} table`}
          className="on-felt bg-felt text-paper ring-felt-deep relative overflow-hidden rounded-2xl px-6 pt-10 pb-8 ring-1 sm:px-10 lg:order-first"
        >
          <GameArt slug={game.slug} className="mx-auto h-48 w-full max-w-md sm:h-64" />
          <div className="bg-paper text-ink mx-auto mt-8 max-w-sm rounded-md px-5 py-4 text-center shadow-lg sm:-rotate-1">
            <p className="font-display text-2xl">Table closed</p>
            <p className="text-ink-soft mt-1 text-sm">
              {game.name} opens in {game.opensIn} of the build.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
