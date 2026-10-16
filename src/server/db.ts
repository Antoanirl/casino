import "server-only";
import { PrismaClient } from "@prisma/client";
import { getServerEnv } from "@/server/env";

// In development Next.js reloads modules on every change. Keeping the client on
// globalThis stops each reload from opening a new pool of database connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const env = getServerEnv();
  return new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/** Shared Prisma client. Created on first call, so importing this file never needs a database. */
export function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}
