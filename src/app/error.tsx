"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

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
    <section className="max-w-xl">
      <h1 className="font-display text-5xl">This page didn&apos;t load</h1>
      <p className="text-ink-soft mt-5 text-lg">
        The server ran into an error. Nothing was charged: a bet only counts once it is written to
        your ledger. Try again, and if it keeps happening, come back in a few minutes.
      </p>
      <Button type="button" onClick={reset} className="mt-8">
        Try again
      </Button>
    </section>
  );
}
