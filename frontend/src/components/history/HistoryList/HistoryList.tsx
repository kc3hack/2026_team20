"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { historyRepository } from "@/lib/api/repositories";
import type { HistoryEntry } from "@/lib/api/types";
import styles from "./HistoryList.module.scss";

// ── 定数 ──────────────────────────────────────────────
/** 全データを一度に取得するため十分大きな値を指定 */
const LIMIT = 1000;

/**
 * 操作種別ごとの表示設定。
 * Badge の variant / ラベルを一元管理し、将来の操作種別追加にも対応しやすくする。
 */
const OPERATION_CONFIG: Record<
  HistoryEntry["operationType"],
  { label: string; variant: "default" | "destructive" | "secondary" }
> = {
  insert: { label: "追加", variant: "default" },
  delete: { label: "削除", variant: "destructive" },
  update: { label: "更新", variant: "secondary" },
};

// ── Props ─────────────────────────────────────────────
interface HistoryListProps {
  sectionId: string;
  /** 差分表示用: バージョン選択時のコールバック（Wave3 DiffViewer 連携） */
  onVersionSelect?: (version: number) => void;
  /** 差分表示用: 現在選択中の 2 バージョン（Wave3 DiffViewer 連携） */
  selectedVersions?: [number | null, number | null];
}

// ── コンポーネント ────────────────────────────────────
/**
 * バージョン履歴一覧コンポーネント。
 *
 * HotOperation（72時間保持）の操作ログをタイムライン形式で表示する。
 * 全データを一度に取得してスクロール表示する方式。
 *
 * useHistory フックは Wave6 で実装予定のため、
 * 現時点では historyRepository.getHistory を useQuery で直接呼び出す。
 */
export function HistoryList({ sectionId }: HistoryListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["history", sectionId],
    queryFn: () => historyRepository.getHistory(sectionId, { limit: LIMIT }),
    enabled: !!sectionId,
  });

  const sortedItems = useMemo(() => {
    if (!data?.items) return [];
    return [...data.items].sort((a, b) => b.version - a.version);
  }, [data?.items]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── ローディング ──────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.container} data-testid="history-list-loading">
        <div className={styles.skeletonList}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={styles.skeletonItem}>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── 空状態 ────────────────────────────────────────
  if (!data || data.items.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <Clock size={24} />
          <p className={styles.emptyMessage}>履歴がありません</p>
        </div>
      </div>
    );
  }

  // ── 一覧表示 ──────────────────────────────────────
  return (
    <div className={styles.container} data-testid="history-list">
      <div className={styles.timeline}>
        {sortedItems.map((entry) => {
          const config = OPERATION_CONFIG[entry.operationType];
          const isExpanded = expandedIds.has(entry.id);

          return (
            <div
              key={entry.id}
              className={styles.timelineItem}
              data-operation={entry.operationType}
            >
              <div className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <span className={styles.versionBadge}>v{entry.version}</span>
                  <Badge
                    variant={config.variant}
                    className={
                      entry.operationType === "insert"
                        ? "bg-green-600 text-white"
                        : undefined
                    }
                  >
                    {config.label}
                  </Badge>
                  <div className={styles.userInfo}>
                    <Avatar className={styles.avatarSm}>
                      {entry.user.avatarUrl && (
                        <AvatarImage
                          src={entry.user.avatarUrl}
                          alt={entry.user.displayName}
                        />
                      )}
                      <AvatarFallback>
                        {entry.user.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={styles.userName}>
                      {entry.user.displayName}
                    </span>
                  </div>
                </div>

                <div className={styles.itemMeta}>
                  <span className={styles.timestamp}>
                    {formatDistanceToNow(new Date(entry.createdAt), {
                      addSuffix: true,
                      locale: ja,
                    })}
                  </span>
                </div>

                {entry.payload != null && (
                  <>
                    <button
                      type="button"
                      className={styles.detailToggle}
                      onClick={() => toggleExpand(entry.id)}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? "閉じる" : "詳細を表示"}`}
                    >
                      {isExpanded ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                      <span>詳細</span>
                    </button>
                    {isExpanded && (
                      <div className={styles.detailContent}>
                        <pre className={styles.payloadJson}>
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
