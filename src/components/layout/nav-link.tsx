"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

/** Highlights itself on its own route and any nested route (e.g. /slots/gems under /slots). */
export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
        isActive ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-deep hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
