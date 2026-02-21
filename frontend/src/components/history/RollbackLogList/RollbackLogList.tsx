"use client";

import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { History } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRollbackLogs } from "@/hooks/useHistory";
import { ApiError } from "@/lib/api/client";
import type { RollbackLogResponse } from "@/lib/api/types";
import styles from "./RollbackLogList.module.scss";

// ── 定数 ──────────────────────────────────────────────
const LIMIT = 20;

// ── Props ─────────────────────────────────────────────
interface RollbackLogListProps {
  plotId: string;
  onError?: (error: Error) => void;
}

// ── コンポーネント ────────────────────────────────────
/**
 * ロールバック監査ログ一覧コンポーネント。
 *
 * Plot 所有者または管理者のみが閲覧できる監査ログを表示する。
 * 403 Forbidden が返された場合はコンポーネント全体を非表示にする。
 *
 * useRollbackLogs カスタムフック経由でロールバック監査ログを取得する。
 */
export function RollbackLogList({ plotId, onError }: RollbackLogListProps) {
  const [offset, setOffset] = useState(0);
  const [isForbidden, setIsForbidden] = useState(false);
  const [allItems, setAllItems] = useState<RollbackLogResponse[]>([]);

  const { data, isLoading, isFetching, error } = useRollbackLogs(plotId, { limit: LIMIT, offset });

  useEffect(() => {
    if (data?.items) {
      setAllItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const newItems = data.items.filter(
          (item) => !existingIds.has(item.id),
        );
        return [...prev, ...newItems];
      });
    }
  }, [data?.items]);

  // ── 403エラーハンドリング ──────────────────────────
  // useQuery の onError は v5 で廃止されたため、
  // error プロパティを監視して 403 を検知する
  useEffect(() => {
    if (error && !isForbidden) {
      if (error instanceof ApiError && error.status === 403) {
        setIsForbidden(true);
      }
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [error, isForbidden, onError]);

  // 403時は何も表示しない（権限なし）
  if (isForbidden) {
    return null;
  }

  const hasMore = data != null && offset + LIMIT < data.total;

  const handleLoadMore = () => {
    setOffset((prev) => prev + LIMIT);
  };

  // ── ローディング ──────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.container} data-testid="rollback-log-list-loading">
        <div className={styles.skeletonList}>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className={styles.skeletonItem}>
              <Skeleton className="h-5 w-16" />
              <div className={styles.skeletonRow}>
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── 空状態 ────────────────────────────────────────
  if (!data || (data.items.length === 0 && allItems.length === 0)) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState} data-testid="rollback-log-list-empty">
          <History size={24} />
          <p className={styles.emptyMessage}>ロールバック履歴がありません</p>
        </div>
      </div>
    );
  }

  // ── 一覧表示 ──────────────────────────────────────
  return (
    <div className={styles.container} data-testid="rollback-log-list">
      <div className={styles.list}>
        {allItems.map((log) => (
          <div
            key={log.id}
            className={styles.logItem}
            data-testid={`rollback-log-item-${log.id}`}
          >
            <div className={styles.header}>
              <Badge variant="outline">v{log.snapshotVersion}</Badge>
              <span className={styles.date}>
                {formatDistanceToNow(new Date(log.createdAt), {
                  addSuffix: true,
                  locale: ja,
                })}
              </span>
            </div>

            <div className={styles.userInfo}>
              <Avatar className={styles.avatarSm}>
                {log.user.avatarUrl && (
                  <AvatarImage
                    src={log.user.avatarUrl}
                    alt={log.user.displayName}
                  />
                )}
                <AvatarFallback>
                  {log.user.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className={styles.userName}>{log.user.displayName}</span>
            </div>

            <div className={styles.reason}>
              {log.reason || (
                <span className={styles.noReason}>理由なし</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── ページネーション ───────────────────────── */}
      {hasMore && (
        <div className={styles.loadMore}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={isFetching}
          >
            {isFetching ? "読み込み中..." : "もっと読み込む"}
          </Button>
        </div>
      )}
    </div>
  );
}
