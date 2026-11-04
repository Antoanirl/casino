import "server-only";
import { headers } from "next/headers";

/**
 * The client's IP address, for rate limiting only.
 *
 * On Vercel, `x-forwarded-for` is set by Vercel's edge and a value sent by the client is
 * overwritten, so its first entry is the real client address. Locally there is no proxy, so
 * every request shares one "local" bucket.
 */
export async function clientIp(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || store.get("x-real-ip")?.trim() || "local";
}
