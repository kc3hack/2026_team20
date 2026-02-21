import { PlotCard } from "@/components/plot/PlotCard/PlotCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlotResponse } from "@/lib/api/types";
import styles from "./PlotList.module.scss";

const SKELETON_COUNT = 3;

type PlotListProps = {
  items: PlotResponse[];
  isLoading?: boolean;
  /** 空状態メッセージを非表示にしたい場合は false を指定 */
  showEmptyState?: boolean;
};

export function PlotList({ items, isLoading, showEmptyState = true }: PlotListProps) {
  if (isLoading) {
    return (
      <div className={styles.list}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton placeholders are static and never reorder
          <Skeleton key={`skeleton-${i}`} className={styles.skeletonItem} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    if (!showEmptyState) return null;

    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyMessage}>該当するPlotがありません</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {items.map((plot) => (
        <PlotCard key={plot.id} plot={plot} />
      ))}
    </div>
  );
}
