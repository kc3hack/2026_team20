import { apiClient } from "../client";
import type {
  CreatePlotRequest,
  PlotDetailResponse,
  PlotListResponse,
  PlotResponse,
  UpdatePlotRequest,
} from "../types";

// 🔀 環境変数で Mock / 実 API を切り替え
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function list(
  params?: { tag?: string; limit?: number; offset?: number },
  token?: string,
): Promise<PlotListResponse> {
  if (USE_MOCK) {
    const { getMockPlotList } = await import("@/mocks/data/plots");
    return getMockPlotList(params);
  }
  return apiClient<PlotListResponse>("/plots", { params, token });
}

export async function get(plotId: string, token?: string): Promise<PlotDetailResponse> {
  if (USE_MOCK) {
    const { getMockPlotDetail } = await import("@/mocks/data/plots");
    return getMockPlotDetail(plotId);
  }
  return apiClient<PlotDetailResponse>(`/plots/${plotId}`, { token });
}

export async function create(body: CreatePlotRequest, token?: string): Promise<PlotResponse> {
  if (USE_MOCK) {
    const { mockPlots } = await import("@/mocks/data/plots");
    return {
      id: `mock-${Date.now()}`,
      title: body.title,
      description: body.description ?? null,
      tags: body.tags ?? [],
      ownerId: "user-owner-001",
      starCount: 0,
      isStarred: false,
      isPaused: false,
      thumbnailUrl: body.thumbnailUrl ?? null,
      version: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
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
  if (USE_MOCK) {
    const { mockPlots } = await import("@/mocks/data/plots");
    const existing = mockPlots.find((p) => p.id === plotId) ?? mockPlots[0];
    return {
      ...existing,
      ...body,
      updatedAt: new Date().toISOString(),
    };
  }
  return apiClient<PlotResponse>(`/plots/${plotId}`, {
    method: "PUT",
    body,
    token,
  });
}

export async function remove(plotId: string, token?: string): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  return apiClient<void>(`/plots/${plotId}`, {
    method: "DELETE",
    token,
  });
}

export async function trending(
  params?: { limit?: number },
  token?: string,
): Promise<PlotListResponse> {
  if (USE_MOCK) {
    const { getMockTrendingPlots } = await import("@/mocks/data/plots");
    return getMockTrendingPlots(params?.limit);
  }
  return apiClient<PlotListResponse>("/plots/trending", { params, token });
}

export async function popular(
  params?: { limit?: number },
  token?: string,
): Promise<PlotListResponse> {
  if (USE_MOCK) {
    const { getMockPopularPlots } = await import("@/mocks/data/plots");
    return getMockPopularPlots(params?.limit);
  }
  return apiClient<PlotListResponse>("/plots/popular", { params, token });
}

// API endpoint is /plots/new — named "latest" to avoid JS reserved word collision
export async function latest(
  params?: { limit?: number },
  token?: string,
): Promise<PlotListResponse> {
  if (USE_MOCK) {
    const { getMockLatestPlots } = await import("@/mocks/data/plots");
    return getMockLatestPlots(params?.limit);
  }
  return apiClient<PlotListResponse>("/plots/new", { params, token });
}
