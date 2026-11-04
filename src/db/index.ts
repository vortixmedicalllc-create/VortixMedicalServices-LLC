/**
 * Database connection.
 *
 * - If DATABASE_URL is set, connects to PostgreSQL with node-postgres.
 *   Run `npm run db:migrate` to apply migrations.
 * - Otherwise, uses PGlite (real PostgreSQL compiled to WebAssembly) stored in
 *   PGLITE_DATA_DIR (default ./.data/pglite). Migrations are applied automatically.
 *   PGlite is intended for local development and testing only.
 */
import path from "node:path";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

const g = globalThis as unknown as { __vortixDb?: Promise<Db> };

const migrationsFolder = path.join(process.cwd(), "drizzle");

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined,
    });
    const db = drizzle(pool, { schema });
    if (process.env.DATABASE_AUTO_MIGRATE === "true") {
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      await migrate(db, { migrationsFolder });
    }
    return db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DATA_DIR || path.join(process.cwd(), ".data", "pglite");
  if (dir !== "memory://") {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dir, { recursive: true });
  }
  const client = dir === "memory://" ? new PGlite() : new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  if (!g.__vortixDb) {
    g.__vortixDb = connect().catch((err) => {
      g.__vortixDb = undefined;
      throw err;
    });
  }
  return g.__vortixDb;
}

/** For tests only: drop the cached connection. */
export function resetDbForTests() {
  g.__vortixDb = undefined;
}

export { schema };
