"use client";

import { useMemo } from "react";
import { SectionViewer } from "@/components/section/SectionViewer/SectionViewer";
import { Skeleton } from "@/components/ui/skeleton";
import type { SectionResponse } from "@/lib/api/types";
import styles from "./SectionList.module.scss";

type SectionListProps = {
  sections: SectionResponse[];
  isLoading?: boolean;
};

export function SectionList({ sections, isLoading = false }: SectionListProps) {
  const sorted = useMemo(
    () => [...sections].sort((a, b) => a.orderIndex - b.orderIndex),
    [sections],
  );

  if (isLoading) {
    return (
      <div className={styles.container} data-testid="section-list-loading">
        {["skeleton-1", "skeleton-2", "skeleton-3"].map((id) => (
          <div key={id} className={styles.skeletonItem}>
            <Skeleton className={styles.skeletonTitle} />
            <Skeleton className={styles.skeletonContent} />
          </div>
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.empty} data-testid="section-list-empty">
          まだセクションがありません
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {sorted.map((section) => (
        <SectionViewer key={section.id} section={section} />
      ))}
    </div>
  );
}
