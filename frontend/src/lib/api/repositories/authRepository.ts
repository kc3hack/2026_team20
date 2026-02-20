import { apiClient } from "../client";
import type { PlotListResponse, UserProfileResponse, UserResponse } from "../types";

export async function getCurrentUser(token?: string): Promise<UserResponse> {
  return apiClient<UserResponse>("/auth/me", { token });
}

export async function getUserProfile(
  username: string,
  token?: string,
): Promise<UserProfileResponse> {
  return apiClient<UserProfileResponse>(`/auth/users/${username}`, { token });
}

export async function getUserPlots(username: string, token?: string): Promise<PlotListResponse> {
  return apiClient<PlotListResponse>(`/auth/users/${username}/plots`, { token });
}

export async function getUserContributions(
  username: string,
  token?: string,
): Promise<PlotListResponse> {
  return apiClient<PlotListResponse>(`/auth/users/${username}/contributions`, {
    token,
  });
}
