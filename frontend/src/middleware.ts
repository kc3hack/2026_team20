import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * サーバーサイドで保護するルートのパターン一覧
 *
 * middleware はリクエスト到達前に認証チェックを行い、未認証ユーザーをログインページへリダイレクトする。
 * クライアントサイドの AuthGuard とは異なり、ページコンポーネントの読み込み自体を防止できる。
 *
 * 使い分けの方針:
 * - middleware: 認証必須ページの保護（ページ自体にアクセスさせない）
 * - AuthGuard: 認証状態に応じた UI の出し分け（ページ内の部分的な保護）
 *
 * パターンマッチの挙動:
 * - "/plots/new" は /plots/new と /plots/new/* にマッチ
 * - "/plots/new" は /plots/newsletter にはマッチしない（厳密なプレフィックスマッチ）
 */
const PROTECTED_PATTERNS = ["/plots/new"];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PATTERNS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (isProtectedRoute(request.nextUrl.pathname) && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
