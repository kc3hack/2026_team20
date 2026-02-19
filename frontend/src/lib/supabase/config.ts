// `?? ` は空文字列を truthy と扱うため、` || ` + trim で明示的にバリデーションする
export function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || supabaseUrl.trim().length === 0) {
    if (typeof window === "undefined") {
      const isBuild =
        process.env.NODE_ENV === "production"
          ? process.env.NEXT_PHASE === "phase-production-build"
          : true;

      if (process.env.NODE_ENV === "production" && !isBuild) {
        console.warn("Supabase config is missing in server environment. Using placeholder values.");
      }

      return {
        supabaseUrl: "https://placeholder.supabase.co",
        supabaseKey: "placeholder-key",
      };
    }
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  }

  if (!supabaseKey || supabaseKey.trim().length === 0) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be set",
    );
  }

  return {
    supabaseUrl: supabaseUrl.trim(),
    supabaseKey: supabaseKey.trim(),
  };
}
