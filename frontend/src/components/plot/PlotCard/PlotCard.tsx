import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Star } from "lucide-react";
import Link from "next/link";
import { TagBadge } from "@/components/shared/TagBadge/TagBadge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlotResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import styles from "./PlotCard.module.scss";

type PlotCardProps = {
  plot: PlotResponse;
};

export function PlotCard({ plot }: PlotCardProps) {
  const createdAtDate = new Date(plot.createdAt);
  const isValidDate = !Number.isNaN(createdAtDate.getTime());
  const createdAtLabel = isValidDate
    ? formatDistanceToNow(createdAtDate, {
        addSuffix: true,
        locale: ja,
      })
    : "日時不明";

  return (
    <Link href={`/plots/${plot.id}`} className={styles.link}>
      <Card className={cn(styles.card)}>
        <CardHeader>
          <CardTitle className={styles.title}>
            <h3>{plot.title}</h3>
          </CardTitle>
        </CardHeader>

        <CardContent className={styles.content}>
          {plot.description && <p className={styles.description}>{plot.description}</p>}

          {plot.tags.length > 0 && (
            <div className={styles.tags}>
              {plot.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className={styles.footer}>
          <span className={styles.stars}>
            <Star size={14} />
            {plot.starCount}
          </span>
          <time dateTime={plot.createdAt} className={styles.date}>
            {createdAtLabel}
          </time>
        </CardFooter>
      </Card>
    </Link>
  );
}
