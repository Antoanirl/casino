import { NavLink } from "@/components/layout/nav-link";
import { UserMenu } from "@/components/layout/user-menu";
import { Logo } from "@/components/ui/logo";
import { mainNav } from "@/lib/games";

export function SiteHeader() {
  return (
    <header className="border-rule bg-paper border-b">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6 md:grid-cols-[auto_1fr_auto]">
        <Logo />

        {/* On small screens the nav drops to its own row and scrolls sideways if needed. */}
        <nav
          aria-label="Main"
          className="col-span-2 -mx-4 overflow-x-auto px-4 md:col-span-1 md:mx-0 md:px-0"
        >
          <ul className="flex items-center gap-1 md:justify-center">
            {mainNav.map((item) => (
              <li key={item.href} className="shrink-0">
                <NavLink href={item.href}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="col-start-2 row-start-1 md:col-start-3">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
