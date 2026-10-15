import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/page-placeholder";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <PagePlaceholder
      title="Log in"
      phase="Phase 2"
      description="Sign in to your account to play with your virtual-credit balance."
    />
  );
}
