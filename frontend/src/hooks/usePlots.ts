"use client";

import { useQuery } from "@tanstack/react-query";
import { plotRepository } from "@/lib/api/repositories";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/AuthProvider";

/**
 * 急上昇 Plot を取得するフック。
 * ホーム画面の「トレンド」セクションなどで使用。
 */
export function useTrendingPlots(limit = 5) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.plots.trending(),
    queryFn: () => plotRepository.trending({ limit }, session?.access_token),
  });
}

/**
 * 人気 Plot を取得するフック。
 * ホーム画面の「人気」セクションなどで使用。
 */
export function usePopularPlots(limit = 5) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.plots.popular(),
    queryFn: () => plotRepository.popular({ limit }, session?.access_token),
  });
}

/**
 * 新着 Plot を取得するフック。
 * ホーム画面の「新着」セクションなどで使用。
 */
export function useLatestPlots(limit = 5) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.plots.latest(),
    queryFn: () => plotRepository.latest({ limit }, session?.access_token),
  });
}

/**
 * 汎用 Plot 一覧を取得するフック。
 * タグ絞り込みやページネーションに対応。
 */
export function usePlotList(params?: { tag?: string; limit?: number; offset?: number }) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.plots.list(params),
    queryFn: () => plotRepository.list(params, session?.access_token),
  });
}

/**
 * Plot 詳細を取得するフック。
 * id が渡されるまでクエリを無効化する。
 */
export function usePlotDetail(id: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.plots.detail(id),
    queryFn: () => plotRepository.get(id, session?.access_token),
    enabled: !!id,
  });
}
