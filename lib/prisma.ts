import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prefer the direct (unpooled) Neon URL for Prisma interactive transactions.
 * The `-pooler` endpoint (PgBouncer) often fails with
 * "Unable to start a transaction in the given time" under concurrent saves.
 */
const connectionString =
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is required");
}

const adapter = new PrismaPg({
  connectionString,
  max: 5,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 15_000,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
