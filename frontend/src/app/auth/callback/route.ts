import { NextResponse } from "next/server";
import { sanitizeRedirectPath } from "@/lib/auth/sanitizeRedirectPath";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawRedirectTo = searchParams.get("redirectTo") ?? "/";
  const redirectTo = sanitizeRedirectPath(rawRedirectTo, "/");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  const errorUrl = new URL("/auth/login", origin);
  errorUrl.searchParams.set("error", "auth_callback_error");
  if (redirectTo !== "/") {
    errorUrl.searchParams.set("redirectTo", redirectTo);
  }
  return NextResponse.redirect(errorUrl.toString());
}
