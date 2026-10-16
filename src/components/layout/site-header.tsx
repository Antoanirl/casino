import Link from "next/link";
import { NavLink } from "@/components/layout/nav-link";
import { UserMenu } from "@/components/layout/user-menu";
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

        <UserMenu />
      </div>
    </header>
  );
}
