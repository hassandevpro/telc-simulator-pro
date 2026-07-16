import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Client Prisma singleton (Prisma 7 — driver adapter pg).
 * Le singleton évite l'épuisement des connexions en dev (hot reload).
 * NB : la persistance v1 des sessions est en LocalStorage ; ce client
 * sert l'auth, l'admin et la bascule v2 (ARCHITECTURE.md §1.4).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "",
  });
  return new PrismaClient({ adapter });
}

export const db: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
