import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/server/auth/current-user";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <section className="mx-auto max-w-sm space-y-8 py-4">
      <h1 className="font-display text-5xl">Log in</h1>
      <AuthForm mode="login" action={loginAction} />
    </section>
  );
}
