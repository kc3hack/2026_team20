import { apiClient } from "../client";
import type { SearchResponse } from "../types";

// 🔀 環境変数で Mock / 実 API を切り替え
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function search(
  params: { q: string; limit?: number; offset?: number },
  token?: string,
): Promise<SearchResponse> {
  if (USE_MOCK) {
    const { mockSearchResults } = await import("@/mocks/data/search");
    // クエリで簡易フィルタリング（タイトル・description に部分一致）
    const q = params.q.toLowerCase();
    const filtered = mockSearchResults.items.filter(
      (p) => p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q),
    );
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    return {
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
      query: params.q,
    };
  }
  return apiClient<SearchResponse>("/search", { params, token });
}
