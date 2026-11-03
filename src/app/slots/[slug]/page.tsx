import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameShell } from "@/components/games/game-shell";
import { Paytable } from "@/components/slots/paytable";
import { SlotMachine } from "@/components/slots/slot-machine";
import { SLOT_SLUGS, getSlotGame } from "@/lib/games";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { theoreticalRtp } from "@/server/games/slots/engine";
import { getSlotConfig } from "@/server/games/slots/games";
import { recentSlotSpins } from "@/server/games/slots/service";
import { getBalance } from "@/server/ledger";

interface SlotPageProps {
  params: Promise<{ slug: string }>;
}

// Only the three known slot games exist; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return SLOT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: SlotPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: getSlotGame(slug)?.name ?? "Slots" };
}

export default async function SlotGamePage({ params }: SlotPageProps) {
  const { slug } = await params;
  const game = getSlotGame(slug);
  if (!game) notFound();

  const config = getSlotConfig(slug);
  const user = await getCurrentUser();
  if (!config || game.status !== "playable" || !user) {
    return <GameShell game={game} backHref="/slots" backLabel="All slots" />;
  }

  const [recent, balance] = await Promise.all([
    recentSlotSpins(getDb(), user.id, slug, 1),
    getBalance(getDb(), user.id),
  ]);
  // Show the reels where the player's last spin stopped, or at the start of each strip.
  const initialStops = recent[0]?.stops ?? config.reels.map(() => 0);

  return (
    <div className="space-y-6">
      <Link href="/slots" className="text-ink-soft text-sm underline-offset-4 hover:underline">
        All slots
      </Link>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-14">
        <div className="space-y-6">
          <h1 className="font-display text-5xl">{game.name}</h1>
          <SlotMachine config={config} initialBalance={balance} initialStops={initialStops} />
        </div>
        <div className="lg:pt-20">
          <Paytable config={config} rtp={theoreticalRtp(config)} />
        </div>
      </div>
    </div>
  );
}
