import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { registerAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { STARTING_BALANCE_CREDITS } from "@/lib/money";
import { getCurrentUser } from "@/server/auth/current-user";

export const metadata: Metadata = { title: "Sign up" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <section className="mx-auto max-w-sm space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Create an account</h1>
        <p className="text-sm text-zinc-300">
          Free to play. New accounts start with {STARTING_BALANCE_CREDITS.toLocaleString("en-US")}{" "}
          virtual credits.
        </p>
      </div>
      <AuthForm mode="register" action={registerAction} />
    </section>
  );
}
