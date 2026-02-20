import { apiClient } from "../client";
import type {
  PlotDetailResponse,
  RollbackLogListResponse,
  RollbackRequest,
  SnapshotDetailResponse,
  SnapshotListResponse,
} from "../types";

export async function list(
  plotId: string,
  params?: { limit?: number; offset?: number },
  token?: string,
): Promise<SnapshotListResponse> {
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
  return apiClient<SnapshotDetailResponse>(`/plots/${plotId}/snapshots/${snapshotId}`, { token });
}

export async function rollback(
  plotId: string,
  snapshotId: string,
  body?: RollbackRequest,
  token?: string,
): Promise<PlotDetailResponse> {
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
  return apiClient<RollbackLogListResponse>(`/plots/${plotId}/rollback-logs`, {
    params,
    token,
  });
}
