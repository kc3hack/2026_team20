"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Camera } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSnapshotDetail, useSnapshots } from "@/hooks/useHistory";
import type { Content, SnapshotDetailResponse, SnapshotResponse } from "@/lib/api/types";
import styles from "./SnapshotList.module.scss";

// ── 定数 ──────────────────────────────────────────────
const LIMIT = 10;

// ── Props ─────────────────────────────────────────────
interface SnapshotListProps {
  plotId: string;
  /** 現在の Plot バージョン（楽観的ロック用） */
  plotVersion?: number;
  onRollback?: (snapshotId: string, snapshotVersion: number, plotVersion?: number) => void;
}

// ── 保持粒度ラベル計算 ────────────────────────────────
/**
 * createdAt と現在時刻の差分から保持粒度ラベルを算出する。
 *
 * - 7日以内: 全保持（ColdSnapshot がまだ間引かれていない期間）
 * - 7-30日: 毎時（1時間ごとに保持）
 * - 30日以降: 日次（1日ごとに保持）
 */
function getRetentionLabel(createdAt: string): {
  label: string;
  className: string;
} {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 7) {
    return { label: "全保持", className: styles.retentionSuccess };
  } else if (diffDays <= 30) {
    return { label: "毎時", className: styles.retentionInfo };
  } else {
    return { label: "日次", className: styles.retentionSecondary };
  }
}

/**
 * Tiptap JSON (Content) からプレーンテキストを抽出する。
 * スナップショット詳細モーダルでの軽量プレビュー用。
 * SectionViewer は SectionResponse を前提としており型が合わないため、
 * ここでは再帰的にテキストノードを収集して簡易表示する。
 */
function extractTextFromContent(content: Content): string {
  if (!content) return "";

  const texts: string[] = [];

  function walk(node: Content) {
    if (node.type === "text" && typeof node.text === "string") {
      texts.push(node.text);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }

  walk(content);
  return texts.join("");
}

// ── コンポーネント ────────────────────────────────────
/**
 * スナップショット一覧コンポーネント。
 *
 * ColdSnapshot の閲覧・復元を担当し、HistoryList（HotOperation）とは
 * 責務を分離する設計。
 *
 * useSnapshots / useSnapshotDetail カスタムフック経由でデータを取得する。
 */
export function SnapshotList({
  plotId,
  plotVersion,
  onRollback,
}: SnapshotListProps) {
  const [offset, setOffset] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] =
    useState<SnapshotResponse | null>(null);
  const [allItems, setAllItems] = useState<SnapshotResponse[]>([]);

  // ── スナップショット一覧取得 ──────────────────────
  const { data, isLoading, isFetching } = useSnapshots(plotId, { limit: LIMIT, offset });

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

  // ── スナップショット詳細取得（モーダル表示時） ────
  const { data: snapshotDetail, isLoading: isDetailLoading } = useSnapshotDetail(plotId, selectedSnapshot?.id ?? "");

  const hasMore = data != null && offset + LIMIT < data.total;

  const handleLoadMore = () => {
    setOffset((prev) => prev + LIMIT);
  };

  const handleSnapshotClick = useCallback((snapshot: SnapshotResponse) => {
    setSelectedSnapshot(snapshot);
    setPreviewOpen(true);
  }, []);

  const handleRollback = useCallback(
    (snapshot: SnapshotResponse) => {
      if (plotVersion !== undefined) {
        onRollback?.(snapshot.id, snapshot.version, plotVersion);
      } else {
        onRollback?.(snapshot.id, snapshot.version);
      }
    },
    [onRollback, plotVersion],
  );

  // ── ローディング ──────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.container} data-testid="snapshot-list-loading">
        <div className={styles.skeletonList}>
          {Array.from({ length: 3 }, (_, i) => (
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
  if (!data || (data.items.length === 0 && allItems.length === 0)) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState} data-testid="snapshot-list-empty">
          <Camera size={24} />
          <p className={styles.emptyMessage}>スナップショットがありません</p>
        </div>
      </div>
    );
  }

  // ── 一覧表示 ──────────────────────────────────────
  return (
    <div className={styles.container} data-testid="snapshot-list">
      <div className={styles.list}>
        {allItems.map((snapshot) => {
          const retention = getRetentionLabel(snapshot.createdAt);

          return (
            <div
              key={snapshot.id}
              className={styles.snapshotItem}
              role="button"
              tabIndex={0}
              onClick={() => handleSnapshotClick(snapshot)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSnapshotClick(snapshot);
                }
              }}
              data-testid={`snapshot-item-${snapshot.id}`}
            >
              <div className={styles.itemHeader}>
                <span className={styles.versionBadge}>
                  v{snapshot.version}
                </span>
                <Badge className={retention.className}>
                  {retention.label}
                </Badge>
              </div>

              <div className={styles.itemMeta}>
                <span className={styles.timestamp}>
                  {format(
                    new Date(snapshot.createdAt),
                    "yyyy/MM/dd HH:mm",
                    { locale: ja },
                  )}
                </span>
              </div>

              <div className={styles.itemActions}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRollback(snapshot);
                  }}
                >
                  このバージョンに戻す
                </Button>
              </div>
            </div>
          );
        })}
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

      {/* ── スナップショット詳細プレビューモーダル ──── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              スナップショット v{selectedSnapshot?.version}
            </DialogTitle>
          </DialogHeader>

          {isDetailLoading ? (
            <PreviewSkeleton />
          ) : snapshotDetail?.content ? (
            <SnapshotPreviewContent detail={snapshotDetail} />
          ) : (
            <p className={styles.noData}>スナップショットデータなし</p>
          )}

          <DialogFooter>
            {selectedSnapshot && (
              <Button
                onClick={() => {
                  handleRollback(selectedSnapshot);
                  setPreviewOpen(false);
                }}
              >
                このバージョンに戻す
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 詳細プレビューコンテンツ ──────────────────────────
function SnapshotPreviewContent({
  detail,
}: {
  detail: SnapshotDetailResponse;
}) {
  const { plot, sections } = detail.content!;

  return (
    <div className={styles.previewContent} data-testid="snapshot-preview">
      <h4 className={styles.plotTitle}>{plot.title}</h4>

      {plot.description && (
        <p className={styles.plotDescription}>{plot.description}</p>
      )}

      {plot.tags.length > 0 && (
        <div className={styles.tags}>
          {plot.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className={styles.sectionsPreview}>
        {sections
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((section) => (
            <div key={section.id} className={styles.sectionPreview}>
              <h5 className={styles.sectionTitle}>{section.title}</h5>
              {section.content ? (
                <p className={styles.sectionContent}>
                  {extractTextFromContent(section.content)}
                </p>
              ) : (
                <p className={styles.noContent}>内容なし</p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

// ── プレビューローディングスケルトン ──────────────────
function PreviewSkeleton() {
  return (
    <div className={styles.previewLoading} data-testid="snapshot-preview-loading">
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
