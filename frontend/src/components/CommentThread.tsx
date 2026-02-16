"use client";

import { useState, useCallback, useEffect, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { CommentItem } from "@/lib/api";
import styles from "./CommentThread.module.scss";

interface CommentThreadProps {
  threadId: string;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 30) return `${diffDay}日前`;
  return new Date(dateString).toLocaleDateString("ja-JP");
}

function CommentEntry({
  comment,
  onReply,
}: {
  comment: CommentItem;
  onReply: (commentId: string, displayName: string) => void;
}) {
  return (
    <div className={styles.comment}>
      <div className={styles.commentHeader}>
        {comment.avatarUrl ? (
          <img
            src={comment.avatarUrl}
            alt=""
            className={styles.avatar}
          />
        ) : (
          <span className={styles.avatarFallback}>
            {comment.displayName.charAt(0)}
          </span>
        )}
        <span className={styles.displayName}>{comment.displayName}</span>
        <span className={styles.timestamp}>
          {formatRelativeTime(comment.createdAt)}
        </span>
      </div>
      <div className={styles.commentBody}>{comment.content}</div>
      <button
        type="button"
        className={styles.replyBtn}
        onClick={() => onReply(comment.id, comment.displayName)}
      >
        返信
      </button>
    </div>
  );
}

export default function CommentThread({ threadId }: CommentThreadProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<{
    id: string;
    displayName: string;
  } | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await api.threads.comments(threadId);
      setComments(res.items);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const trimmed = content.trim();
      if (!trimmed || submitting) return;

      setSubmitting(true);
      try {
        const newComment = await api.threads.addComment(
          threadId,
          trimmed,
          replyTo?.id,
        );
        setComments((prev) => [...prev, newComment]);
        setContent("");
        setReplyTo(null);
      } catch {
        // silent
      } finally {
        setSubmitting(false);
      }
    },
    [threadId, content, replyTo, submitting],
  );

  const handleReply = useCallback(
    (commentId: string, displayName: string) => {
      setReplyTo({ id: commentId, displayName });
    },
    [],
  );

  const cancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const topLevelComments = comments.filter((c) => !c.parentCommentId);
  const replies = comments.filter((c) => c.parentCommentId);

  const getReplies = (parentId: string) =>
    replies.filter((r) => r.parentCommentId === parentId);

  if (loading) {
    return (
      <div className={styles.thread}>
        <div className={styles.skeleton}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.thread}>
      <h4 className={styles.threadTitle}>
        コメント
        {comments.length > 0 && (
          <span className={styles.commentCount}>{comments.length}</span>
        )}
      </h4>

      {topLevelComments.length === 0 && (
        <p className={styles.empty}>まだコメントがありません</p>
      )}

      <div className={styles.commentList}>
        {topLevelComments.map((comment) => (
          <div key={comment.id} className={styles.commentGroup}>
            <CommentEntry comment={comment} onReply={handleReply} />
            {getReplies(comment.id).length > 0 && (
              <div className={styles.repliesGroup}>
                {getReplies(comment.id).map((reply) => (
                  <CommentEntry
                    key={reply.id}
                    comment={reply}
                    onReply={handleReply}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {replyTo && (
          <div className={styles.replyIndicator}>
            <span>
              {replyTo.displayName} に返信
            </span>
            <button
              type="button"
              className={styles.cancelReply}
              onClick={cancelReply}
            >
              &times;
            </button>
          </div>
        )}
        <div className={styles.inputRow}>
          <textarea
            className={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="コメントを入力…"
            rows={2}
            maxLength={5000}
          />
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!content.trim() || submitting}
          >
            {submitting ? "送信中…" : "送信"}
          </button>
        </div>
      </form>
    </div>
  );
}
