import type { Metadata } from "next";
import { GameShell } from "@/components/games/game-shell";
import { getGame } from "@/lib/games";

export const metadata: Metadata = { title: "Blackjack" };

export default function BlackjackPage() {
  return <GameShell game={getGame("blackjack")!} />;
}
