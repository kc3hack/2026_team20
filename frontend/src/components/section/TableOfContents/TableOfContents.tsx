"use client";

import type { SectionResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import styles from "./TableOfContents.module.scss";

type TableOfContentsProps = {
  sections: SectionResponse[];
  currentSectionId?: string;
};

export function TableOfContents({ sections, currentSectionId }: TableOfContentsProps) {
  const sorted = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);

  const handleClick = (sectionId: string) => {
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
              className={cn(styles.item, currentSectionId === section.id && styles.active)}
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
