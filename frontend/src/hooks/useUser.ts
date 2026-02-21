"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { authRepository, imageRepository } from "@/lib/api/repositories";
import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";

/**
 * アバター画像を更新する mutation フック。
 *
 * フロー:
 * 1. imageRepository.upload で画像をアップロードし URL を取得
 * 2. authRepository.updateProfile で avatarUrl を更新
 * 3. supabase.auth.refreshSession で Supabase セッションを再取得
 *    → AuthProvider の onAuthStateChange が発火し、アプリ全体に新しい avatarUrl が反映される
 */
export function useUpdateAvatar() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const token = session?.access_token;

      // 1. 画像をアップロードして URL を取得
      const { url } = await imageRepository.upload(file, token);

      // 2. プロフィールの avatarUrl を更新
      const updatedUser = await authRepository.updateProfile(
        { avatarUrl: url },
        token,
      );

      // 3. Supabase セッションを再取得して AuthProvider に反映
      const supabase = createClient();
      await supabase.auth.refreshSession();

      return updatedUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success("アバターを更新しました");
    },
    onError: () => {
      toast.error("アバターの更新に失敗しました");
    },
  });
}

export function useUserProfile(username: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.profile(username),
    queryFn: () => authRepository.getUserProfile(username, session?.access_token),
    enabled: !!username,
  });
}

export function useUserPlots(
  username: string,
  params?: { limit?: number; offset?: number },
) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.plots(username, params),
    queryFn: () => authRepository.getUserPlots(username, session?.access_token),
    enabled: !!username,
  });
}

export function useUserContributions(
  username: string,
  params?: { limit?: number; offset?: number },
) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.contributions(username, params),
    queryFn: () =>
      authRepository.getUserContributions(username, session?.access_token),
    enabled: !!username,
  });
}
