"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useAddComment } from "@/hooks/useComments";
import styles from "./CommentForm.module.scss";

const MAX_LENGTH = 5000;

type CommentFormProps = {
  threadId: string;
  parentCommentId?: string;
  parentCommentUser?: string;
  onCancelReply?: () => void;
};

export function CommentForm({
  threadId,
  parentCommentId,
  parentCommentUser,
  onCancelReply,
}: CommentFormProps) {
  const { isAuthenticated } = useAuth();
  const { addComment, isPending } = useAddComment(threadId);
  const currentPath = usePathname();
  const [content, setContent] = useState("");

  const canSubmit = content.trim().length > 0 && content.length <= MAX_LENGTH && !isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    addComment(content, parentCommentId);
    setContent("");
  };

  return (
    <div className={styles.formWrapper}>
      {parentCommentId && parentCommentUser && (
        <div className={styles.replyIndicator}>
          <span>@{parentCommentUser} に返信</span>
          <Button variant="ghost" size="xs" onClick={onCancelReply}>
            キャンセル
          </Button>
        </div>
      )}

      {isAuthenticated ? (
        <>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="コメントを入力..."
          />
          <div className={styles.formFooter}>
            <span className={styles.charCount}>
              {content.length}/{MAX_LENGTH}
            </span>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              投稿
            </Button>
          </div>
        </>
      ) : (
        <>
          <Textarea disabled placeholder="コメントを入力..." />
          <div className={styles.formFooter}>
            <Link href={`/auth/login?redirectTo=${encodeURIComponent(currentPath)}`} className={styles.loginLink}>
              ログインしてコメントする
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
