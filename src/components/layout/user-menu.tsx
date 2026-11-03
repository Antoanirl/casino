import { logoutAction } from "@/app/actions/auth";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { formatCredits } from "@/lib/money";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { getBalance } from "@/server/ledger";
import Link from "next/link";

/** Right side of the header: balance + log out when signed in, log in / sign up otherwise. */
export async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <ButtonLink href="/login" variant="quiet" className="px-3 py-2">
          Log in
        </ButtonLink>
        <ButtonLink href="/register" className="px-3 py-2">
          Sign up
        </ButtonLink>
      </div>
    );
  }

  const balance = await getBalance(getDb(), user.id);

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/dashboard"
        className="border-rule bg-sheet hover:border-ink/40 flex items-baseline gap-2 rounded-md border px-3 py-1.5"
      >
        <span className="text-ink-soft hidden text-xs sm:inline">{user.username}</span>
        <span className="figures font-semibold">{formatCredits(balance)}</span>
        <span className="text-ink-soft hidden text-xs sm:inline">credits</span>
        <span className="sr-only sm:hidden">credits</span>
      </Link>
      <form action={logoutAction}>
        <button type="submit" className={buttonClass("quiet", "px-2 py-2")}>
          Log out
        </button>
      </form>
    </div>
  );
}
