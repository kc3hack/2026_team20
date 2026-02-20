"use client";

import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Star } from "lucide-react";
import { SectionList } from "@/components/section/SectionList/SectionList";
import { TableOfContents } from "@/components/section/TableOfContents/TableOfContents";
import { TagBadge } from "@/components/shared/TagBadge/TagBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { PlotDetailResponse } from "@/lib/api/types";
import styles from "./PlotDetail.module.scss";

type PlotDetailProps = {
  plot: PlotDetailResponse;
};

export function PlotDetail({ plot }: PlotDetailProps) {
  const ownerInitials = plot.owner?.displayName.slice(0, 2) ?? "??";
  const createdAgo = formatDistanceToNow(new Date(plot.createdAt), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <div className={styles.container}>
      {plot.isPaused && (
        <div className={styles.pausedBanner} role="alert">
          <Badge variant="destructive">⚠️ 編集一時停止中</Badge>
        </div>
      )}

      <header className={styles.header}>
        <h1 className={styles.title}>{plot.title}</h1>

        {plot.description && <p className={styles.description}>{plot.description}</p>}

        <div className={styles.meta}>
          {plot.owner && (
            <div className={styles.owner}>
              <Avatar size="sm">
                {plot.owner.avatarUrl && (
                  <AvatarImage src={plot.owner.avatarUrl} alt={plot.owner.displayName} />
                )}
                <AvatarFallback>{ownerInitials}</AvatarFallback>
              </Avatar>
              <span className={styles.ownerName}>{plot.owner.displayName}</span>
            </div>
          )}

          <div className={styles.stats}>
            <span className={styles.starCount}>
              <Star size={16} />
              {plot.starCount}
            </span>
            <span className={styles.createdAt}>{createdAgo}</span>
          </div>
        </div>

        {plot.tags.length > 0 && (
          <div className={styles.tags}>
            {plot.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <TableOfContents sections={plot.sections} />
        </aside>
        <main className={styles.main}>
          <SectionList sections={plot.sections} />
        </main>
      </div>
    </div>
  );
}
