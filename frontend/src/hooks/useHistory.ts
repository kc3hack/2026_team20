"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { historyRepository, snapshotRepository } from "@/lib/api/repositories";
import type { RollbackRequest } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/AuthProvider";

// ────────────────────────────────────────────────────────────────
// Query Keys
// ────────────────────────────────────────────────────────────────
// history / snapshot 関連のクエリキーを useHistory.ts 内で定義。
// query-keys.ts に追加すべきかは Issue #16（API 繋ぎ込み）で判断する。
// ────────────────────────────────────────────────────────────────

export const historyKeys = {
  all: ["history"] as const,
  list: (sectionId: string, params?: { limit?: number; offset?: number }) =>
    ["history", "list", sectionId, params] as const,
  diff: (sectionId: string, fromVersion: number, toVersion: number) =>
    ["history", "diff", sectionId, fromVersion, toVersion] as const,
};

export const snapshotKeys = {
  all: ["snapshots"] as const,
  list: (plotId: string, params?: { limit?: number; offset?: number }) =>
    ["snapshots", "list", plotId, params] as const,
  detail: (plotId: string, snapshotId: string) =>
    ["snapshots", "detail", plotId, snapshotId] as const,
  rollbackLogs: (plotId: string, params?: { limit?: number; offset?: number }) =>
    ["snapshots", "rollbackLogs", plotId, params] as const,
};

// ────────────────────────────────────────────────────────────────
// useHistory — セクションの操作ログ（HotOperation）一覧を取得
// ────────────────────────────────────────────────────────────────

/**
 * セクションの履歴（HotOperation, 72時間以内の操作ログ）を取得する。
 *
 * @param sectionId - 対象セクションの ID
 * @param params - ページネーション（デフォルト: limit=50, offset=0）
 */
export function useHistory(
  sectionId: string,
  params?: { limit?: number; offset?: number },
) {
  const { session } = useAuth();

  return useQuery({
    queryKey: historyKeys.list(sectionId, params),
    queryFn: () => historyRepository.getHistory(sectionId, params, session?.access_token),
    enabled: !!sectionId,
  });
}

// ────────────────────────────────────────────────────────────────
// useSnapshots — Plot のスナップショット（ColdSnapshot）一覧を取得
// ────────────────────────────────────────────────────────────────

/**
 * Plot のスナップショット一覧を取得する。
 *
 * @param plotId - 対象 Plot の ID
 * @param params - ページネーション（デフォルト: limit=20, offset=0）
 */
export function useSnapshots(
  plotId: string,
  params?: { limit?: number; offset?: number },
) {
  const { session } = useAuth();

  return useQuery({
    queryKey: snapshotKeys.list(plotId, params),
    queryFn: () => snapshotRepository.list(plotId, params, session?.access_token),
    enabled: !!plotId,
  });
}

// ────────────────────────────────────────────────────────────────
// useSnapshotDetail — スナップショット詳細（プレビュー用）を取得
// ────────────────────────────────────────────────────────────────

/**
 * スナップショットの詳細（Plot メタデータ + 全セクション）を取得する。
 * 復元前のプレビュー表示に使用。
 *
 * @param plotId - 対象 Plot の ID
 * @param snapshotId - 対象スナップショットの ID
 */
export function useSnapshotDetail(plotId: string, snapshotId: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: snapshotKeys.detail(plotId, snapshotId),
    queryFn: () => snapshotRepository.get(plotId, snapshotId, session?.access_token),
    enabled: !!plotId && !!snapshotId,
  });
}

// ────────────────────────────────────────────────────────────────
// useRollback — スナップショットからの復元ミューテーション
// ────────────────────────────────────────────────────────────────

/**
 * スナップショットから Plot 全体をロールバック（復元）する。
 *
 * - `expectedVersion`: 楽観的ロックのための現在 Plot バージョン（省略可）
 * - `reason`: ロールバック理由（監査ログに記録、省略可）
 *
 * エラーハンドリング:
 * - 404 → スナップショットが見つからない
 * - 403 → Plot が一時停止中
 * - 409 → バージョン不一致（他ユーザーが先に変更）→ Plot 詳細を再取得
 *
 * @param plotId - 対象 Plot の ID
 * @param snapshotId - 復元元スナップショットの ID
 */
export function useRollback(plotId: string, snapshotId: string) {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: (options?: RollbackRequest) => {
      // POST /plots/{plotId}/rollback/{snapshotId} は要認証エンドポイント。
      if (!session?.access_token) {
        throw new Error("認証が必要です");
      }
      return snapshotRepository.rollback(plotId, snapshotId, options, session.access_token);
    },
    onSuccess: () => {
      toast.success("スナップショットから復元しました");
      // 復元後は Plot 詳細・スナップショット一覧・ロールバックログを最新化
      queryClient.invalidateQueries({ queryKey: queryKeys.plots.detail(plotId) });
      queryClient.invalidateQueries({ queryKey: snapshotKeys.list(plotId) });
      queryClient.invalidateQueries({ queryKey: snapshotKeys.rollbackLogs(plotId) });
    },
    onError: (error: Error) => {
      if (error instanceof ApiError) {
        switch (error.status) {
          case 404:
            toast.error("指定のスナップショットが見つかりません");
            break;
          case 403:
            toast.error("このPlotは現在一時停止中のため、復元できません");
            break;
          case 409:
            toast.error(
              "他のユーザーが先に変更を行いました。ページを再読み込みしてください",
            );
            // バージョン不一致 → 最新の Plot 詳細を再取得
            queryClient.invalidateQueries({ queryKey: queryKeys.plots.detail(plotId) });
            break;
          default:
            toast.error(error.detail || "復元に失敗しました");
        }
      } else {
        toast.error("復元に失敗しました");
      }
    },
  });
}

// ────────────────────────────────────────────────────────────────
// useRollbackLogs — ロールバック監査ログ一覧を取得
// ────────────────────────────────────────────────────────────────

/**
 * Plot のロールバック監査ログ一覧を取得する。
 * Plot 所有者または管理者のみ閲覧可能。
 *
 * @param plotId - 対象 Plot の ID
 * @param params - ページネーション（デフォルト: limit=20, offset=0）
 */
export function useRollbackLogs(
  plotId: string,
  params?: { limit?: number; offset?: number },
) {
  const { session } = useAuth();

  return useQuery({
    queryKey: snapshotKeys.rollbackLogs(plotId, params),
    queryFn: () => snapshotRepository.getRollbackLogs(plotId, params, session?.access_token),
    enabled: !!plotId,
  });
}

// ────────────────────────────────────────────────────────────────
// useDiff — 2 バージョン間の差分を取得
// ────────────────────────────────────────────────────────────────

/**
 * セクションの 2 バージョン間の差分（additions / deletions）を取得する。
 *
 * @param sectionId - 対象セクションの ID
 * @param fromVersion - 比較元バージョン番号
 * @param toVersion - 比較先バージョン番号
 */
export function useDiff(sectionId: string, fromVersion: number, toVersion: number) {
  const { session } = useAuth();

  return useQuery({
    queryKey: historyKeys.diff(sectionId, fromVersion, toVersion),
    queryFn: () => historyRepository.getDiff(sectionId, fromVersion, toVersion, session?.access_token),
    // sectionId が空、または fromVersion/toVersion が未指定（0 以下）の場合は無効化
    enabled: !!sectionId && fromVersion > 0 && toVersion > 0,
  });
}
