import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isCloudflareWorker(): boolean {
  try {
    return (
      typeof navigator !== "undefined" &&
      navigator.userAgent === "Cloudflare-Workers"
    );
  } catch {
    return false;
  }
}

/**
 * Prefer the direct (unpooled) Neon URL for local Node interactive transactions.
 * On Cloudflare Workers, keep DATABASE_URL (usually the pooler): unpooled + a
 * multi-connection pg pool is a common source of Worker exceptions.
 *
 * pg v8 warns that sslmode=require currently aliases verify-full. On Workers,
 * forcing verify-full can fail certificate verification and throw Error 1101 —
 * leave require as-is there, and only pin verify-full in local Node.
 */
function normalizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const mode = parsed.searchParams.get("sslmode");
    if (isCloudflareWorker()) {
      if (!mode) parsed.searchParams.set("sslmode", "require");
      return parsed.toString();
    }
    if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function resolveConnectionString(): string {
  const onWorker = isCloudflareWorker();
  const raw = onWorker
    ? process.env.DATABASE_URL?.trim() || process.env.DATABASE_URL_UNPOOLED?.trim()
    : process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is required");
  }
  return normalizeDatabaseUrl(raw);
}

const onWorker = isCloudflareWorker();
const adapter = new PrismaPg({
  connectionString: resolveConnectionString(),
  // Serverless / Workers: discard connections after one use.
  maxUses: 1,
  max: onWorker ? 1 : 5,
  idleTimeoutMillis: onWorker ? 5_000 : 20_000,
  connectionTimeoutMillis: 15_000,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
