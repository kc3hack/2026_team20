"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SectionResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import styles from "./TableOfContents.module.scss";

type TableOfContentsProps = {
  sections: SectionResponse[];
  // TODO: IntersectionObserver によるスクロール追跡で自動的に現在のセクションをハイライトする際に使用予定
  currentSectionId?: string;
};

export function TableOfContents({ sections, currentSectionId }: TableOfContentsProps) {
  const sorted = useMemo(
    () => [...sections].sort((a, b) => a.orderIndex - b.orderIndex),
    [sections],
  );

  const [activeSectionId, setActiveSectionId] = useState<string | undefined>(currentSectionId);
  const isClickScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentSectionId !== undefined) {
      setActiveSectionId(currentSectionId);
      return;
    }

    if (typeof IntersectionObserver === "undefined") return;

    const sectionIds = sorted.map((s) => s.id);
    const observers: IntersectionObserver[] = [];

    for (const id of sectionIds) {
      const element = document.getElementById(`section-${id}`);
      if (!element) continue;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              if (!isClickScrolling.current) {
                setActiveSectionId(id);
              }
            }
          }
        },
        // rootMargin の設定範囲内に要素が入った時に発火
        { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
      );

      observer.observe(element);
      observers.push(observer);
    }

    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
    };
  }, [sorted, currentSectionId]);

  const handleClick = (sectionId: string) => {
    setActiveSectionId(sectionId);
    isClickScrolling.current = true;

    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    // スムーズスクロールが完了するまで（約1秒）IntersectionObserverによる上書きを無視する
    scrollTimeout.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 1000);

    const element = document.getElementById(`section-${sectionId}`);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className={styles.container} aria-label="目次">
      <h3 className={styles.heading}>目次</h3>
      <ul className={styles.list}>
        {sorted.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              className={cn(styles.item, activeSectionId === section.id && styles.active)}
              onClick={() => handleClick(section.id)}
            >
              {section.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
