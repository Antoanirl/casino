import type { Metadata } from "next";
import { GameShell } from "@/components/games/game-shell";
import { getGame } from "@/lib/games";

export const metadata: Metadata = { title: "Roulette" };

export default function RoulettePage() {
  return <GameShell game={getGame("roulette")!} />;
}
