// Liveness check for deployment and uptime monitoring. Gains a database check in Phase 2.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", time: new Date().toISOString() });
}
