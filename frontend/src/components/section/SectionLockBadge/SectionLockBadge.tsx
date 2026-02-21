"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  const initials = lockedBy.displayName.slice(0, 2);

  return (
    <div className={styles.container}>
      <Badge variant="outline" className={cn(styles.badge)}>
        <Avatar size="sm">
          {lockedBy.avatarUrl && (
            <AvatarImage src={lockedBy.avatarUrl} alt={lockedBy.displayName} />
          )}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className={styles.pulseIndicator} />
        <span>{lockedBy.displayName} が編集中</span>
      </Badge>
    </div>
  );
}
