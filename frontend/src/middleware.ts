import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh the session — this keeps the cookie alive
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes: redirect unauthenticated users to login
  const protectedPaths = ["/plots/new", "/auth/settings"];
  const isProtected = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path),
  );
  const isEditRoute = /^\/plots\/[^/]+\/edit$/.test(req.nextUrl.pathname);

  if ((isProtected || isEditRoute) && !session) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirectTo", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/plots/:path*", "/profile/:path*", "/auth/settings"],
};
