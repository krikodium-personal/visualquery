import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prefer the direct (unpooled) Neon URL for Prisma interactive transactions.
 * The `-pooler` endpoint (PgBouncer) often fails with
 * "Unable to start a transaction in the given time" under concurrent saves.
 *
 * pg v8 treats sslmode=require as verify-full and warns; pin verify-full
 * explicitly so Neon URLs with `require` stay quiet and keep current semantics.
 */
function normalizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const mode = parsed.searchParams.get("sslmode");
    if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

const connectionString = normalizeDatabaseUrl(
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "",
);

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
