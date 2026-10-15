import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/page-placeholder";

export const metadata: Metadata = { title: "Roulette" };

export default function RoulettePage() {
  return (
    <PagePlaceholder
      title="Roulette"
      phase="Phase 5"
      description="European single-zero roulette with number, colour, parity, dozen and column bets, with outcomes generated on the server."
    />
  );
}
