import { createClient } from "@/lib/supabase/client";
import { apiClient } from "../client";
import type {
  PlotListResponse,
  UpdateProfileRequest,
  UserProfileResponse,
  UserResponse,
} from "../types";

// 🔀 環境変数で Mock / 実 API を切り替え
// ⚠️ getCurrentUser は Supabase SDK を直接使用（Mock 対象外）
// getUserProfile / getUserPlots / getUserContributions は REST API なので Mock 分岐あり
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/**
 * 現在のログインユーザー情報を取得する。
 *
 * 仕様: authRepository は Supabase SDK (@supabase/ssr) を直接使用する薄いラッパー。
 * 認証フローを Mock で再現するのは困難なため、常に実際の Supabase Auth を使用する。
 */
export async function getCurrentUser(): Promise<UserResponse> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error(error?.message ?? "Not authenticated");
  }

  return {
    id: user.id,
    email: user.email ?? "",
    displayName:
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "Unknown",
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    createdAt: user.created_at,
  };
}

export async function getUserProfile(
  username: string,
  token?: string,
): Promise<UserProfileResponse> {
  if (USE_MOCK) {
    const { mockUserProfile } = await import("@/mocks/data/users");
    return mockUserProfile;
  }
  return apiClient<UserProfileResponse>(`/auth/users/${username}`, { token });
}

export async function getUserPlots(username: string, token?: string): Promise<PlotListResponse> {
  if (USE_MOCK) {
    const { mockUserPlots } = await import("@/mocks/data/users");
    return mockUserPlots;
  }
  return apiClient<PlotListResponse>(`/auth/users/${username}/plots`, { token });
}

export async function getUserContributions(
  username: string,
  token?: string,
): Promise<PlotListResponse> {
  if (USE_MOCK) {
    const { mockUserContributions } = await import("@/mocks/data/users");
    return mockUserContributions;
  }
  return apiClient<PlotListResponse>(`/auth/users/${username}/contributions`, {
    token,
  });
}

export async function updateProfile(
  body: UpdateProfileRequest,
  token?: string,
): Promise<UserResponse> {
  if (USE_MOCK) {
    const { mockUserProfile } = await import("@/mocks/data/users");
    return {
      id: mockUserProfile.id,
      email: "mock@example.com",
      displayName: body.displayName ?? mockUserProfile.displayName,
      avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : mockUserProfile.avatarUrl,
      createdAt: mockUserProfile.createdAt,
    };
  }
  return apiClient<UserResponse>("/auth/me", { method: "PUT", body, token });
}
