"use client";

import { useEffect, useState } from "react";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { SectionLockBadge } from "@/components/section/SectionLockBadge/SectionLockBadge";
import type { SectionResponse } from "@/lib/api/types";
import type { SupabaseBroadcastProvider } from "@/lib/realtime/yjsProvider";
import styles from "./SectionViewer.module.scss";

type SectionViewerProps = {
  section: SectionResponse;
  isBeingEdited?: boolean;
  editedBy?: { id: string; displayName: string; avatarUrl: string | null } | null;
  provider?: SupabaseBroadcastProvider | null;
};

export function SectionViewer({
  section,
  isBeingEdited = false,
  editedBy = null,
  provider = null,
}: SectionViewerProps) {
  // Broadcast 経由でリアルタイムコンテンツを受信
  const [liveContent, setLiveContent] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!provider) return;

    const handler = (sectionId: string, content: Record<string, unknown>) => {
      if (sectionId === section.id) {
        setLiveContent(content);
      }
    };

    provider.on("section-content", handler);
    return () => {
      provider.off("section-content", handler);
    };
  }, [provider, section.id]);

  const displayContent = liveContent ?? section.content;
  if (!displayContent) return null;

  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: section.content ?? undefined,
      editable: false,
      immediatelyRender: false,
    },
    [section.content, section.version],
  );

  return (
    <div
      id={`section-${section.id}`}
      className={`${styles.container} ${isBeingEdited ? styles.realtimeActive : ""}`}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>{section.title}</h2>
        {isBeingEdited && <SectionLockBadge lockedBy={editedBy} />}
      </div>
      <div className={styles.content}>
        <TiptapEditor
          content={displayContent as Record<string, unknown> | undefined}
          editable={false}
        />
      </div>
    </div>
  );
}
