import { apiClient } from "../client";
import type { SearchResponse } from "../types";

export async function search(
  params: { q: string; limit?: number; offset?: number },
  token?: string,
): Promise<SearchResponse> {
  return apiClient<SearchResponse>("/search", { params, token });
}
