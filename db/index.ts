import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function rawConnectionString() {
  return (
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL
  );
}

function pooledConnectionString(raw: string) {
  const url = new URL(raw);
  const directMatch = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  if (directMatch) {
    url.hostname = "aws-0-us-east-1.pooler.supabase.com";
    url.port = "6543";
    if (!url.username.includes(".")) {
      url.username = `${url.username}.${directMatch[1]}`;
    }
  }
  if (url.hostname.includes("pooler.supabase.com") && url.port === "5432") {
    url.port = "6543";
  }
  url.searchParams.set("sslmode", "require");
  url.searchParams.delete("supa");
  return url.toString();
}

function createDb() {
  const raw = rawConnectionString();
  if (!raw) {
    throw new Error(
      "DATABASE_URL is not set. Add the Supabase transaction pooler URI in .env.local and in Vercel project settings.",
    );
  }

  const client = postgres(pooledConnectionString(raw), {
    prepare: false,
    fetch_types: false,
    max: 1,
    connect_timeout: 8,
    idle_timeout: 20,
    ssl: "require",
  });
  return drizzle(client, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

export function isDatabaseConfigured() {
  return Boolean(rawConnectionString());
}
