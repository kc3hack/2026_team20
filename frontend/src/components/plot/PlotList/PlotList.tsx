import { Skeleton } from "@/components/ui/skeleton";
import { PlotCard } from "@/components/plot/PlotCard/PlotCard";
import type { PlotResponse } from "@/lib/api/types";
import styles from "./PlotList.module.scss";

const SKELETON_COUNT = 3;

type PlotListProps = {
  items: PlotResponse[];
  isLoading?: boolean;
};

export function PlotList({ items, isLoading }: PlotListProps) {
  if (isLoading) {
    return (
      <div className={styles.list}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <Skeleton key={i} className={styles.skeletonItem} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={styles.list}>
      {items.map((plot) => (
        <PlotCard key={plot.id} plot={plot} />
      ))}
    </div>
  );
}
