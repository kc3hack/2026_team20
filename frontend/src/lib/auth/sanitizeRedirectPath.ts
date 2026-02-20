/**
 * リダイレクト先パスをサニタイズする共通ユーティリティ
 *
 * オープンリダイレクト攻撃を防止するため、以下のケースを除外する:
 * - 空値・null
 * - 危険なスキーム（javascript:, data:, vbscript:）
 * - "/" で始まらないパス（絶対URL: http://evil.com など）
 * - "//" で始まるプロトコル相対URL（//evil.com）
 * - バックスラッシュを含むパス（ブラウザが "/" として解釈する可能性がある）
 *
 * LoginPage と callback route の両方で使用される。
 * ロジックを一箇所に集約することで、セキュリティ対策の漏れを防ぐ。
 */
export function sanitizeRedirectPath(raw: string | null): string | undefined;
export function sanitizeRedirectPath(raw: string | null, fallback: string): string;
export function sanitizeRedirectPath(raw: string | null, fallback?: string): string | undefined {
  if (!raw) return fallback ?? undefined;

  // 危険なスキームを拒否（XSS防止）
  const lowerRaw = raw.toLowerCase();
  if (
    lowerRaw.startsWith("javascript:") ||
    lowerRaw.startsWith("data:") ||
    lowerRaw.startsWith("vbscript:")
  ) {
    return fallback ?? undefined;
  }

  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return fallback ?? undefined;
  }
  return raw;
}
