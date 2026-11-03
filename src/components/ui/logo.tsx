import Link from "next/link";
import { siteConfig } from "@/lib/site";

/** Rubber-stamp monogram: the mark a bookkeeper presses on a checked page. */
export function StampMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={`text-stamp -rotate-6 ${className}`}
      fill="none"
      stroke="currentColor"
    >
      <rect x="2.5" y="2.5" width="35" height="35" rx="3" strokeWidth="2.5" />
      <rect x="6.5" y="6.5" width="27" height="27" rx="1.5" strokeWidth="1" />
      <text
        x="20"
        y="26.5"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontSize="16"
        style={{ fontFamily: "var(--font-display)" }}
      >
        LL
      </text>
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded"
      aria-label={`${siteConfig.name}, home`}
    >
      <StampMark className="h-8 w-8 sm:h-9 sm:w-9" />
      <span className="font-display text-ink text-xl leading-none sm:text-2xl">
        {siteConfig.name}
      </span>
    </Link>
  );
}
