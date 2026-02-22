"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { History, Pencil, Plus, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { SectionEditor } from "@/components/section/SectionEditor/SectionEditor";
import { TableOfContents } from "@/components/section/TableOfContents/TableOfContents";
import { TagBadge } from "@/components/shared/TagBadge/TagBadge";
import { CommentForm } from "@/components/sns/CommentForm/CommentForm";
import { CommentThread } from "@/components/sns/CommentThread/CommentThread";
import { ForkButton } from "@/components/sns/ForkButton/ForkButton";
import { StarButton } from "@/components/sns/StarButton/StarButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useComments, useCreateThread } from "@/hooks/useComments";
import { usePlotRealtime } from "@/hooks/usePlotRealtime";
import { useSectionLock } from "@/hooks/useSectionLock";
import { useCreateSection, useDeleteSection, useUpdateSection } from "@/hooks/useSections";
import type { CommentResponse, PlotDetailResponse, SectionResponse } from "@/lib/api/types";
import type { LockState, SectionAwarenessState } from "@/lib/realtime/types";
import styles from "./PlotDetail.module.scss";

type PlotDetailProps = {
  plot: PlotDetailResponse;
};

function getThreadStorageKey(plotId: string) {
  return `plot-comment-thread:${plotId}`;
}

export function PlotDetail({ plot }: PlotDetailProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { ydoc, provider, awareness } = usePlotRealtime(
    isAuthenticated ? plot.id : "",
  );
  const updateSection = useUpdateSection();
  const createSection = useCreateSection();
  const deleteSection = useDeleteSection();

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // スレッド管理 — Plot全体コメント用スレッド (sectionId=null) を plotId ごとに1つ扱う。
  // APIに「plotId から thread 取得」が無いため、フロントで threadId を localStorage に保持し再利用する。
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isThreadResolving, setIsThreadResolving] = useState(true);
  const [replyTarget, setReplyTarget] = useState<CommentResponse | null>(null);
  const { createThread } = useCreateThread();

  // threadId はログイン時のみ復元/作成する。
  // 未ログイン時は必ず非表示にするため、threadId も null に維持する。
  const threadInitialized = useRef(false);
  useEffect(() => {
    if (!isAuthenticated) {
      setThreadId(null);
      setIsThreadResolving(false);
      return;
    }

    if (threadInitialized.current) return;
    threadInitialized.current = true;

    const storageKey = getThreadStorageKey(plot.id);
    const savedThreadId = window.localStorage.getItem(storageKey);
    if (savedThreadId) {
      setThreadId(savedThreadId);
      setIsThreadResolving(false);
      return;
    }

    createThread(plot.id)
      .then((thread) => {
        setThreadId(thread.id);
        window.localStorage.setItem(storageKey, thread.id);
      })
      .catch(() => toast.error("コメントスレッドの読み込みに失敗しました"))
      .finally(() => setIsThreadResolving(false));
  }, [createThread, isAuthenticated, plot.id]);

  const { comments } = useComments(threadId ?? "");

  const ownerInitials = plot.owner?.displayName.slice(0, 2) ?? "??";
  const createdAtDate = new Date(plot.createdAt);
  const createdAgo = Number.isNaN(createdAtDate.getTime())
    ? "日時不明"
    : formatDistanceToNow(createdAtDate, {
        addSuffix: true,
        locale: ja,
      });

  const sortedSections = useMemo(
    () => [...plot.sections].sort((a, b) => a.orderIndex - b.orderIndex),
    [plot.sections],
  );

  const handleAddSection = (orderIndex: number) => {
    if (!isAuthenticated) {
      toast.error("セクションを追加するにはログインが必要です");
      router.push(`/auth/login?redirectTo=/plots/${plot.id}`);
      return;
    }
    if (plot.isPaused) {
      toast.error("このPlotは編集が一時停止されています");
      return;
    }

    createSection.mutate({
      plotId: plot.id,
      body: {
        title: `新しいセクション ${sortedSections.length + 1}`,
        orderIndex,
      },
    });
  };

  const handleReply = (parentCommentId: string) => {
    const comment = comments.find((c) => c.id === parentCommentId);
    setReplyTarget(comment ?? null);
  };

  return (
    <div className={styles.container}>
      {plot.isPaused && (
        <div className={styles.pausedBanner} role="alert">
          <Badge variant="destructive">⚠️ 編集一時停止中</Badge>
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{plot.title}</h1>
        </div>

        {plot.description && <p className={styles.description}>{plot.description}</p>}

        <div className={styles.meta}>
          {plot.owner && (
            <div className={styles.owner}>
              <Avatar size="sm">
                {plot.owner.avatarUrl && (
                  <AvatarImage src={plot.owner.avatarUrl} alt={plot.owner.displayName} />
                )}
                <AvatarFallback>{ownerInitials}</AvatarFallback>
              </Avatar>
              <span className={styles.ownerName}>{plot.owner.displayName}</span>
            </div>
          )}

          <div className={styles.stats}>
            <span className={styles.createdAt}>{createdAgo}</span>
            <Button asChild variant="outline" size="sm">
              <Link href={`/plots/${plot.id}/history`}>
                <History size={16} />
                履歴
              </Link>
            </Button>
          </div>
        </div>

        <div className={styles.actions}>
          <StarButton
            plotId={plot.id}
            initialCount={plot.starCount}
            initialIsStarred={plot.isStarred}
          />
          <ForkButton plotId={plot.id} />
        </div>

        {plot.tags.length > 0 && (
          <div className={styles.tags}>
            {plot.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <TableOfContents sections={plot.sections} />
        </aside>
        <main className={styles.main}>
          <>
            {!plot.isPaused && (
              <div className={styles.insertSectionTop}>
                <Button
                  variant="outline"
                  size="icon"
                  className={styles.insertButton}
                  onClick={() => handleAddSection(0)}
                  disabled={createSection.isPending}
                  aria-label="先頭にセクションを挿入"
                  title="先頭にセクションを挿入"
                >
                  <Plus size={14} />
                </Button>
              </div>
            )}
            {sortedSections.map((section, index) => (
              <Fragment key={section.id}>
                <SectionEditorWithLock
                  section={section}
                  plotId={plot.id}
                  isPaused={plot.isPaused}
                  isDeleting={deleteSection.isPending}
                  awareness={awareness}
                  ydoc={ydoc}
                  provider={provider}
                  isAuthenticated={isAuthenticated}
                  onRequireLogin={() => router.push(`/auth/login?redirectTo=/plots/${plot.id}`)}
                  onEditingSectionChange={setEditingSectionId}
                  onSave={async (title, content, options) => {
                    try {
                      await updateSection.mutateAsync({
                        plotId: plot.id,
                        sectionId: section.id,
                        body: { title, content },
                      });
                      if (!options?.silent) {
                        toast.success("セクションを保存しました");
                      }
                      return true;
                    } catch {
                      if (!options?.silent) {
                        toast.error("セクションの保存に失敗しました");
                      }
                      return false;
                    }
                  }}
                  onDelete={async () => {
                    if (!isAuthenticated) {
                      toast.error("セクションを削除するにはログインが必要です");
                      router.push(`/auth/login?redirectTo=/plots/${plot.id}`);
                      return;
                    }

                    if (plot.isPaused) {
                      toast.error("このPlotは編集が一時停止されています");
                      return;
                    }

                    try {
                      await deleteSection.mutateAsync({
                        plotId: plot.id,
                        sectionId: section.id,
                      });
                      toast.success("セクションを削除しました");
                    } catch {
                      toast.error("セクションの削除に失敗しました");
                    }
                  }}
                />
                {!plot.isPaused && index < sortedSections.length - 1 && (
                  <div className={styles.insertSectionBetween}>
                    <Button
                      variant="outline"
                      size="icon"
                      className={styles.insertButton}
                      onClick={() => handleAddSection(index + 1)}
                      disabled={createSection.isPending}
                      aria-label="ここにセクションを挿入"
                      title="ここにセクションを挿入"
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                )}
              </Fragment>
            ))}
            {!plot.isPaused && (
              <div className={styles.addSection}>
                <Button
                  variant="outline"
                  onClick={() => handleAddSection(sortedSections.length)}
                  disabled={createSection.isPending}
                >
                  <Plus size={16} />
                  セクション追加
                </Button>
              </div>
            )}
          </>
        </main>
      </div>

      <section className={styles.commentSection}>
        <h2>コメント</h2>
        {!isAuthenticated ? (
          <div className={styles.commentUnavailable}>
            <p>ログインをしないとコメント表示ができません。</p>
              <Link href={`/auth/login?redirectTo=/plots/${plot.id}`} className={styles.loginLink}>
              ログインはこちら
              </Link>
          </div>
        ) : isThreadResolving ? (
          <div className={styles.commentLoading}>
            <Skeleton className={styles.commentSkeleton} />
            <Skeleton className={styles.commentSkeleton} />
            <Skeleton className={styles.commentSkeleton} />
          </div>
        ) : threadId ? (
          <>
            <CommentForm
              threadId={threadId}
              parentCommentId={replyTarget?.id}
              parentCommentUser={replyTarget?.user.displayName}
              onCancelReply={() => setReplyTarget(null)}
            />
            <CommentThread threadId={threadId} onReply={handleReply} />
          </>
        ) : (
          <div className={styles.commentUnavailable}>
            <p>この環境ではコメントスレッドを閲覧できません。</p>
            <p>
              コメントスレッドを表示するには
              <Link href={`/auth/login?redirectTo=/plots/${plot.id}`} className={styles.loginLink}>
                ログインはこちら
              </Link>
              。
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function SectionEditorWithLock({
  section,
  plotId,
  isPaused,
  isAuthenticated,
  onRequireLogin,
  isDeleting,
  awareness,
  ydoc,
  provider,
  onEditingSectionChange,
  onSave,
  onDelete,
}: {
  section: SectionResponse;
  plotId: string;
  isPaused: boolean;
  isAuthenticated: boolean;
  onRequireLogin: () => void;
  isDeleting: boolean;
  awareness: ReturnType<typeof usePlotRealtime>["awareness"];
  ydoc: ReturnType<typeof usePlotRealtime>["ydoc"];
  provider: ReturnType<typeof usePlotRealtime>["provider"];
  onEditingSectionChange: (id: string | null) => void;
  onSave: (title: string, content: Record<string, unknown>, options?: { silent?: boolean }) => Promise<boolean>;
  onDelete: () => Promise<void>;
}) {
  const {
    lockState: hookLockState,
    lockedBy: hookLockedBy,
    acquireLock,
    releaseLock,
  } = useSectionLock(plotId, section.id, {
    awareness,
    provider,
  });
  const lockState: LockState = hookLockState;
  const lockedBy: SectionAwarenessState["user"] | null = hookLockedBy;

  const handleEditStart = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error("編集するにはログインが必要です");
      onRequireLogin();
      return;
    }

    if (isPaused) {
      toast.error("このPlotは編集が一時停止されています");
      return;
    }

    const success = await acquireLock();
    if (success) {
      onEditingSectionChange(section.id);
    } else if (lockedBy) {
      toast.error(`このセクションは ${lockedBy.displayName} が編集中です`);
    } else {
      toast.error("このセクションは現在編集できません。少し待って再試行してください");
    }
  }, [
    isPaused,
    isAuthenticated,
    onRequireLogin,
    section.id,
    acquireLock,
    onEditingSectionChange,
    lockedBy,
  ]);

  const effectiveLockState: LockState = isAuthenticated ? lockState : "unlocked";

  const handleEditEnd = useCallback(() => {
    releaseLock();
    onEditingSectionChange(null);
  }, [releaseLock, onEditingSectionChange]);

  const handleLockRevoked = useCallback(() => {
    // ロックが奪われた場合は releaseLock を呼ばない（内部で処理済み）
    // 親の editing 状態だけリセットする
    onEditingSectionChange(null);
  }, [onEditingSectionChange]);

  return (
    <SectionEditor
      section={section}
      lockState={effectiveLockState}
      lockedBy={lockedBy}
      ydoc={ydoc ?? undefined}
      provider={provider ?? undefined}
      onSave={onSave}
      onDelete={onDelete}
      isDeleting={isDeleting}
      onEditStart={handleEditStart}
      onEditEnd={handleEditEnd}
      onLockRevoked={handleLockRevoked}
    />
  );
}
