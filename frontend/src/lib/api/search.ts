import { apiClient } from "./client";
import type { SearchResponse } from "./types";

const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const searchRepository = {
  /**
   * Plot検索
   * GET /search
   */
  async search(params: {
    query: string;
    limit?: number;
    offset?: number;
  }): Promise<SearchResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      return mockService.search({
        query: params.query,
        limit: params.limit,
        offset: params.offset,
      });
    }

    return apiClient<SearchResponse>("/search", {
      params: {
        q: params.query,
        limit: params.limit,
        offset: params.offset,
      },
    });
  },
};
