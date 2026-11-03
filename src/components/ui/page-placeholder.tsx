import Link from "next/link";

interface PagePlaceholderProps {
  title: string;
  description: string;
  /** Which roadmap phase delivers this page, e.g. "Phase 4". */
  phase: string;
  backHref?: string;
  backLabel?: string;
}

/** Temporary page body used until each feature's phase is built. */
export function PagePlaceholder({
  title,
  description,
  phase,
  backHref = "/",
  backLabel = "Back to the lobby",
}: PagePlaceholderProps) {
  return (
    <section className="max-w-2xl">
      <h1 className="font-display text-5xl sm:text-6xl">{title}</h1>
      <p className="text-ink-soft mt-5 text-lg leading-relaxed">{description}</p>
      <p className="border-rule bg-sheet mt-6 inline-block rounded-md border px-3 py-1.5 text-sm">
        This table opens in {phase} of the build.
      </p>
      <p className="mt-8">
        <Link href={backHref} className="hover:text-ink-soft text-sm underline underline-offset-4">
          {backLabel}
        </Link>
      </p>
    </section>
  );
}
