import { apiClient } from "../client";
import type {
  CreatePlotRequest,
  PlotDetailResponse,
  PlotListResponse,
  PlotResponse,
  UpdatePlotRequest,
} from "../types";

export async function list(
  params?: { tag?: string; limit?: number; offset?: number },
  token?: string,
): Promise<PlotListResponse> {
  return apiClient<PlotListResponse>("/plots", { params, token });
}

export async function get(plotId: string, token?: string): Promise<PlotDetailResponse> {
  return apiClient<PlotDetailResponse>(`/plots/${plotId}`, { token });
}

export async function create(body: CreatePlotRequest, token?: string): Promise<PlotResponse> {
  return apiClient<PlotResponse>("/plots", {
    method: "POST",
    body,
    token,
  });
}

export async function update(
  plotId: string,
  body: UpdatePlotRequest,
  token?: string,
): Promise<PlotResponse> {
  return apiClient<PlotResponse>(`/plots/${plotId}`, {
    method: "PUT",
    body,
    token,
  });
}

export async function remove(plotId: string, token?: string): Promise<void> {
  return apiClient<void>(`/plots/${plotId}`, {
    method: "DELETE",
    token,
  });
}

export async function trending(
  params?: { limit?: number },
  token?: string,
): Promise<PlotListResponse> {
  return apiClient<PlotListResponse>("/plots/trending", { params, token });
}

export async function popular(
  params?: { limit?: number },
  token?: string,
): Promise<PlotListResponse> {
  return apiClient<PlotListResponse>("/plots/popular", { params, token });
}

// API endpoint is /plots/new — named "latest" to avoid JS reserved word collision
export async function latest(
  params?: { limit?: number },
  token?: string,
): Promise<PlotListResponse> {
  return apiClient<PlotListResponse>("/plots/new", { params, token });
}
