import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { BookOpen, PenLine } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

/**
 * アバターURLが安全かどうかを検証する。
 * XSSやOpen Redirect攻撃を防ぐため、httpsスキームのみ許可し、
 * javascript:, data:, vbscript: などの危険なスキームを拒否する。
 */
function getSafeAvatarUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function UserProfile({ profile }: UserProfileProps) {
  const joinDate = formatJoinDate(profile.createdAt);
  const safeAvatarUrl = getSafeAvatarUrl(profile.avatarUrl);

  return (
    <div className={styles.container}>
      <Avatar className={styles.avatar}>
        {safeAvatarUrl ? (
          <AvatarImage src={safeAvatarUrl} alt={profile.displayName} />
        ) : null}
        <AvatarFallback>{getInitials(profile.displayName)}</AvatarFallback>
      </Avatar>

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
