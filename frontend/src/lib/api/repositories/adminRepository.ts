import { apiClient } from "../client";
import type { BanUserRequest, PausePlotRequest, UnbanUserRequest } from "../types";

// 🔀 環境変数で Mock / 実 API を切り替え
// 管理操作は Mock モードでは no-op（何もしない）
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function banUser(body: BanUserRequest, token?: string): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  return apiClient<void>("/admin/bans", {
    method: "POST",
    body,
    token,
  });
}

export async function unbanUser(body: UnbanUserRequest, token?: string): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  return apiClient<void>("/admin/bans", {
    method: "DELETE",
    body,
    token,
  });
}

export async function pausePlot(
  plotId: string,
  body?: PausePlotRequest,
  token?: string,
): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  return apiClient<void>(`/plots/${plotId}/pause`, {
    method: "POST",
    body,
    token,
  });
}

export async function resumePlot(plotId: string, token?: string): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  return apiClient<void>(`/plots/${plotId}/pause`, {
    method: "DELETE",
    token,
  });
}
