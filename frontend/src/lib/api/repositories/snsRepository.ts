import { apiClient } from "../client";
import type {
  CommentListResponse,
  CommentResponse,
  CreateCommentRequest,
  CreateThreadRequest,
  ForkPlotRequest,
  PlotResponse,
  StarListResponse,
  ThreadResponse,
} from "../types";

// 🔀 環境変数で Mock / 実 API を切り替え
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function getStars(plotId: string, token?: string): Promise<StarListResponse> {
  if (USE_MOCK) {
    const { mockStarList } = await import("@/mocks/data/sns");
    return mockStarList;
  }
  return apiClient<StarListResponse>(`/plots/${plotId}/stars`, { token });
}

export async function addStar(plotId: string, token?: string): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  return apiClient<void>(`/plots/${plotId}/stars`, {
    method: "POST",
    token,
  });
}

export async function removeStar(plotId: string, token?: string): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  return apiClient<void>(`/plots/${plotId}/stars`, {
    method: "DELETE",
    token,
  });
}

export async function fork(
  plotId: string,
  body?: ForkPlotRequest,
  token?: string,
): Promise<PlotResponse> {
  if (USE_MOCK) {
    const { mockPlots } = await import("@/mocks/data/plots");
    const original = mockPlots.find((p) => p.id === plotId) ?? mockPlots[0];
    return {
      ...original,
      id: `mock-fork-${Date.now()}`,
      title: body?.title ?? `${original.title} (Fork)`,
      ownerId: "user-owner-001",
      starCount: 0,
      isStarred: false,
      version: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return apiClient<PlotResponse>(`/plots/${plotId}/fork`, {
    method: "POST",
    body,
    token,
  });
}

export async function createThread(
  body: CreateThreadRequest,
  token?: string,
): Promise<ThreadResponse> {
  if (USE_MOCK) {
    return {
      id: `mock-thread-${Date.now()}`,
      plotId: body.plotId,
      sectionId: body.sectionId ?? null,
      commentCount: 0,
      createdAt: new Date().toISOString(),
    };
  }
  return apiClient<ThreadResponse>("/threads", {
    method: "POST",
    body,
    token,
  });
}

export async function getComments(
  threadId: string,
  params?: { limit?: number; offset?: number },
  token?: string,
): Promise<CommentListResponse> {
  if (USE_MOCK) {
    const { mockCommentList } = await import("@/mocks/data/sns");
    return mockCommentList;
  }
  return apiClient<CommentListResponse>(`/threads/${threadId}/comments`, {
    params,
    token,
  });
}

export async function addComment(
  threadId: string,
  body: CreateCommentRequest,
  token?: string,
): Promise<CommentResponse> {
  if (USE_MOCK) {
    const { mockUsers } = await import("@/mocks/data/users");
    return {
      id: `mock-comment-${Date.now()}`,
      threadId,
      content: body.content,
      parentCommentId: body.parentCommentId ?? null,
      user: {
        id: mockUsers.owner.id,
        displayName: mockUsers.owner.displayName,
        avatarUrl: mockUsers.owner.avatarUrl,
      },
      createdAt: new Date().toISOString(),
    };
  }
  return apiClient<CommentResponse>(`/threads/${threadId}/comments`, {
    method: "POST",
    body,
    token,
  });
}
