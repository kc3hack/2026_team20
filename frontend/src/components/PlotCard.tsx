import type { PlotItem } from "@/lib/api";
import styles from "./PlotCard.module.scss";

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

interface PlotCardProps {
  plot: PlotItem;
}

export default function PlotCard({ plot }: PlotCardProps) {
  const isEditing = plot.editingUsers.length > 0;

  return (
    <a href={`/plots/${plot.id}`} className={styles.card}>
      <h3 className={styles.title}>{plot.title}</h3>

      {plot.tags.length > 0 && (
        <div className={styles.tags}>
          {plot.tags.slice(0, 3).map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <span className={styles.starIcon}>★</span>
          {plot.starCount}
        </span>
        <span className={styles.metaItem}>
          {formatRelativeTime(plot.updatedAt)}
        </span>
        {isEditing && (
          <span className={styles.editingBadge}>
            <span className={styles.editingDot} />
            編集中
          </span>
        )}
      </div>
    </a>
  );
}

// Skeleton variant for loading state
export function PlotCardSkeleton() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`}>
      <div className={styles.title}>&nbsp;</div>
      <div className={styles.tags}>
        <span className={styles.tag}>&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <span className={styles.tag}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
      </div>
      <div className={styles.meta}>
        <span className={styles.metaItem}>&nbsp;&nbsp;&nbsp;</span>
        <span className={styles.metaItem}>&nbsp;&nbsp;&nbsp;&nbsp;</span>
      </div>
    </div>
  );
}
