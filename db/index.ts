import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function connectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

function createDb() {
  const url = connectionString();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add the Supabase transaction pooler URI in .env.local and in Vercel project settings.",
    );
  }

  const client = postgres(url, { prepare: false, max: 1 });
  return drizzle(client, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

export function isDatabaseConfigured() {
  return Boolean(connectionString());
}
