import Link from "next/link";
import { GameCard } from "@/components/games/game-card";
import { LedgerPage } from "@/components/ledger/ledger-page";
import { ButtonLink } from "@/components/ui/button";
import { games, slotGames } from "@/lib/games";
import { sampleLedger, type LedgerRow } from "@/lib/ledger-display";
import { STARTING_BALANCE_CREDITS } from "@/lib/money";
import { siteConfig } from "@/lib/site";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDb } from "@/server/db";

const RECENT_ENTRIES = 6;

async function recentEntries(userId: string): Promise<LedgerRow[]> {
  const latest = await getDb().ledgerEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: RECENT_ENTRIES,
    select: { id: true, type: true, amount: true, balanceAfter: true, game: true, createdAt: true },
  });
  return latest.reverse(); // oldest first, like a ledger page
}

const houseRules = [
  {
    title: "The server deals",
    body: "Your browser only sends what you want to do: bet, hit, spin. Cards, numbers and reels are drawn on the server with a cryptographic random generator.",
  },
  {
    title: "Every credit is written down",
    body: "Each bet and win is a line in your ledger, saved in the same database transaction as the balance change. The balance always equals the sum of the lines.",
  },
  {
    title: "A double click charges once",
    body: "Every bet carries a unique key. If the same request arrives twice, the second one gets the first one's result instead of a second charge.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const rows = user ? await recentEntries(user.id) : sampleLedger();
  const tableGames = games.filter((game) => game.category === "table");

  return (
    <div className="space-y-20 sm:space-y-28">
      <section className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(0,32rem)] lg:gap-16">
        <div className="max-w-xl">
          <h1 className="font-display text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
            Every bet goes in the book.
          </h1>
          <p className="text-ink-soft mt-6 text-lg leading-relaxed">
            Blackjack, roulette and slots for virtual credits. The house decides nothing in your
            browser, and every credit in or out is written to a ledger you can read.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <ButtonLink href="/dashboard">Open your ledger</ButtonLink>
            ) : (
              <ButtonLink href="/register">
                Start with {STARTING_BALANCE_CREDITS.toLocaleString("en-US")} credits
              </ButtonLink>
            )}
            <ButtonLink href="#games" variant="secondary">
              See the games
            </ButtonLink>
          </div>
        </div>

        <LedgerPage
          title={user ? `${user.username}'s ledger` : "A page from the ledger"}
          rows={rows}
          caption={
            user ? (
              <>
                Your latest entries.{" "}
                <Link href="/dashboard" className="hover:text-ink underline underline-offset-2">
                  See all of them
                </Link>
              </>
            ) : (
              "An example page. Sign up and your own starts with a signup bonus."
            )
          }
        />
      </section>

      <section id="games" aria-labelledby="games-heading" className="scroll-mt-24 space-y-8">
        <div className="max-w-2xl">
          <h2 id="games-heading" className="font-display text-4xl sm:text-5xl">
            The tables
          </h2>
          <p className="text-ink-soft mt-3">
            Two table games and three slots that share one engine. They open one at a time as each
            is built and tested.
          </p>
        </div>

        <ul className="grid gap-5 md:grid-cols-2">
          {tableGames.map((game) => (
            <li key={game.slug}>
              <GameCard game={game} />
            </li>
          ))}
        </ul>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {slotGames.map((game) => (
            <li key={game.slug}>
              <GameCard game={game} size="small" />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="rules-heading" className="border-ink/70 border-t-2 pt-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,18rem)_1fr]">
          <div>
            <h2 id="rules-heading" className="font-display text-4xl">
              House rules
            </h2>
            <p className="text-ink-soft mt-3 text-sm">
              How the casino keeps its books straight.{" "}
              <a
                href={`${siteConfig.sourceUrl}/blob/main/docs/architecture.md`}
                className="hover:text-ink underline underline-offset-2"
              >
                Read the technical notes
              </a>
            </p>
          </div>
          <dl className="grid gap-8 sm:grid-cols-3">
            {houseRules.map((rule) => (
              <div key={rule.title}>
                <dt className="font-display text-xl">{rule.title}</dt>
                <dd className="text-ink-soft mt-2 text-sm leading-relaxed">{rule.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
