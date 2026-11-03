import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameShell } from "@/components/games/game-shell";
import { SLOT_SLUGS, getSlotGame } from "@/lib/games";

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

  return <GameShell game={game} backHref="/slots" backLabel="All slots" />;
}
