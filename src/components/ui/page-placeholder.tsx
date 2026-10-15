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
  backLabel = "Back to lobby",
}: PagePlaceholderProps) {
  return (
    <section className="space-y-4">
      <p className="text-gold-400 text-xs font-semibold tracking-widest uppercase">
        Coming in {phase}
      </p>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="max-w-prose text-zinc-300">{description}</p>
      <Link href={backHref} className="text-gold-400 inline-block text-sm hover:underline">
        ← {backLabel}
      </Link>
    </section>
  );
}
