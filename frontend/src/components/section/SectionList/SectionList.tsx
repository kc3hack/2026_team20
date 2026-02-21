"use client";

import { useMemo } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { SectionViewer } from "@/components/section/SectionViewer/SectionViewer";
import { Skeleton } from "@/components/ui/skeleton";
import type { SectionResponse } from "@/lib/api/types";
import type { ConnectionStatus, LockState, SectionAwarenessState } from "@/lib/realtime/types";
import type { SupabaseBroadcastProvider } from "@/lib/realtime/yjsProvider";
import styles from "./SectionList.module.scss";

type LockInfo = {
  lockState: LockState;
  lockedBy: SectionAwarenessState["user"] | null;
};

type SectionListProps = {
  sections: SectionResponse[];
  isLoading?: boolean;
  lockStates?: Map<string, LockInfo>;
  connectionStatus?: ConnectionStatus;
  provider?: SupabaseBroadcastProvider | null;
};

export function SectionList({
  sections,
  isLoading = false,
  lockStates,
  connectionStatus,
  provider,
}: SectionListProps) {
  const sorted = useMemo(
    () => [...sections].sort((a, b) => a.orderIndex - b.orderIndex),
    [sections],
  );

  if (isLoading) {
    return (
      <div className={styles.container} data-testid="section-list-loading">
        {["skeleton-1", "skeleton-2", "skeleton-3"].map((id) => (
          <div key={id} className={styles.skeletonItem}>
            <Skeleton className={styles.skeletonTitle} />
            <Skeleton className={styles.skeletonContent} />
          </div>
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.empty} data-testid="section-list-empty">
          まだセクションがありません
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {connectionStatus && (
        <div className={styles.connectionIndicator} data-testid="connection-indicator">
          {connectionStatus === "connected" ? (
            <span className={styles.connected}>
              <Wifi size={14} />
              接続中
            </span>
          ) : connectionStatus === "connecting" ? (
            <span className={styles.connecting}>
              <Wifi size={14} />
              接続中...
            </span>
          ) : (
            <span className={styles.disconnected}>
              <WifiOff size={14} />
              未接続
            </span>
          )}
        </div>
      )}
      {sorted.map((section) => {
        const lockInfo = lockStates?.get(section.id);
        const isBeingEdited = lockInfo?.lockState === "locked-by-other";
        const editedBy = isBeingEdited ? lockInfo?.lockedBy ?? null : null;

        return (
          <SectionViewer
            key={section.id}
            section={section}
            isBeingEdited={isBeingEdited}
            editedBy={editedBy}
            provider={provider}
          />
        );
      })}
    </div>
  );
}
