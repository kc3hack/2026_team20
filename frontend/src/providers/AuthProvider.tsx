"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { UserResponse } from "@/lib/api/types";
import { createClient } from "@/lib/supabase/client";
import type { AuthContextValue } from "./types";

const AuthContext = createContext<AuthContextValue | null>(null);

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function mapSupabaseUser(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email ?? "",
    displayName:
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "Unknown",
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    createdAt: user.created_at,
  };
}

const MOCK_MODE = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock モードでは Supabase クライアントを生成しない
  // （プレースホルダー URL でも onAuthStateChange が内部でリクエストを飛ばすため回避）
  const supabase = useMemo(() => (MOCK_MODE ? null : createClient()), []);

  // Mock モード: ダミーユーザーで即座に認証済み状態にする
  // タブごとに異なるユーザーIDを生成し、他タブのロックを正しく排他制御できるようにする
  useEffect(() => {
    if (!MOCK_MODE) return;

    // sessionStorage はタブごとに独立しているため、タブ単位でユニークなIDが得られる
    const STORAGE_KEY = "mock-user-id";
    let tabUserId = sessionStorage.getItem(STORAGE_KEY);
    if (!tabUserId) {
      tabUserId = `mock-user-${crypto.randomUUID()}`;
      sessionStorage.setItem(STORAGE_KEY, tabUserId);
    }

    const mockUser: UserResponse = {
      id: tabUserId,
      email: "mock@example.com",
      displayName: `Mockユーザー(${tabUserId.slice(-6)})`,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    };
    setUser(mockUser);
    // Session は型的に null でも isAuthenticated チェックに影響するためダミー値を作る
    setSession({ access_token: "mock-token", refresh_token: "mock-refresh" } as Session);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (MOCK_MODE || !supabase) return;

    // onAuthStateChange はマウント時に INITIAL_SESSION イベントを発火するため、
    // getSession() は不要。二重 state 更新を防ぐために onAuthStateChange のみで管理する。
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ? mapSupabaseUser(newSession.user) : null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signInWithOAuth = useCallback(
    async (provider: "github" | "google", redirectTo?: string) => {
      if (!supabase) return;
      const callbackUrl = new URL("/auth/callback", getBaseUrl());
      if (redirectTo) {
        callbackUrl.searchParams.set("next", redirectTo);
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl.toString() },
      });
      if (error) {
        const label = provider === "github" ? "GitHub" : "Google";
        toast.error(`${label} ログインに失敗しました: ${error.message}`);
      }
    },
    [supabase],
  );

  const signInWithGitHub = useCallback(
    (redirectTo?: string) => signInWithOAuth("github", redirectTo),
    [signInWithOAuth],
  );

  const signInWithGoogle = useCallback(
    (redirectTo?: string) => signInWithOAuth("google", redirectTo),
    [signInWithOAuth],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(`ログアウトに失敗しました: ${error.message}`);
  }, [supabase]);

  const handleUnauthorized = useCallback(async () => {
    toast.error("セッションが切れました。再度ログインしてください。");

    if (supabase) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          toast.error(`ログアウト処理に失敗しました: ${error.message}`);
        }
      } catch (_e) {
        toast.error("ログアウト処理中にエラーが発生しました");
      }
    }

    setSession(null);
    setUser(null);
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated: !!session && !!user,
      signInWithGitHub,
      signInWithGoogle,
      signOut,
      handleUnauthorized,
    }),
    [user, session, isLoading, signInWithGitHub, signInWithGoogle, signOut, handleUnauthorized],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
