import Link from "next/link";

export default function NotFound() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-zinc-300">That page doesn&apos;t exist.</p>
      <Link href="/" className="text-gold-400 hover:underline">
        ← Back to lobby
      </Link>
    </section>
  );
}
