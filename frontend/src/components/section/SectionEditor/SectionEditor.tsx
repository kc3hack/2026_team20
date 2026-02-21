"use client";

import { useCallback, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Loader2, Pencil, Check } from "lucide-react";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { SectionLockBadge } from "@/components/section/SectionLockBadge/SectionLockBadge";
import { Button } from "@/components/ui/button";
import type { LockState } from "@/lib/realtime/types";
import type { SectionResponse } from "@/lib/api/types";
import type { Doc } from "yjs";
import type SupabaseProvider from "y-supabase";
import styles from "./SectionEditor.module.scss";

type SectionEditorProps = {
  section: SectionResponse;
  lockState: LockState;
  lockedBy: { id: string; displayName: string; avatarUrl: string | null } | null;
  onSave: (title: string, content: Record<string, unknown>) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  ydoc?: Doc;
  provider?: SupabaseProvider;
};

export function SectionEditor({
  section,
  lockState,
  lockedBy,
  onSave,
  onEditStart,
  onEditEnd,
  ydoc,
  provider,
}: SectionEditorProps) {
  const contentRef = useRef<Record<string, unknown>>(
    (section.content as Record<string, unknown>) ?? { type: "doc", content: [] },
  );

  const handleContentChange = useCallback((json: Record<string, unknown>) => {
    contentRef.current = json;
  }, []);

  const handleEditComplete = useCallback(() => {
    onSave(section.title, contentRef.current);
    onEditEnd();
  }, [onSave, onEditEnd, section.title]);

  if (lockState === "locked-by-me") {
    return (
      <div id={`section-${section.id}`} className={styles.container}>
        <div className={styles.editMode}>
          <div className={styles.editHeader}>
            <h2 className={styles.title}>{section.title}</h2>
            <Button variant="default" size="sm" onClick={handleEditComplete}>
              <Check size={16} />
              編集完了
            </Button>
          </div>
          <TiptapEditor
            content={section.content as Record<string, unknown> | undefined}
            editable={true}
            onChange={handleContentChange}
            ydoc={ydoc}
            provider={provider}
          />
        </div>
      </div>
    );
  }

  return (
    <div id={`section-${section.id}`} className={styles.container}>
      <div className={styles.viewMode}>
        <div className={styles.viewHeader}>
          <h2 className={styles.title}>{section.title}</h2>
          <div className={styles.actions}>
            {lockState === "locked-by-other" && <SectionLockBadge lockedBy={lockedBy} />}
            {lockState === "unknown" && (
              <Button variant="outline" size="sm" disabled>
                <Loader2 size={16} className={styles.spinner} />
                編集する
              </Button>
            )}
            {lockState === "unlocked" && (
              <Button variant="outline" size="sm" onClick={onEditStart}>
                <Pencil size={16} />
                編集する
              </Button>
            )}
          </div>
        </div>
        {section.content && <ReadOnlyContent section={section} />}
      </div>
    </div>
  );
}

function ReadOnlyContent({ section }: { section: SectionResponse }) {
  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: section.content,
      editable: false,
      immediatelyRender: false,
    },
    [section.content, section.version],
  );

  return (
    <div className={styles.content}>
      <EditorContent editor={editor} />
    </div>
  );
}
