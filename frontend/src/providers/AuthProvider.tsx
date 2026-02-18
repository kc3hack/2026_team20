"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { UserResponse } from "@/lib/api/types";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: UserResponse | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGitHub: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  handleUnauthorized: () => Promise<void>;
};

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
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

  const signInWithGitHub = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${getBaseUrl()}/auth/callback` },
    });
    if (error) toast.error(`GitHub ログインに失敗しました: ${error.message}`);
  }, [supabase]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${getBaseUrl()}/auth/callback` },
    });
    if (error) toast.error(`Google ログインに失敗しました: ${error.message}`);
  }, [supabase]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(`ログアウトに失敗しました: ${error.message}`);
  }, [supabase]);

  const handleUnauthorized = useCallback(async () => {
    toast.error("セッションが切れました。再度ログインしてください。");

    // React state だけでなくブラウザのセッション(cookie/localStorage)もクリアする
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(`ログアウト処理に失敗しました: ${error.message}`);
      }
    } catch (_e) {
      // signOut 自体が例外を投げた場合
      toast.error("ログアウト処理中にエラーが発生しました");
    }

    // state は常にクリア（安全側）
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
