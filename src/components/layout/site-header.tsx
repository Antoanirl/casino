import Link from "next/link";
import { NavLink } from "@/components/layout/nav-link";
import { mainNav } from "@/lib/games";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="bg-felt-900 border-b border-white/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-gold-400 text-lg font-bold tracking-tight">
          {siteConfig.name}
        </Link>

        <nav aria-label="Main">
          <ul className="flex flex-wrap items-center gap-1">
            {mainNav.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>

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
      </div>
    </header>
  );
}
