import { apiClient } from "../client";
import type { DiffResponse, HistoryListResponse, SaveOperationRequest } from "../types";

export async function saveOperation(
  sectionId: string,
  body: SaveOperationRequest,
  token?: string,
): Promise<void> {
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
  return apiClient<DiffResponse>(`/sections/${sectionId}/diff/${fromVersion}/${toVersion}`, {
    token,
  });
}
