import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/plots/new", "/plots/:id/edit"];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => {
    const pattern = route.replace(/:[\w]+/g, "[^/]+");
    return new RegExp(`^${pattern}$`).test(pathname);
  });
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (isProtectedRoute(request.nextUrl.pathname) && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
