"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { BookOpen, Camera, Loader2, PenLine } from "lucide-react";
import { type ChangeEvent, useCallback, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateAvatar } from "@/hooks/useUser";
import { resolveSafeAvatarUrl } from "@/lib/api/avatar-url";
import type { UserProfileResponse } from "@/lib/api/types";
import styles from "./UserProfile.module.scss";

type UserProfileProps = {
  profile: UserProfileResponse;
};

function formatJoinDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "日時不明";
  }
  return format(date, "yyyy年MM月dd日", { locale: ja });
}

/**
 * 表示名から最大2文字のイニシャルを取得する。
 * - 空文字・空白のみの場合は「？」をフォールバックとして返す
 * - サロゲートペア（絵文字など）を正しく扱うため Array.from で分割する
 */
function getInitials(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") {
    return "？";
  }
  return Array.from(trimmed).slice(0, 2).join("");
}

export function UserProfile({ profile }: UserProfileProps) {
  const joinDate = formatJoinDate(profile.createdAt);
  const safeAvatarUrl = resolveSafeAvatarUrl(profile.avatarUrl);

  const { user } = useAuth();
  const { mutate: updateAvatar, isPending: isUploading } = useUpdateAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = !!user && user.id === profile.id;

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        updateAvatar(file);
      }
      // 同じファイルを再選択できるようにリセット
      e.target.value = "";
    },
    [updateAvatar],
  );

  return (
    <div className={styles.container}>
      <div className={styles.avatarWrapper}>
        <Avatar className={styles.avatar}>
          {safeAvatarUrl ? <AvatarImage src={safeAvatarUrl} alt={profile.displayName} /> : null}
          <AvatarFallback>{getInitials(profile.displayName)}</AvatarFallback>
        </Avatar>

        {isOwnProfile && (
          <>
            <button
              type="button"
              className={styles.avatarEditOverlay}
              onClick={handleAvatarClick}
              disabled={isUploading}
              aria-label="アバター画像を変更"
            >
              {isUploading ? (
                <Loader2 size={20} className={styles.spinner} />
              ) : (
                <Camera size={20} />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.fileInput}
              onChange={handleFileChange}
              aria-hidden="true"
              tabIndex={-1}
            />
          </>
        )}
      </div>

      <div className={styles.info}>
        <h1 className={styles.displayName}>{profile.displayName}</h1>
        <p className={styles.joinDate}>{joinDate} に参加</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <BookOpen size={16} />
          <span className={styles.statValue}>{profile.plotCount}</span>
          <span className={styles.statLabel}>Plot</span>
        </div>
        <div className={styles.statItem}>
          <PenLine size={16} />
          <span className={styles.statValue}>{profile.contributionCount}</span>
          <span className={styles.statLabel}>コントリビューション</span>
        </div>
      </div>
    </div>
  );
}
