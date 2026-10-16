import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { formatCredits } from "@/lib/money";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { getBalance } from "@/server/ledger";

/** Right side of the header: balance + logout when signed in, login/sign-up otherwise. */
export async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link href="/login" className="rounded px-3 py-1.5 hover:bg-white/10">
          Log in
        </Link>
        <Link
          href="/register"
          className="bg-gold-500 text-felt-950 hover:bg-gold-400 rounded px-3 py-1.5 font-semibold"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const balance = await getBalance(getDb(), user.id);

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link
        href="/dashboard"
        className="border-gold-500/40 rounded border px-3 py-1.5 hover:bg-white/5"
        title="Your balance"
      >
        <span className="text-zinc-400">{user.username}</span>{" "}
        <span className="text-gold-400 font-semibold">{formatCredits(balance)}</span>
        <span className="sr-only"> credits</span>
      </Link>
      <form action={logoutAction}>
        <button type="submit" className="rounded px-3 py-1.5 hover:bg-white/10">
          Log out
        </button>
      </form>
    </div>
  );
}
