import { apiClient } from "../client";
import type { DiffResponse, HistoryListResponse, SaveOperationRequest } from "../types";

// 🔀 環境変数で Mock / 実 API を切り替え
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function saveOperation(
  sectionId: string,
  body: SaveOperationRequest,
  token?: string,
): Promise<void> {
  if (USE_MOCK) {
    // Mock モードでは操作ログ保存は no-op
    return;
  }
  return apiClient<void>(`/sections/${sectionId}/operations`, {
    method: "POST",
    body,
    token,
  });
}

export async function getHistory(
  sectionId: string,
  params?: { limit?: number; offset?: number },
  token?: string,
): Promise<HistoryListResponse> {
  if (USE_MOCK) {
    const { mockHistoryEntries } = await import("@/mocks/data/history");
    const filtered = mockHistoryEntries.filter((h) => h.sectionId === sectionId);
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;
    return {
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }
  return apiClient<HistoryListResponse>(`/sections/${sectionId}/history`, {
    params,
    token,
  });
}

export async function getDiff(
  sectionId: string,
  fromVersion: number,
  toVersion: number,
  token?: string,
): Promise<DiffResponse> {
  if (USE_MOCK) {
    const { mockDiffResponse } = await import("@/mocks/data/history");
    return { ...mockDiffResponse, fromVersion, toVersion };
  }
  return apiClient<DiffResponse>(`/sections/${sectionId}/diff/${fromVersion}/${toVersion}`, {
    token,
  });
}
