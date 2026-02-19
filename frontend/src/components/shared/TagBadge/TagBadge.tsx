import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import styles from "./TagBadge.module.scss";

type TagBadgeProps = {
  tag: string;
  onClick?: (tag: string) => void;
};

export function TagBadge({ tag, onClick }: TagBadgeProps) {
  const handleClick = () => {
    onClick?.(tag);
  };

  return (
    <Link
      href={`/plots?tag=${encodeURIComponent(tag)}`}
      onClick={handleClick}
      className={styles.link}
    >
      <Badge variant="secondary" className={cn("cursor-pointer", styles.badge)}>
        {tag}
      </Badge>
    </Link>
  );
}
