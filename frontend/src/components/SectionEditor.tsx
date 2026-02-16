"use client";

import { useCallback } from "react";
import type { SectionItem } from "@/lib/api";
import TiptapEditor from "./TiptapEditor";
import styles from "./SectionEditor.module.scss";

interface SectionEditorProps {
  section: SectionItem;
  editable: boolean;
  onUpdate?: (content: Record<string, unknown>) => void;
  onHistoryOpen?: (sectionId: string) => void;
  onImageUpload?: (file: File) => Promise<string | null>;
}

export default function SectionEditor({
  section,
  editable,
  onUpdate,
  onHistoryOpen,
  onImageUpload,
}: SectionEditorProps) {
  const handleUpdate = useCallback(
    (json: Record<string, unknown>) => {
      onUpdate?.(json);
    },
    [onUpdate],
  );

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.title}>{section.title}</h3>
        <div className={styles.actions}>
          {editable && onHistoryOpen && (
            <button
              type="button"
              className={styles.historyBtn}
              onClick={() => onHistoryOpen(section.id)}
            >
              履歴
            </button>
          )}
        </div>
      </div>

      <TiptapEditor
        content={section.content as Record<string, unknown>}
        onUpdate={handleUpdate}
        editable={editable}
        onImageUpload={editable ? onImageUpload : undefined}
      />
    </div>
  );
}
