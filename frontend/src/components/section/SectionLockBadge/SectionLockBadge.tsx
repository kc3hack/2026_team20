"use client";

import { UserAvatarLink } from "@/components/shared/UserAvatarLink";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import styles from "./SectionLockBadge.module.scss";

type SectionLockBadgeProps = {
  lockedBy: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
};

export function SectionLockBadge({ lockedBy }: SectionLockBadgeProps) {
  if (!lockedBy) return null;

  return (
    <div className={styles.container}>
      <Badge variant="outline" className={cn(styles.badge)}>
        <UserAvatarLink user={lockedBy} size="sm" />
        <span className={styles.pulseIndicator} />
        <span>{lockedBy.displayName} が編集中</span>
      </Badge>
    </div>
  );
}
