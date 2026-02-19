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

export async function getStars(plotId: string, token?: string): Promise<StarListResponse> {
  return apiClient<StarListResponse>(`/plots/${plotId}/stars`, { token });
}

export async function addStar(plotId: string, token?: string): Promise<void> {
  return apiClient<void>(`/plots/${plotId}/stars`, {
    method: "POST",
    token,
  });
}

export async function removeStar(plotId: string, token?: string): Promise<void> {
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
  return apiClient<CommentResponse>(`/threads/${threadId}/comments`, {
    method: "POST",
    body,
    token,
  });
}
