import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/page-placeholder";

export const metadata: Metadata = { title: "Sign up" };

export default function RegisterPage() {
  return (
    <PagePlaceholder
      title="Sign up"
      phase="Phase 2"
      description="Create a free account. New players start with a balance of virtual credits."
    />
  );
}
