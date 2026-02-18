"use client";

import type { UserResponse } from "@/lib/api/types";
import { createClient } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type AuthContextValue = {
  user: UserResponse | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGitHub: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  handleUnauthorized: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ? mapSupabaseUser(currentSession.user) : null);
      setIsLoading(false);
    });

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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast.error(`GitHub ログインに失敗しました: ${error.message}`);
  }, [supabase]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast.error(`Google ログインに失敗しました: ${error.message}`);
  }, [supabase]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(`ログアウトに失敗しました: ${error.message}`);
  }, [supabase]);

  const handleUnauthorized = useCallback(() => {
    toast.error("セッションが切れました。再度ログインしてください。");
    setSession(null);
    setUser(null);
  }, []);

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
