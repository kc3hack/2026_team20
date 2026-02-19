import { apiClient } from "./client";
import type {
  HistoryListResponse,
  DiffResponse,
  SaveOperationRequest,
  SnapshotListResponse,
  SnapshotDetailResponse,
  PlotDetailResponse,
  RollbackRequest,
  RollbackLogListResponse,
} from "./types";

const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const historyRepository = {
  /**
   * 操作ログ保存
   * POST /sections/{sectionId}/operations
   */
  async saveOperation(params: {
    sectionId: string;
    data: SaveOperationRequest;
  }): Promise<void> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      mockService.saveOperation({
        plotId: "",
        operationType: params.data.operationType as "create" | "update" | "delete",
        description: `Operation: ${params.data.operationType}`,
      });
      return;
    }

    await apiClient<void>(`/sections/${params.sectionId}/operations`, {
      method: "POST",
      // biome-ignore lint/suspicious/noExplicitAny: client.ts accepts any JSON-serializable body
      body: params.data as any,
    });
  },

  /**
   * 操作ログ一覧取得
   * GET /sections/{sectionId}/history
   */
  async list(params: {
    plot_id?: string;
    sectionId?: string;
    limit?: number;
    offset?: number;
  }): Promise<HistoryListResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      return mockService.listHistory({
        plotId: params.plot_id,
        sectionId: params.sectionId,
        limit: params.limit,
        offset: params.offset,
      });
    }

    const sectionId = params.sectionId;
    if (!sectionId) {
      return { items: [], total: 0 };
    }

    return apiClient<HistoryListResponse>(`/sections/${sectionId}/history`, {
      params: {
        limit: params.limit,
        offset: params.offset,
      },
    });
  },

  /**
   * 差分取得
   * GET /sections/{sectionId}/diff/{fromVersion}/{toVersion}
   */
  async getDiff(params: {
    sectionId: string;
    fromVersion: number;
    toVersion: number;
  }): Promise<DiffResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      return mockService.getDiff({
        historyId: `${params.fromVersion}-${params.toVersion}`,
      });
    }

    return apiClient<DiffResponse>(
      `/sections/${params.sectionId}/diff/${params.fromVersion}/${params.toVersion}`,
      {},
    );
  },

  /**
   * スナップショット一覧取得
   * GET /plots/{plotId}/snapshots
   */
  async listSnapshots(params: {
    plotId: string;
    limit?: number;
    offset?: number;
  }): Promise<SnapshotListResponse> {
    if (isMock) {
      return { items: [], total: 0 };
    }

    return apiClient<SnapshotListResponse>(`/plots/${params.plotId}/snapshots`, {
      params: {
        limit: params.limit,
        offset: params.offset,
      },
    });
  },

  /**
   * スナップショット詳細取得
   * GET /plots/{plotId}/snapshots/{snapshotId}
   */
  async getSnapshot(params: {
    plotId: string;
    snapshotId: string;
  }): Promise<SnapshotDetailResponse> {
    if (isMock) {
      return {
        id: params.snapshotId,
        plotId: params.plotId,
        version: 1,
        content: null,
        createdAt: new Date().toISOString(),
      };
    }

    return apiClient<SnapshotDetailResponse>(
      `/plots/${params.plotId}/snapshots/${params.snapshotId}`,
      {},
    );
  },

  /**
   * ロールバック
   * POST /plots/{plotId}/rollback/{snapshotId}
   */
  async rollback(params: {
    plotId: string;
    snapshotId: string;
    data?: RollbackRequest;
  }): Promise<PlotDetailResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      mockService.rollback({ historyId: params.snapshotId });
      return {} as PlotDetailResponse;
    }

    return apiClient<PlotDetailResponse>(
      `/plots/${params.plotId}/rollback/${params.snapshotId}`,
      {
        method: "POST",
        // biome-ignore lint/suspicious/noExplicitAny: client.ts accepts any JSON-serializable body
      body: params.data as any,
      },
    );
  },

  /**
   * ロールバック監査ログ一覧取得
   * GET /plots/{plotId}/rollback-logs
   */
  async listRollbackLogs(params: {
    plotId: string;
    limit?: number;
    offset?: number;
  }): Promise<RollbackLogListResponse> {
    if (isMock) {
      return { items: [], total: 0 };
    }

    return apiClient<RollbackLogListResponse>(
      `/plots/${params.plotId}/rollback-logs`,
      {
        params: {
          limit: params.limit,
          offset: params.offset,
        },
      },
    );
  },
};
