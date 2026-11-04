import { defineConfig } from "drizzle-kit";

// `npm run db:generate` creates SQL migrations from src/db/schema.ts.
// `npm run db:migrate` applies them to DATABASE_URL (PostgreSQL).
// Without DATABASE_URL the app applies migrations to the local PGlite database automatically.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL || "postgres://localhost:5432/vortix" },
  strict: true,
});
