"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { SectionLockBadge } from "@/components/section/SectionLockBadge/SectionLockBadge";
import type { SectionResponse } from "@/lib/api/types";
import styles from "./SectionViewer.module.scss";

type SectionViewerProps = {
  section: SectionResponse;
  isBeingEdited?: boolean;
  editedBy?: { id: string; displayName: string; avatarUrl: string | null } | null;
};

export function SectionViewer({
  section,
  isBeingEdited = false,
  editedBy = null,
}: SectionViewerProps) {
  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: section.content,
      editable: false,
      immediatelyRender: false,
    },
    [section.content, section.version],
  );

  if (!section.content) return null;

  return (
    <div id={`section-${section.id}`} className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{section.title}</h2>
        {isBeingEdited && <SectionLockBadge lockedBy={editedBy} />}
      </div>
      <div className={styles.content}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
