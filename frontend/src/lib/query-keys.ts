// TODO: Issue #3 以降で担当者が各自の範囲を追加
export const queryKeys = {
  plots: {
    all: ["plots"] as const,
    list: (params?: { tag?: string; limit?: number; offset?: number }) =>
      ["plots", "list", params ?? {}] as const,
    detail: (id: string) => ["plots", "detail", id] as const,
    trending: (limit?: number) => ["plots", "trending", { limit }] as const,
    popular: (limit?: number) => ["plots", "popular", { limit }] as const,
    latest: (limit?: number) => ["plots", "latest", { limit }] as const,
  },
  sections: {
    all: ["sections"] as const,
    byPlot: (plotId: string) => ["sections", "byPlot", plotId] as const,
    // TODO: Issue #3 以降で detail などを追加
  },
  stars: {
    byPlot: (plotId: string) => ["stars", "byPlot", plotId] as const,
  },
  threads: {
    byPlot: (plotId: string) => ["threads", "byPlot", plotId] as const,
  },
  comments: {
    byThread: (threadId: string) => ["comments", "byThread", threadId] as const,
  },
  // TODO: Issue #3 以降で history, search, users などを追加
  search: {
    all: ["search"] as const,
    results: (params: { q: string; limit?: number; offset?: number }) =>
      ["search", "results", params] as const,
  },
  // TODO: Issue #3 以降で history, comments, users などを追加
} as const;
