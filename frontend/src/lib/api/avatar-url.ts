const RELATIVE_IMAGE_PREFIX = "/api/v1/images/";

function getApiBaseUrl(): string {
    return process.env.NEXT_PUBLIC_API_URL || "/api/v1";
}

/**
 * アバターURLを安全に解決する。
 * - `/api/v1/images/...` の相対パスは API Base URL が絶対URLなら絶対化する
 * - 外部URLは https:// のみ許可
 */
export function resolveSafeAvatarUrl(url: string | null | undefined): string | null {
    if (!url) {
        return null;
    }

    if (url.startsWith(RELATIVE_IMAGE_PREFIX)) {
        const apiBaseUrl = getApiBaseUrl();
        if (apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://")) {
            try {
                return new URL(url, apiBaseUrl).toString();
            } catch {
                return null;
            }
        }
        return url;
    }

    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" ? url : null;
    } catch {
        return null;
    }
}