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

function getInitials(name: string): string {
  return name.slice(0, 2);
}

export function UserProfile({ profile }: UserProfileProps) {
  const joinDate = formatJoinDate(profile.createdAt);

  return (
    <div className={styles.container}>
      <Avatar className={styles.avatar}>
        {profile.avatarUrl ? (
          <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
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
