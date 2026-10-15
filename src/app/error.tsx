"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Replaced by real error reporting in Phase 10.
    console.error(error);
  }, [error]);

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="text-zinc-300">An unexpected error occurred. Your balance is not affected.</p>
      <button
        type="button"
        onClick={reset}
        className="bg-gold-500 text-felt-950 hover:bg-gold-400 rounded px-4 py-2 font-semibold"
      >
        Try again
      </button>
    </section>
  );
}
