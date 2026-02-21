"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import styles from "./TagBadge.module.scss";

type TagBadgeProps = {
  tag: string;
  onClick?: (tag: string) => void;
};

export function TagBadge({ tag, onClick }: TagBadgeProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 親のLinkクリックを防ぐ

    if (onClick) {
      onClick(tag);
    } else {
      router.push(`/plots?tag=${encodeURIComponent(tag)}`);
    }
  };

  return (
    <button type="button" onClick={handleClick} className={styles.button}>
      <Badge variant="secondary" className={cn("cursor-pointer", styles.badge)}>
        {tag}
      </Badge>
    </button>
  );
}
