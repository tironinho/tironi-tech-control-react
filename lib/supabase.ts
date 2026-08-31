import "server-only";
import { createClient } from "@supabase/supabase-js";

export function supabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  return { url, key };
}

export function isDatabaseConfigured() {
  const { url, key } = supabaseEnv();
  return Boolean(url && key);
}

export function getSupabase() {
  const { url, key } = supabaseEnv();
  if (!url || !key) {
    throw new Error(
      "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas Environment Variables da Vercel.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
    },
  });
}
