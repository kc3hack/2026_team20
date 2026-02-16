"use client";

import { usePlots } from "@/hooks/usePlots";
import PlotCard, { PlotCardSkeleton } from "./PlotCard";
import styles from "./PlotList.module.scss";

interface PlotListProps {
  category: "trending" | "popular" | "new";
  title: string;
  icon: string;
}

export default function PlotList({ category, title, icon }: PlotListProps) {
  const { plots, isLoading, error } = usePlots(category);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>{icon}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>

      {error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <div className={styles.grid}>
          {isLoading
            ? Array.from({ length: 5 }, (_, i) => (
                <PlotCardSkeleton key={`skeleton-${category}-${i}`} />
              ))
            : plots.length > 0
              ? plots.map((plot) => <PlotCard key={plot.id} plot={plot} />)
              : (
                  <p className={styles.empty}>まだPlotがありません</p>
                )}
        </div>
      )}
    </section>
  );
}
