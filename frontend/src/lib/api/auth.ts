import { createBrowserClient } from '@supabase/ssr';
import type {
  UserResponse,
  UserProfileResponse,
} from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing');
}

const supabase = createBrowserClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

/**
 * 認証リポジトリ
 * Note: Mock モードでは認証機能は使用しない
 * 実際の Supabase 認証を直接使用する
 */
export const authRepository = {
  /**
   * GitHub OAuth でログイン
   */
  async signInWithGitHub() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw error;
    }

    return data;
  },

  /**
   * Google OAuth でログイン
   */
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw error;
    }

    return data;
  },

  /**
   * ログアウト
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  },

  /**
   * 現在のセッションを取得
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return data.session;
  },

  /**
   * 現在のユーザーを取得
   */
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    return user;
  },

  /**
   * 認証状態の変更を監視
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  /**
   * ユーザー情報を取得
   * GET /auth/me
   */
  async getCurrentUser(): Promise<UserResponse> {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    return response.json();
  },

  /**
   * ユーザー公開プロフィールを取得
   * GET /auth/users/{username}
   */
  async getUserProfile(username: string): Promise<UserProfileResponse> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/users/${encodeURIComponent(username)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('User not found');
      }
      throw new Error('Failed to fetch user profile');
    }

    return response.json();
  },

  /**
   * ユーザー名の使用可能性を確認
   * GET /auth/check-username?username={username}
   */
  async checkUsername(username: string): Promise<{ available: boolean }> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/check-username?username=${encodeURIComponent(username)}`
    );

    if (!response.ok) {
      throw new Error('Failed to check username');
    }

    return response.json();
  },

  /**
   * プロフィールを更新
   * PUT /auth/me
   */
  async updateProfile(profile: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
  }): Promise<UserResponse> {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    return response.json();
  },

  /**
   * アカウントを削除
   * DELETE /auth/me
   */
  async deleteAccount(): Promise<void> {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete account');
    }
  },
};

export default authRepository;
