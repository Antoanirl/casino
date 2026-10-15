import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/page-placeholder";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <PagePlaceholder
      title="Dashboard"
      phase="Phase 8"
      description="Your balance, recent games, wins and losses, and full transaction history, all traced back to stored game records."
    />
  );
}
