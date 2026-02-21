"use client";

import { useQuery } from "@tanstack/react-query";
import { authRepository } from "@/lib/api/repositories";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/AuthProvider";

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
