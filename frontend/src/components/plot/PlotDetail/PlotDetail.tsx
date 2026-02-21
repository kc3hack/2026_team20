"use client";

import { useCallback, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Plus, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SectionEditor } from "@/components/section/SectionEditor/SectionEditor";
import { SectionList } from "@/components/section/SectionList/SectionList";
import { TableOfContents } from "@/components/section/TableOfContents/TableOfContents";
import { TagBadge } from "@/components/shared/TagBadge/TagBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePlotRealtime } from "@/hooks/usePlotRealtime";
import { useSectionLock } from "@/hooks/useSectionLock";
import { useCreateSection, useUpdateSection } from "@/hooks/useSections";
import type { PlotDetailResponse, SectionResponse } from "@/lib/api/types";
import type { LockState, SectionAwarenessState } from "@/lib/realtime/types";
import styles from "./PlotDetail.module.scss";

type PlotDetailProps = {
  plot: PlotDetailResponse;
};

export function PlotDetail({ plot }: PlotDetailProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { ydoc, provider, lockStates, connectionStatus, awareness } = usePlotRealtime(plot.id);
  const updateSection = useUpdateSection();
  const createSection = useCreateSection();

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  const ownerInitials = plot.owner?.displayName.slice(0, 2) ?? "??";
  const createdAgo = formatDistanceToNow(new Date(plot.createdAt), {
    addSuffix: true,
    locale: ja,
  });

  const sortedSections = useMemo(
    () => [...plot.sections].sort((a, b) => a.orderIndex - b.orderIndex),
    [plot.sections],
  );

  const handleAddSection = () => {
    if (!isAuthenticated) {
      toast.error("セクションを追加するにはログインが必要です");
      router.push(`/auth/login?redirectTo=/plots/${plot.id}`);
      return;
    }
    if (plot.isPaused) {
      toast.error("このPlotは編集が一時停止されています");
      return;
    }

    createSection.mutate({
      plotId: plot.id,
      body: {
        title: `新しいセクション ${sortedSections.length + 1}`,
      },
    });
  };

  return (
    <div className={styles.container}>
      {plot.isPaused && (
        <div className={styles.pausedBanner} role="alert">
          <Badge variant="destructive">⚠️ 編集一時停止中</Badge>
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{plot.title}</h1>
        </div>

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
          {isAuthenticated ? (
            <>
              {sortedSections.map((section) => (
                <SectionEditorWithLock
                  key={section.id}
                  section={section}
                  plotId={plot.id}
                  isPaused={plot.isPaused}
                  awareness={awareness}
                  lockStates={lockStates}
                  ydoc={ydoc}
                  provider={provider}
                  onEditingSectionChange={setEditingSectionId}
                  onSave={(title, content) => {
                    updateSection.mutate({
                      plotId: plot.id,
                      sectionId: section.id,
                      body: { title, content },
                    });
                  }}
                />
              ))}
              {!plot.isPaused && (
                <div className={styles.addSection}>
                  <Button
                    variant="outline"
                    onClick={handleAddSection}
                    disabled={createSection.isPending}
                  >
                    <Plus size={16} />
                    セクション追加
                  </Button>
                </div>
              )}
            </>
          ) : (
            <SectionList
              sections={plot.sections}
              lockStates={lockStates}
              connectionStatus={connectionStatus}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function SectionEditorWithLock({
  section,
  plotId,
  isPaused,
  awareness,
  lockStates,
  ydoc,
  provider,
  onEditingSectionChange,
  onSave,
}: {
  section: SectionResponse;
  plotId: string;
  isPaused: boolean;
  awareness: ReturnType<typeof usePlotRealtime>["awareness"];
  lockStates: Map<string, { lockState: LockState; lockedBy: SectionAwarenessState["user"] | null }>;
  ydoc: ReturnType<typeof usePlotRealtime>["ydoc"];
  provider: ReturnType<typeof usePlotRealtime>["provider"];
  onEditingSectionChange: (id: string | null) => void;
  onSave: (title: string, content: Record<string, unknown>) => void;
}) {
  const {
    lockState: hookLockState,
    lockedBy: hookLockedBy,
    acquireLock,
    releaseLock,
  } = useSectionLock(plotId, section.id, {
    awareness,
  });

  // lockStates Map（グローバル管理）に値があればそれを使い、
  // なければ useSectionLock が返す個別の状態をフォールバックとして使う
  const lockInfo = lockStates.get(section.id);
  const lockState: LockState = lockInfo?.lockState ?? hookLockState;
  const lockedBy = lockInfo?.lockedBy ?? hookLockedBy;

  const handleEditStart = useCallback(async () => {
    if (isPaused) {
      toast.error("このPlotは編集が一時停止されています");
      return;
    }

    const success = await acquireLock();
    if (success) {
      onEditingSectionChange(section.id);
    } else if (lockedBy) {
      toast.error(`このセクションは ${lockedBy.displayName} が編集中です`);
    }
  }, [
    isPaused,
    section.id,
    acquireLock,
    onEditingSectionChange,
    lockedBy,
  ]);

  const handleEditEnd = useCallback(() => {
    releaseLock();
    onEditingSectionChange(null);
  }, [releaseLock, onEditingSectionChange]);

  return (
    <SectionEditor
      section={section}
      lockState={lockState}
      lockedBy={lockedBy}
      ydoc={ydoc ?? undefined}
      provider={provider ?? undefined}
      onSave={onSave}
      onEditStart={handleEditStart}
      onEditEnd={handleEditEnd}
    />
  );
}
