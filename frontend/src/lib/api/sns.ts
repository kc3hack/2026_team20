import { apiClient } from "./client";
import type {
  StarListResponse,
  ThreadResponse,
  CommentResponse,
  CommentListResponse,
  PlotResponse,
  ForkPlotRequest,
  CreateCommentRequest,
} from "./types";

const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const snsRepository = {
  /**
   * スター一覧取得
   * GET /plots/{plotId}/stars
   */
  async listStars(params: { plotId: string }): Promise<StarListResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      const stars = mockService.listStars({ plotId: params.plotId });
      return {
        stars: stars.map((s) => ({
          user: {
            id: s.user_id,
            displayName: "",
            avatarUrl: null,
          },
          created_at: s.created_at,
        })),
        total: stars.length,
      };
    }

    return apiClient<StarListResponse>(
      `/plots/${params.plotId}/stars`,
      {},
    );
  },

  /**
   * スター追加
   * POST /plots/{plotId}/stars
   */
  async addStar(params: { plotId: string }): Promise<void> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      mockService.addStar({ plotId: params.plotId });
      return;
    }

    await apiClient(`/plots/${params.plotId}/stars`, {
      method: "POST",
    });
  },

  /**
   * スター削除
   * DELETE /plots/{plotId}/stars
   */
  async removeStar(params: { plotId: string }): Promise<void> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      mockService.removeStar({ plotId: params.plotId });
      return;
    }

    await apiClient(`/plots/${params.plotId}/stars`, {
      method: "DELETE",
    });
  },

  /**
   * フォーク作成
   * POST /plots/{plotId}/fork
   */
  async forkPlot(params: {
    plotId: string;
    data?: ForkPlotRequest;
  }): Promise<PlotResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      const plot = mockService.getPlot(params.plotId);
      return plot as unknown as PlotResponse;
    }

    return apiClient<PlotResponse>(`/plots/${params.plotId}/fork`, {
      method: "POST",
      // biome-ignore lint/suspicious/noExplicitAny: client.ts accepts any JSON-serializable body
      body: params.data as any,
    });
  },

  /**
   * スレッド作成
   * POST /threads
   */
  async createThread(params: {
    plotId: string;
    sectionId?: string;
  }): Promise<ThreadResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      return mockService.createThread({
        plotId: params.plotId,
        title: "",
      });
    }

    return apiClient<ThreadResponse>("/threads", {
      method: "POST",
      body: {
        plotId: params.plotId,
        sectionId: params.sectionId,
      // biome-ignore lint/suspicious/noExplicitAny: client.ts accepts any JSON-serializable body
      } as any,
    });
  },

  /**
   * スレッド一覧取得（Mock 互換用）
   */
  async listThreads(params: {
    plotId?: string;
    sectionId?: string;
  }): Promise<{ threads: ThreadResponse[]; total: number }> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      const result = mockService.listThreads({
        plotId: params.plotId,
        sectionId: params.sectionId,
      });
      return { threads: result.items, total: result.total };
    }

    const queryParams: Record<string, string> = {};
    if (params.plotId) queryParams.plotId = params.plotId;
    if (params.sectionId) queryParams.sectionId = params.sectionId;

    return apiClient<{ threads: ThreadResponse[]; total: number }>(
      "/threads",
      { params: queryParams },
    );
  },

  /**
   * コメント一覧取得
   * GET /threads/{threadId}/comments
   */
  async listComments(params: {
    threadId: string;
    limit?: number;
    offset?: number;
  }): Promise<CommentListResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      return mockService.listComments({ threadId: params.threadId });
    }

    return apiClient<CommentListResponse>(
      `/threads/${params.threadId}/comments`,
      {
        params: {
          limit: params.limit,
          offset: params.offset,
        },
      },
    );
  },

  /**
   * コメント投稿
   * POST /threads/{threadId}/comments
   */
  async createComment(params: {
    threadId: string;
    data: CreateCommentRequest;
  }): Promise<CommentResponse> {
    if (isMock) {
      const { mockService } = await import("@/mocks/service");
      return mockService.createComment({
        threadId: params.threadId,
        content: params.data.content,
      });
    }

    return apiClient<CommentResponse>(
      `/threads/${params.threadId}/comments`,
      {
        method: "POST",
        // biome-ignore lint/suspicious/noExplicitAny: client.ts accepts any JSON-serializable body
      body: params.data as any,
      },
    );
  },
};
