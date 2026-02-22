"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Loader2, Pencil, Check } from "lucide-react";
import type { Editor } from "@tiptap/core";
import { toast } from "sonner";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { SectionLockBadge } from "@/components/section/SectionLockBadge/SectionLockBadge";
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
  /** 他ユーザーにロックを奪われた場合に呼ばれるコールバック */
  onLockRevoked?: () => void;
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
  onLockRevoked,
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

    const AUTO_SAVE_INTERVAL_MS = 2000;

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

  // ----- 強制編集中断: ロックが奪われた場合 -----
  // 編集中 (locked-by-me) に他ユーザーのロックが検出された場合、
  // 自動保存してから編集モードを強制終了する。
  const prevLockStateRef = useRef(lockState);
  const onLockRevokedRef = useRef(onLockRevoked);
  onLockRevokedRef.current = onLockRevoked;

  useEffect(() => {
    const prev = prevLockStateRef.current;
    prevLockStateRef.current = lockState;

    if (prev === "locked-by-me" && lockState !== "locked-by-me") {
      // ロックを失った → 最新コンテンツを自動保存
      const latestContent =
        (editorRef.current?.getJSON() as Record<string, unknown> | undefined) ??
        contentRef.current;
      onSaveRef.current(sectionTitleRef.current, latestContent, { silent: true }).catch(
        (err) => console.warn("[SectionEditor] force-save on lock revoke failed:", err),
      );
      setHasUnsavedChanges(false);

      // ユーザーに通知
      toast.warning(
        lockedBy
          ? `${lockedBy.displayName} が同じセクションの編集を開始したため、編集を中断しました`
          : "他のユーザーが同じセクションの編集を開始したため、編集を中断しました",
      );

      // 親コンポーネントに通知（editing 状態をリセット）
      onLockRevokedRef.current?.();
    }
  }, [lockState, setHasUnsavedChanges, lockedBy]);

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
              <Button variant="outline" size="sm" onClick={onEditStart}>
                <Pencil size={16} />
                編集する
              </Button>
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
    </div>
  );
}
