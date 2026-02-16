"use client";

import type { HistoryEntry } from "@/lib/api";
import styles from "./HistorySidebar.module.scss";

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function operationLabel(type: string): string {
  switch (type) {
    case "insert":
      return "追加";
    case "delete":
      return "削除";
    case "update":
      return "更新";
    default:
      return type;
  }
}

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  isLoading: boolean;
  onRollback: (version: number) => void;
}

export default function HistorySidebar({
  isOpen,
  onClose,
  history,
  isLoading,
  onRollback,
}: HistorySidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={onClose}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          role="button"
          tabIndex={0}
          aria-label="サイドバーを閉じる"
        />
      )}

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>編集履歴</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="閉じる"
          >
            &times;
          </button>
        </div>

        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.loading}>
              {Array.from({ length: 3 }, (_, i) => (
                <div key={`skeleton-${i}`} className={styles.entrySkeleton}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLineShort} />
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className={styles.empty}>履歴がありません</p>
          ) : (
            <ul className={styles.list}>
              {history.map((entry) => (
                <li key={entry.id} className={styles.entry}>
                  <div className={styles.entryInfo}>
                    <span className={styles.entryType}>
                      {operationLabel(entry.operationType)}
                    </span>
                    <span className={styles.entryMeta}>
                      v{entry.version} &middot; {formatTime(entry.createdAt)}
                    </span>
                    {entry.user && (
                      <span className={styles.entryUser}>
                        {entry.user.displayName}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.rollbackBtn}
                    onClick={() => onRollback(entry.version)}
                  >
                    この版に戻す
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
