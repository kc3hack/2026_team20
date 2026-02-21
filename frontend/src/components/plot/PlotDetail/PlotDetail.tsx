"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { History, Pencil, Plus, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { SectionEditor } from "@/components/section/SectionEditor/SectionEditor";
import { SectionList } from "@/components/section/SectionList/SectionList";
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
import { useCreateSection, useUpdateSection } from "@/hooks/useSections";
import type { CommentResponse, PlotDetailResponse, SectionResponse } from "@/lib/api/types";
import type { LockState, SectionAwarenessState } from "@/lib/realtime/types";
import styles from "./PlotDetail.module.scss";

type PlotDetailProps = {
  plot: PlotDetailResponse;
};

export function PlotDetail({ plot }: PlotDetailProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { ydoc, provider, lockStates, connectionStatus, awareness } = usePlotRealtime(plot.id);
  const updateSection = useUpdateSection();
  const createSection = useCreateSection();

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // スレッド管理 — Plot全体コメント用スレッド (sectionId=null) をマウント時に自動作成する。
  // PlotDetailResponse に threadId が含まれないため、初回アクセス時に POST /threads で作成し、
  // useState で保持する。本番API繋ぎ込み時（Issue #16）で GET /plots/{plotId}/threads による
  // 既存スレッド取得に対応予定。
  const [threadId, setThreadId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<CommentResponse | null>(null);
  const { createThread } = useCreateThread();

  // マウント時にPlot全体コメント用スレッドを自動作成（1回のみ実行）
  // createThread は毎レンダー新しい参照になるため、useRef で多重実行を防ぐ
  const threadInitialized = useRef(false);
  useEffect(() => {
    if (threadInitialized.current) return;
    threadInitialized.current = true;

    createThread(plot.id)
      .then((thread) => setThreadId(thread.id))
      .catch(() => toast.error("コメントスレッドの読み込みに失敗しました"));
  }, [createThread, plot.id]);

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

  const handleAddSection = () => {
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
            <span className={styles.starCount}>
              <Star size={16} />
              {plot.starCount}
            </span>
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
          {isAuthenticated ? (
            <>
              {sortedSections.map((section) => (
                <SectionEditorWithLock
                  key={section.id}
                  section={section}
                  plotId={plot.id}
                  isPaused={plot.isPaused}
                  awareness={awareness}
                  ydoc={ydoc}
                  provider={provider}
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
                />
              ))}
              {!plot.isPaused && (
                <div className={styles.addSection}>
                  <Button
                    variant="outline"
                    onClick={handleAddSection}
                    disabled={createSection.isPending}
                  >
                    <Plus size={16} />
                    セクション追加
                  </Button>
                </div>
              )}
            </>
          ) : (
            <SectionList
              sections={plot.sections}
              lockStates={lockStates}
              connectionStatus={connectionStatus}
              provider={provider}
            />
          )}
        </main>
      </div>

      <section className={styles.commentSection}>
        <h2>コメント</h2>
        {threadId ? (
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
          <div className={styles.commentLoading}>
            <Skeleton className={styles.commentSkeleton} />
            <Skeleton className={styles.commentSkeleton} />
            <Skeleton className={styles.commentSkeleton} />
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
  awareness,
  ydoc,
  provider,
  onEditingSectionChange,
  onSave,
}: {
  section: SectionResponse;
  plotId: string;
  isPaused: boolean;
  awareness: ReturnType<typeof usePlotRealtime>["awareness"];
  ydoc: ReturnType<typeof usePlotRealtime>["ydoc"];
  provider: ReturnType<typeof usePlotRealtime>["provider"];
  onEditingSectionChange: (id: string | null) => void;
  onSave: (title: string, content: Record<string, unknown>, options?: { silent?: boolean }) => Promise<boolean>;
}) {
  const {
    lockState: hookLockState,
    lockedBy: hookLockedBy,
    acquireLock,
    releaseLock,
  } = useSectionLock(plotId, section.id, {
    awareness,
  });
  const lockState: LockState = hookLockState;
  const lockedBy: SectionAwarenessState["user"] | null = hookLockedBy;

  const handleEditStart = useCallback(async () => {
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
    section.id,
    acquireLock,
    onEditingSectionChange,
    lockedBy,
  ]);

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
      lockState={lockState}
      lockedBy={lockedBy}
      ydoc={ydoc ?? undefined}
      provider={provider ?? undefined}
      onSave={onSave}
      onEditStart={handleEditStart}
      onEditEnd={handleEditEnd}
      onLockRevoked={handleLockRevoked}
    />
  );
}
