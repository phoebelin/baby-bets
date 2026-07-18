import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

// Placeholder values keep the client constructible before env vars are set;
// pages check `supabaseConfigured` and show setup instructions instead of calling out.
// GitHub Actions passes unset vars as empty strings, not undefined — `||`
// (not `??`) is required so those also fall through to the placeholder.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key"
);
