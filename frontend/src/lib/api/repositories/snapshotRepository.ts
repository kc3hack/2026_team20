import { apiClient } from "../client";
import type {
  PlotDetailResponse,
  RollbackLogListResponse,
  RollbackRequest,
  SnapshotDetailResponse,
  SnapshotListResponse,
} from "../types";

// 🔀 環境変数で Mock / 実 API を切り替え
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function list(
  plotId: string,
  params?: { limit?: number; offset?: number },
  token?: string,
): Promise<SnapshotListResponse> {
  if (USE_MOCK) {
    const { mockSnapshots } = await import("@/mocks/data/snapshots");
    const filtered = mockSnapshots.filter((s) => s.plotId === plotId);
    const limit = params?.limit ?? 20;
    const offset = params?.offset ?? 0;
    return {
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }
  return apiClient<SnapshotListResponse>(`/plots/${plotId}/snapshots`, {
    params,
    token,
  });
}

export async function get(
  plotId: string,
  snapshotId: string,
  token?: string,
): Promise<SnapshotDetailResponse> {
  if (USE_MOCK) {
    const { mockSnapshotDetail } = await import("@/mocks/data/snapshots");
    return mockSnapshotDetail;
  }
  return apiClient<SnapshotDetailResponse>(`/plots/${plotId}/snapshots/${snapshotId}`, { token });
}

export async function rollback(
  plotId: string,
  snapshotId: string,
  body?: RollbackRequest,
  token?: string,
): Promise<PlotDetailResponse> {
  if (USE_MOCK) {
    const { getMockPlotDetail } = await import("@/mocks/data/plots");
    return getMockPlotDetail(plotId);
  }
  return apiClient<PlotDetailResponse>(`/plots/${plotId}/rollback/${snapshotId}`, {
    method: "POST",
    body,
    token,
  });
}

export async function getRollbackLogs(
  plotId: string,
  params?: { limit?: number; offset?: number },
  token?: string,
): Promise<RollbackLogListResponse> {
  if (USE_MOCK) {
    const { mockRollbackLogs } = await import("@/mocks/data/snapshots");
    const filtered = mockRollbackLogs.filter((l) => l.plotId === plotId);
    const limit = params?.limit ?? 20;
    const offset = params?.offset ?? 0;
    return {
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }
  return apiClient<RollbackLogListResponse>(`/plots/${plotId}/rollback-logs`, {
    params,
    token,
  });
}
