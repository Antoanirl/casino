import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/page-placeholder";

export const metadata: Metadata = { title: "Blackjack" };

export default function BlackjackPage() {
  return (
    <PagePlaceholder
      title="Blackjack"
      phase="Phase 4"
      description="Server-driven blackjack with hit, stand, double down and split. Every round's state lives on the server, so results can't be changed from the browser."
    />
  );
}
