"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Loader2, Pencil, Check, Trash2 } from "lucide-react";
import type { Editor } from "@tiptap/core";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { SectionLockBadge } from "@/components/section/SectionLockBadge/SectionLockBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import type { LockState } from "@/lib/realtime/types";
import type { SectionResponse } from "@/lib/api/types";
import type { Doc } from "yjs";
import type { SupabaseBroadcastProvider } from "@/lib/realtime/yjsProvider";
import styles from "./SectionEditor.module.scss";

type SectionEditorProps = {
  section: SectionResponse;
  lockState: LockState;
  lockedBy: { id: string; displayName: string; avatarUrl: string | null } | null;
  onSave: (
    title: string,
    content: Record<string, unknown>,
    options?: { silent?: boolean },
  ) => Promise<boolean>;
  onEditStart: () => void;
  onEditEnd: () => void;
  onDelete?: () => Promise<void> | void;
  isDeleting?: boolean;
  ydoc?: Doc;
  provider?: SupabaseBroadcastProvider;
};

export function SectionEditor({
  section,
  lockState,
  lockedBy,
  onSave,
  onEditStart,
  onEditEnd,
  onDelete,
  isDeleting = false,
  ydoc,
  provider,
}: SectionEditorProps) {
  const { setHasUnsavedChanges } = useUnsavedChanges();

  // ----- リアルタイムコンテンツ同期: 他ユーザーからの Broadcast を受信 -----
  const [liveContent, setLiveContent] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // 自分が編集中 or provider が無い場合は受信不要
    if (!provider || lockState === "locked-by-me") return;

    const handler = (sectionId: string, content: Record<string, unknown>) => {
      if (sectionId === section.id) {
        setLiveContent(content);
      }
    };

    provider.on("section-content", handler);
    return () => {
      provider.off("section-content", handler);
    };
  }, [provider, section.id, lockState]);

  const contentRef = useRef<Record<string, unknown>>(
    (section.content as Record<string, unknown>) ?? { type: "doc", content: [] },
  );
  const editorRef = useRef<Editor | null>(null);
  const [sectionTitle, setSectionTitle] = useState(section.title);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (lockState !== "locked-by-me") {
      setSectionTitle(section.title);
    }
  }, [section.title, lockState]);

  // ----- Stale closure 防止: provider を ref で保持 -----
  // TiptapEditor の useEditor が onUpdate コールバックを再生成しない場合でも、
  // 常に最新の provider にアクセスできるようにする。
  const providerRef = useRef(provider);
  providerRef.current = provider;

  // onChange: ローカル ref 更新 + 他ユーザーへ即時 Broadcast
  const handleContentChange = useCallback((json: Record<string, unknown>) => {
    contentRef.current = json;
    // ref 経由で常に最新の provider を使い、stale closure を防止
    providerRef.current?.broadcastContent(section.id, json);
  }, [section.id]);

  const handleDirtyChange = useCallback(
    (isDirty: boolean) => {
      setHasUnsavedChanges(isDirty);
    },
    [setHasUnsavedChanges],
  );

  const handleTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSectionTitle(event.target.value);
      setHasUnsavedChanges(true);
    },
    [setHasUnsavedChanges],
  );

  const handleEditComplete = useCallback(async () => {
    const latestContent =
      (editorRef.current?.getJSON() as Record<string, unknown> | undefined) ??
      contentRef.current;
    const success = await onSave(sectionTitle, latestContent);
    if (!success) {
      return;
    }

    setHasUnsavedChanges(false);
    onEditEnd();
  }, [onSave, onEditEnd, sectionTitle, setHasUnsavedChanges]);

  // ----- 自動保存: 編集中は 2 秒ごとにサイレント保存 -----
  // Supabase Broadcast が利用できない環境でも、REST API 経由で
  // 他ユーザーの usePlotDetail polling (2s) と合わせてリアルタイム反映する。
  const lastAutoSavedRef = useRef<string>(
    JSON.stringify({
      title: section.title,
      content: section.content ?? { type: "doc", content: [] },
    }),
  );
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const sectionTitleRef = useRef(sectionTitle);
  sectionTitleRef.current = sectionTitle;

  useEffect(() => {
    if (lockState !== "locked-by-me") return;

    const AUTO_SAVE_INTERVAL_MS = 2;

    const timer = setInterval(() => {
      const current = JSON.stringify({
        title: sectionTitleRef.current,
        content: contentRef.current,
      });
      // 前回の自動保存と内容が同じならスキップ
      if (current === lastAutoSavedRef.current) return;

      lastAutoSavedRef.current = current;
      onSaveRef.current(sectionTitleRef.current, contentRef.current, { silent: true }).catch(
        (err) => console.warn("[SectionEditor] auto-save failed:", err),
      );
    }, AUTO_SAVE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [lockState]);

  // 閲覧モードでは Broadcast 受信した liveContent を優先表示し、
  // なければ API から取得した section.content をフォールバックに使う。
  // Y.js Collaboration は使わず、JSON 直接同期で確実にリアルタイム反映する。
  const readOnlyContent =
    liveContent ??
    ((section.content as Record<string, unknown> | null) ?? { type: "doc", content: [] });

  if (lockState === "locked-by-me") {
    return (
      <div id={`section-${section.id}`} className={styles.container}>
        <div className={styles.editMode}>
          <div className={styles.editHeader}>
            <Input
              value={sectionTitle}
              onChange={handleTitleChange}
              maxLength={200}
              aria-label="セクションタイトル"
              className={styles.titleInput}
            />
            <Button variant="default" size="sm" onClick={handleEditComplete}>
              <Check size={16} />
              編集完了
            </Button>
          </div>
          <TiptapEditor
            content={section.content as Record<string, unknown> | undefined}
            editable={true}
            onChange={handleContentChange}
            onDirtyChange={handleDirtyChange}
            ydoc={ydoc}
            collaborationField={section.id}
            useCollaboration={true}
            onEditorChange={(editor) => {
              editorRef.current = editor;
            }}
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
              <>
                {onDelete && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isDeleting}
                    aria-label="削除"
                    title="削除"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={onEditStart}>
                  <Pencil size={16} />
                  編集する
                </Button>
              </>
            )}
          </div>
        </div>
        <div className={styles.content}>
          <TiptapEditor
            content={readOnlyContent}
            editable={false}
          />
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>セクションを削除しますか？</DialogTitle>
            <DialogDescription>
              「{section.title}」を削除すると元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!onDelete) return;
                await onDelete();
                setDeleteDialogOpen(false);
              }}
              disabled={isDeleting}
            >
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
