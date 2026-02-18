import {
  PlotResponse,
  PlotListResponse,
  PlotDetailResponse,
  CreatePlotRequest,
  UpdatePlotRequest,
  ListPlotsParams,
  ApiErrorResponse,
} from "./types";
import { apiClient } from "./client";
import { parseContent } from "@/lib/utils";

const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/**
 * プロットリポジトリ
 * Plot API との通信を担当
 */
export const plotRepository = {
  /**
   * プロット一覧を取得
   * GET /plots
   */
  async list(params: ListPlotsParams = {}): Promise<PlotListResponse> {
    if (isMock) {
      // Mock: useMockData フックは React コンポーネント内でのみ使用可能なため、
      // ここでは直接 mock data にアクセス
      const { mockPlotList } = await import("@/mocks/data/plots");
      const { filterMockPlots } = await import("@/mocks/data/plots");
      
      const filtered = filterMockPlots(params);
      
      return {
        plots: filtered,
        total: filtered.length,
      };
    }

    // Real API
    const queryParams: Record<string, string> = {};
    
    if (params.limit !== undefined) queryParams.limit = String(params.limit);
    if (params.offset !== undefined) queryParams.offset = String(params.offset);
    if (params.sort) queryParams.sort = params.sort;
    if (params.order) queryParams.order = params.order;
    if (params.author) queryParams.author = params.author;
    if (params.tag) queryParams.tag = params.tag;
    if (params.search) queryParams.search = params.search;
    if (params.starred !== undefined) queryParams.starred = String(params.starred);

    return apiClient("/plots", {
      params: queryParams,
    });
  },

  /**
   * プロット詳細を取得
   * GET /plots/{plotId}
   */
  async get(plotId: string): Promise<PlotDetailResponse> {
    if (isMock) {
      const { getMockPlotById } = await import("@/mocks/data/plots");
      const plot = getMockPlotById(plotId);
      
      if (!plot) {
        const error: ApiErrorResponse = {
          error: {
            code: "NOT_FOUND",
            message: "Plot not found",
          },
        };
        throw error;
      }

      // Content をパースして返す
      return {
        ...plot,
        content: parseContent(plot.content),
      };
    }

    return apiClient(`/plots/${plotId}`);
  },

  /**
   * プロットを作成
   * POST /plots
   */
  async create(data: CreatePlotRequest): Promise<PlotResponse> {
    if (isMock) {
      const { createPlot } = await import("@/mocks/service");
      return createPlot(data);
    }

    return apiClient("/plots", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * プロットを更新
   * PUT /plots/{plotId}
   */
  async update(plotId: string, data: UpdatePlotRequest): Promise<PlotResponse> {
    if (isMock) {
      const { updatePlot } = await import("@/mocks/service");
      return updatePlot(plotId, data);
    }

    return apiClient(`/plots/${plotId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * プロットを削除
   * DELETE /plots/{plotId}
   */
  async delete(plotId: string): Promise<void> {
    if (isMock) {
      const { deletePlot } = await import("@/mocks/service");
      deletePlot(plotId);
      return;
    }

    await apiClient(`/plots/${plotId}`, {
      method: "DELETE",
    });
  },

  /**
   * 急上昇プロットを取得
   * GET /plots/trending
   */
  async trending(params: { limit?: number; days?: number } = {}): Promise<PlotListResponse> {
    if (isMock) {
      const { mockTrendingPlots } = await import("@/mocks/data/plots");
      
      let plots = mockTrendingPlots;
      if (params.limit) {
        plots = plots.slice(0, params.limit);
      }
      
      return {
        plots,
        total: plots.length,
      };
    }

    const queryParams: Record<string, string> = {};
    if (params.limit !== undefined) queryParams.limit = String(params.limit);
    if (params.days !== undefined) queryParams.days = String(params.days);

    return apiClient("/plots/trending", {
      params: queryParams,
    });
  },

  /**
   * 人気プロットを取得
   * GET /plots/popular
   */
  async popular(params: { limit?: number } = {}): Promise<PlotListResponse> {
    if (isMock) {
      const { mockPopularPlots } = await import("@/mocks/data/plots");
      
      let plots = mockPopularPlots;
      if (params.limit) {
        plots = plots.slice(0, params.limit);
      }
      
      return {
        plots,
        total: plots.length,
      };
    }

    const queryParams: Record<string, string> = {};
    if (params.limit !== undefined) queryParams.limit = String(params.limit);

    return apiClient("/plots/popular", {
      params: queryParams,
    });
  },

  /**
   * 新着プロットを取得
   * GET /plots/new
   */
  async newest(params: { limit?: number } = {}): Promise<PlotListResponse> {
    if (isMock) {
      const { mockNewPlots } = await import("@/mocks/data/plots");
      
      let plots = mockNewPlots;
      if (params.limit) {
        plots = plots.slice(0, params.limit);
      }
      
      return {
        plots,
        total: plots.length,
      };
    }

    const queryParams: Record<string, string> = {};
    if (params.limit !== undefined) queryParams.limit = String(params.limit);

    return apiClient("/plots/new", {
      params: queryParams,
    });
  },
};
