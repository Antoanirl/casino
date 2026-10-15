import { z } from "zod";

/**
 * Public environment variables, validated once at startup.
 * Server-only secrets (DATABASE_URL, AUTH_SECRET) get their own schema in
 * src/server/env.ts in Phase 2 so they can never be bundled for the browser.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

// Next.js only inlines NEXT_PUBLIC_* values when they are referenced by name,
// so each variable must be listed explicitly here.
const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
});

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;
