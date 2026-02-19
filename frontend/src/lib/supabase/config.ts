// `??` は空文字列を truthy と扱うため、`||` + trim で明示的にバリデーションする
export function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // SSG/プリレンダリング時は環境変数が未設定のため、ダミー値を返して
  // ビルドを通す。実行時にはクライアントサイドで正しい値が注入される。
  if (typeof window === "undefined") {
    const isUrlMissing = !supabaseUrl || supabaseUrl.trim().length === 0;
    const isKeyMissing = !supabaseKey || supabaseKey.trim().length === 0;

    if (isUrlMissing || isKeyMissing) {
      return {
        supabaseUrl: "https://placeholder.supabase.co",
        supabaseKey: "placeholder-key",
      };
    }
  }

  if (!supabaseUrl || supabaseUrl.trim().length === 0) {
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
