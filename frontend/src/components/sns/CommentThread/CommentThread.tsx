"use client";

import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { MessageSquare } from "lucide-react";
import { UserAvatarLink } from "@/components/shared/UserAvatarLink";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useComments } from "@/hooks/useComments";
import styles from "./CommentThread.module.scss";

type CommentThreadProps = {
  threadId: string;
  onReply?: (parentCommentId: string) => void;
};

export function CommentThread({ threadId, onReply }: CommentThreadProps) {
  const { comments, isLoading } = useComments(threadId);

  if (isLoading) {
    return (
      <div className={styles.commentList}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.comment}>
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className={styles.commentBody}>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className={styles.emptyState}>
        <MessageSquare size={24} />
        <p>まだコメントはありません</p>
      </div>
    );
  }

  return (
    <div className={styles.commentList}>
      {comments.map((comment) => {
        const parentComment = comment.parentCommentId
          ? comments.find((c) => c.id === comment.parentCommentId)
          : null;

        return (
          <div key={comment.id} className={styles.comment}>
            <UserAvatarLink user={comment.user} size="sm" />
            <div className={styles.commentBody}>
              <div className={styles.commentMeta}>
                <span className={styles.displayName}>{comment.user.displayName}</span>
                <span className={styles.timestamp}>
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                    locale: ja,
                  })}
                </span>
              </div>
              {parentComment && (
                <span className={styles.replyTo}>@{parentComment.user.displayName}</span>
              )}
              <p className={styles.content}>{comment.content}</p>
              <Button variant="ghost" size="xs" onClick={() => onReply?.(comment.id)}>
                返信
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
