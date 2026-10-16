import { getDb } from "@/server/db";

// Liveness check for deployment and uptime monitoring, including database reachability.
export const dynamic = "force-dynamic";

export async function GET() {
  const time = new Date().toISOString();
  try {
    await getDb().$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "ok", time });
  } catch (error) {
    console.error("Health check: database unreachable", error);
    return Response.json({ status: "error", database: "unreachable", time }, { status: 503 });
  }
}
