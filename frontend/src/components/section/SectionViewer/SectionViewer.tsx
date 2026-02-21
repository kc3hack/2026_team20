"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { SectionLockBadge } from "@/components/section/SectionLockBadge/SectionLockBadge";
import { useRealtimeSection } from "@/hooks/useRealtimeSection";
import type { SectionResponse } from "@/lib/api/types";
import styles from "./SectionViewer.module.scss";

type SectionViewerProps = {
  section: SectionResponse;
  enableRealtime?: boolean;
  isBeingEdited?: boolean;
  editedBy?: { id: string; displayName: string; avatarUrl: string | null } | null;
};

export function SectionViewer({
  section,
  enableRealtime = false,
  isBeingEdited = false,
  editedBy = null,
}: SectionViewerProps) {
  const { liveContent, connectionStatus } = useRealtimeSection(
    section.plotId,
    section.id,
    enableRealtime,
  );

  const displayContent = liveContent ?? section.content;

  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: displayContent,
      editable: false,
      immediatelyRender: false,
    },
    [displayContent, section.version],
  );

  if (!displayContent) return null;

  const isRealtimeActive = enableRealtime && connectionStatus === "connected";

  return (
    <div
      id={`section-${section.id}`}
      className={`${styles.container} ${isRealtimeActive ? styles.realtimeActive : ""}`}
    >
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
