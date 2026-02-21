import type { PlotResponse } from "@/lib/api/types";

/**
 * テスト用 PlotResponse ファクトリ関数。
 *
 * デフォルトでは「既存のPlot」を想定した値（starCount=10, description付き, version=1）を返す。
 * 新規作成直後のPlotをテストする場合は overrides で starCount=0, description=null 等を指定する。
 */
export const createMockPlot = (overrides: Partial<PlotResponse> = {}): PlotResponse => ({
  id: "plot-001",
  title: "テスト用Plot",
  description: "テスト用の説明文です。",
  tags: ["TypeScript"],
  ownerId: "user-001",
  starCount: 10,
  isStarred: false,
  isPaused: false,
  thumbnailUrl: null,
  version: 1,
  createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * テスト用 PlotResponse ファクトリ関数（新規作成直後のPlot向け）。
 *
 * starCount=0, description=null, tags=[] など、
 * 作成直後の初期状態を想定したデフォルト値を持つ。
 */
export const createMockPlotResponse = (overrides: Partial<PlotResponse> = {}): PlotResponse => ({
  id: "plot-001",
  title: "テスト用Plot",
  description: null,
  tags: [],
  ownerId: "user-001",
  starCount: 0,
  isStarred: false,
  isPaused: false,
  thumbnailUrl: null,
  version: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});
