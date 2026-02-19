import type {
  PlotResponse,
  PlotListResponse,
  PlotDetailResponse,
  CreatePlotRequest,
  UpdatePlotRequest,
  ListPlotsParams,
} from "./types";
import { apiClient } from "./client";

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
      const { mockService } = await import("@/mocks/service");
      const result = mockService.filterPlots(params);
      return {
        plots: result.items,
        total: result.total,
      };
    }

    return apiClient<PlotListResponse>("/plots", {
      params: {
        tag: params.tag,
        limit: params.limit,
        offset: params.offset,
        sort: params.sort,
        order: params.order,
        author: params.author,
        search: params.search,
        starred: params.starred,
      },
    });
  },

  /**
   * プロット詳細を取得
   * GET /plots/{plotId}
   */
  async get(plotId: string): Promise<PlotDetailResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      const plot = mockService.getPlot(plotId);

      if (!plot) {
        throw new Error("Plot not found");
      }

      // Mock ではセクションデータも取得して PlotDetailResponse を構築する
      const sections = mockService.listSections({ plotId });

      return {
        ...plot,
        content: { type: "doc", content: [] },
        sections,
        owner: null,
      } as PlotDetailResponse;
    }

    return apiClient<PlotDetailResponse>(`/plots/${plotId}`, {});
  },

  /**
   * プロットを作成
   * POST /plots
   */
  async create(data: CreatePlotRequest): Promise<PlotResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      // mockService.createPlot の戻り値は PlotResponse と完全には一致しないが、
      // Mock モードではテスト互換性のためそのまま返す
      return mockService.createPlot(data) as unknown as PlotResponse;
    }

    return apiClient<PlotResponse>("/plots", {
      method: "POST",
      // biome-ignore lint/suspicious/noExplicitAny: client.ts accepts any JSON-serializable body
      body: data as any,
    });
  },

  /**
   * プロットを更新
   * PUT /plots/{plotId}
   */
  async update(plotId: string, data: UpdatePlotRequest): Promise<PlotResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      return mockService.updatePlot({ id: plotId, ...data }) as unknown as PlotResponse;
    }

    return apiClient<PlotResponse>(`/plots/${plotId}`, {
      method: "PUT",
      // biome-ignore lint/suspicious/noExplicitAny: client.ts accepts any JSON-serializable body
      body: data as any,
    });
  },

  /**
   * プロットを削除
   * DELETE /plots/{plotId}
   */
  async delete(plotId: string): Promise<void> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      mockService.deletePlot({ id: plotId });
      return;
    }

    await apiClient<void>(`/plots/${plotId}`, {
      method: "DELETE",
    });
  },

  /**
   * 急上昇プロットを取得
   * GET /plots/trending
   */
  async trending(params: { limit?: number } = {}): Promise<PlotListResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      // トレンドはスター数降順でソートして返す
      const result = mockService.filterPlots({
        limit: params.limit,
        sort: "star_count",
        order: "desc",
      });
      return {
        plots: result.items,
        total: result.total,
      };
    }

    return apiClient<PlotListResponse>("/plots/trending", {
      params: {
        limit: params.limit,
      },
    });
  },

  /**
   * 人気プロットを取得
   * GET /plots/popular
   */
  async popular(params: { limit?: number } = {}): Promise<PlotListResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      const result = mockService.filterPlots({
        limit: params.limit,
        sort: "star_count",
        order: "desc",
      });
      return {
        plots: result.items,
        total: result.total,
      };
    }

    return apiClient<PlotListResponse>("/plots/popular", {
      params: {
        limit: params.limit,
      },
    });
  },

  /**
   * 新着プロットを取得
   * GET /plots/new
   */
  async newest(params: { limit?: number } = {}): Promise<PlotListResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      const result = mockService.filterPlots({
        limit: params.limit,
        sort: "created_at",
        order: "desc",
      });
      return {
        plots: result.items,
        total: result.total,
      };
    }

    return apiClient<PlotListResponse>("/plots/new", {
      params: {
        limit: params.limit,
      },
    });
  },
};
