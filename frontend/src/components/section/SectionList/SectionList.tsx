"use client";

import { SectionViewer } from "@/components/section/SectionViewer/SectionViewer";
import { Skeleton } from "@/components/ui/skeleton";
import type { SectionResponse } from "@/lib/api/types";
import styles from "./SectionList.module.scss";

type SectionListProps = {
  sections: SectionResponse[];
  isLoading?: boolean;
};

export function SectionList({ sections, isLoading = false }: SectionListProps) {
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

  const sorted = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className={styles.container}>
      {sorted.map((section) => (
        <SectionViewer key={section.id} section={section} />
      ))}
    </div>
  );
}
