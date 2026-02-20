// TODO: Issue #3 以降で担当者が各自の範囲を追加
export const queryKeys = {
  plots: {
    all: ["plots"] as const,
    list: (params?: { tag?: string; limit?: number; offset?: number }) =>
      ["plots", "list", params ?? {}] as const,
    detail: (id: string) => ["plots", "detail", id] as const,
    trending: () => ["plots", "trending"] as const,
    popular: () => ["plots", "popular"] as const,
    latest: () => ["plots", "latest"] as const,
  },
  sections: {
    all: ["sections"] as const,
    // TODO: Issue #3 以降で detail, byPlot などを追加
  },
  // TODO: Issue #3 以降で history, comments, search, users などを追加
} as const;
