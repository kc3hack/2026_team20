import { createBrowserClient } from "@supabase/ssr";
import { apiClient } from "./client";
import type {
  UserResponse,
  UserProfileResponse,
  PlotListResponse,
} from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing");
}

const supabase = createBrowserClient(
  supabaseUrl || "",
  supabaseAnonKey || "",
);



/**
 * 認証リポジトリ
 * Mock モードでも Supabase 認証を直接使用する（Mock 分岐なし）
 */
export const authRepository = {
  async signInWithGitHub() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;
    return data;
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  onAuthStateChange(
    callback: (event: string, session: unknown) => void,
  ) {
    return supabase.auth.onAuthStateChange(callback);
  },

  /**
   * 現在のユーザー情報取得
   * GET /auth/me
   */
  async getCurrentUser(): Promise<UserResponse> {
    const token = (await supabase.auth.getSession()).data.session
      ?.access_token;

    if (!token) {
      throw new Error("Not authenticated");
    }

    return apiClient<UserResponse>("/auth/me", {
      token,
    });
  },

  /**
   * ユーザー情報取得
   * GET /auth/users/{username}
   */
  async getUserProfile(username: string): Promise<UserProfileResponse> {
    return apiClient<UserProfileResponse>(
      `/auth/users/${encodeURIComponent(username)}`,
      {},
    );
  },

  /**
   * ユーザーのPlot一覧取得
   * GET /auth/users/{username}/plots
   */
  async getUserPlots(username: string): Promise<PlotListResponse> {
    return apiClient<PlotListResponse>(
      `/auth/users/${encodeURIComponent(username)}/plots`,
      {},
    );
  },

  /**
   * ユーザーのコントリビューション一覧取得
   * GET /auth/users/{username}/contributions
   */
  async getUserContributions(username: string): Promise<PlotListResponse> {
    return apiClient<PlotListResponse>(
      `/auth/users/${encodeURIComponent(username)}/contributions`,
      {},
    );
  },
};

export default authRepository;
