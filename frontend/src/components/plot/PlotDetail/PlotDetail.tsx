"use client";

import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Pencil, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
import { useAuth } from "@/hooks/useAuth";
import { useComments, useCreateThread } from "@/hooks/useComments";
import type { CommentResponse, PlotDetailResponse } from "@/lib/api/types";
import styles from "./PlotDetail.module.scss";

type PlotDetailProps = {
  plot: PlotDetailResponse;
};

export function PlotDetail({ plot }: PlotDetailProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // スレッド管理 — MVP方針(A): PlotDetailResponse に threadId が含まれないため、
  // 「コメントを開始」ボタンで新規作成し useState で保持する。
  // 本番API繋ぎ込み時（Issue #16）で既存スレッド取得に対応予定
  const [threadId, setThreadId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<CommentResponse | null>(null);
  const { createThread, isPending: isCreatingThread } = useCreateThread();

  const { comments } = useComments(threadId ?? "");

  const ownerInitials = plot.owner?.displayName.slice(0, 2) ?? "??";
  const createdAgo = formatDistanceToNow(new Date(plot.createdAt), {
    addSuffix: true,
    locale: ja,
  });

  const handleEditClick = () => {
    if (!isAuthenticated) {
      toast.error("編集するにはログインが必要です");
      router.push(`/auth/login?redirectTo=/plots/${plot.id}`);
      return;
    }
    // TODO: Issue #9 — ログイン済みユーザーのインプレース編集機能
  };

  const handleCreateThread = async () => {
    const thread = await createThread(plot.id);
    setThreadId(thread.id);
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
          <Button variant="outline" size="sm" onClick={handleEditClick} disabled={plot.isPaused}>
            <Pencil size={16} />
            編集する
          </Button>
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
          <SectionList sections={plot.sections} />
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
          <Button onClick={handleCreateThread} disabled={isCreatingThread}>
            コメントを開始
          </Button>
        )}
      </section>
    </div>
  );
}
