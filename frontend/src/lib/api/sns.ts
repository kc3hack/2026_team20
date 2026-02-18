import { apiClient, ApiError } from "./client";
import type {
  StarListResponse,
  ThreadResponse,
  CommentResponse,
  ThreadListResponse,
  CommentListResponse,
  ForkPlotRequest,
  CreateThreadRequest,
  CreateCommentRequest,
} from "./types";

const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/**
 * スター一覧を取得
 */
export async function listStars(params: { plotId: string }): Promise<StarListResponse> {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    const stars = mockService.listStars({ plotId: params.plotId });
    return {
      stars: stars.map(s => ({
        user: { id: s.user_id, display_name: '', avatar_url: '' },
        created_at: s.created_at,
      })),
      total: stars.length,
    };
  }

  return apiClient<StarListResponse>(`/plots/${params.plotId}/stars`);
}

/**
 * スターを追加
 */
export async function addStar(params: { plotId: string }): Promise<void> {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    mockService.addStar({ plotId: params.plotId });
    return;
  }

  await apiClient(`/plots/${params.plotId}/stars`, {
    method: "POST",
  });
}

/**
 * スターを削除
 */
export async function removeStar(params: { plotId: string }): Promise<void> {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    mockService.removeStar({ plotId: params.plotId });
    return;
  }

  await apiClient(`/plots/${params.plotId}/stars`, {
    method: "DELETE",
  });
}

/**
 * プロットをフォーク
 */
export async function forkPlot(params: {
  plotId: string;
  data: ForkPlotRequest;
}): Promise<{ id: string; title: string }> {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    const plot = mockService.getPlot(params.plotId);
    return { id: plot?.id || '', title: plot?.title || '' };
  }

  return apiClient<{ id: string; title: string }>(
    `/plots/${params.plotId}/fork`,
    {
      method: "POST",
      body: JSON.stringify(params.data),
    }
  );
}

/**
 * スレッド一覧を取得
 */
export async function listThreads(params: {
  plotId?: string;
  sectionId?: string;
}): Promise<ThreadListResponse> {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    const result = mockService.listThreads({ plotId: params.plotId, sectionId: params.sectionId });
    return { threads: result.items, total: result.total };
  }

  const query = new URLSearchParams();
  if (params.plotId) query.append("plotId", params.plotId);
  if (params.sectionId) query.append("sectionId", params.sectionId);

  return apiClient<ThreadListResponse>(`/threads?${query.toString()}`);
}

/**
 * スレッドを作成
 */
export async function createThread(params: {
  plotId: string;
  data: CreateThreadRequest;
}): Promise<ThreadResponse> {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    return mockService.createThread({ plotId: params.plotId, title: params.data.title });
  }

  return apiClient<ThreadResponse>("/threads", {
    method: "POST",
    body: JSON.stringify(params.data),
  });
}

/**
 * コメント一覧を取得
 */
export async function listComments(params: {
  threadId: string;
}): Promise<CommentListResponse> {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    return mockService.listComments({ threadId: params.threadId });
  }

  return apiClient<CommentListResponse>(`/threads/${params.threadId}/comments`);
}

/**
 * コメントを作成
 */
export async function createComment(params: {
  threadId: string;
  data: CreateCommentRequest;
}): Promise<CommentResponse> {
  if (isMock) {
    const { mockService } = await import("@/mocks/service");
    return mockService.createComment({ threadId: params.threadId, content: params.data.content });
  }

  return apiClient<CommentResponse>(
    `/threads/${params.threadId}/comments`,
    {
      method: "POST",
      body: JSON.stringify(params.data),
    }
  );
}

export const snsRepository = {
  listStars,
  addStar,
  removeStar,
  forkPlot,
  listThreads,
  createThread,
  listComments,
  createComment,
};
