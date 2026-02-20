import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

export function createClient() {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  return createBrowserClient(supabaseUrl, supabaseKey);
}
