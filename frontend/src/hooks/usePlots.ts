"use client";

import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { plotRepository } from "@/lib/api/repositories";
import type { CreatePlotRequest, UpdatePlotRequest } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

// ────────────────────────────────────────────────────────────────
// 認証について:
// Plot 一覧系エンドポイント（trending / popular / new / list / detail）は
// API 仕様上すべて認証不要（docs/api.md 参照）。
// session?.access_token が undefined（未ログイン時）でも正常に動作する。
// token を渡しているのは、ログイン済みユーザーに対して isStarred 等の
// パーソナライズ情報を返却できるようにするため。
// ────────────────────────────────────────────────────────────────
// エラーハンドリングについて:
// 各 useQuery フックに個別の onError / meta.errorMessage 等は設定していない。
// API エラーが発生した場合はグローバルの QueryClient defaultOptions や
// React Error Boundary で一括ハンドリングする方針（Issue #15 予定）。
// セクション単位のエラー表示が必要になった場合は、呼び出し側で
// useQuery の返却値 error / isError を参照して対応する。
// ────────────────────────────────────────────────────────────────

/**
 * 急上昇 Plot を取得するフック。
 * ホーム画面の「トレンド」セクションなどで使用。
 *
 * @param options.enabled - false を渡すとクエリを無効化できる。
 *   Plot 一覧ページのタブ切り替えなど、表示中のソートだけ
 *   リクエストを発火させたい場合に利用する。
 */
export function useTrendingPlots(limit = 5, options?: { enabled?: boolean }) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.plots.trending(limit),
    queryFn: () => plotRepository.trending({ limit }, session?.access_token),
    enabled: options?.enabled,
  });
}

/**
 * 人気 Plot を取得するフック。
 * ホーム画面の「人気」セクションなどで使用。
 *
 * @param options.enabled - false を渡すとクエリを無効化できる。
 */
export function usePopularPlots(limit = 5, options?: { enabled?: boolean }) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.plots.popular(limit),
    queryFn: () => plotRepository.popular({ limit }, session?.access_token),
    enabled: options?.enabled,
  });
}

/**
 * 新着 Plot を取得するフック。
 * ホーム画面の「新着」セクションなどで使用。
 *
 * @param options.enabled - false を渡すとクエリを無効化できる。
 */
export function useLatestPlots(limit = 5, options?: { enabled?: boolean }) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.plots.latest(limit),
    queryFn: () => plotRepository.latest({ limit }, session?.access_token),
    enabled: options?.enabled,
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
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Plot 作成ミューテーション。
 * 成功時に plots キャッシュを無効化して一覧を最新化する。
 */
export function useCreatePlot() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: (data: CreatePlotRequest) => {
      // POST /plots は要認証エンドポイント（docs/api.md 参照）。
      // AuthGuard 外でフックが使われた場合に備え、フック単体でもガードする。
      if (!session?.access_token) {
        throw new Error("認証が必要です");
      }
      return plotRepository.create(data, session.access_token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plots.all });
    },
  });
}

/**
 * Plot 更新ミューテーション。
 * 成功時に plots キャッシュを無効化して一覧・詳細を最新化する。
 */
export function useUpdatePlot() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: ({ plotId, data }: { plotId: string; data: UpdatePlotRequest }) => {
      // PUT /plots/{plotId} は要認証エンドポイント（docs/api.md 参照）。
      if (!session?.access_token) {
        throw new Error("認証が必要です");
      }
      return plotRepository.update(plotId, data, session.access_token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plots.all });
    },
  });
}
