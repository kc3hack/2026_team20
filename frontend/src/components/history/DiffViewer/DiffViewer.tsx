"use client";

import { ArrowRight, FileDiff } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { DiffResponse } from "@/lib/api/types";
import styles from "./DiffViewer.module.scss";

// ── Props ─────────────────────────────────────────────
interface DiffViewerProps {
  diff: DiffResponse;
}

// ── 内部型 ────────────────────────────────────────────
type DiffLine = {
  type: "addition" | "deletion";
  lineNumber: number;
  text: string;
};

/**
 * additions / deletions を統合し行番号の昇順にソートした配列を返す。
 * 複数行にまたがるテキストは改行で分割して 1 行ずつ展開する。
 */
function mergeDiffLines(diff: DiffResponse): DiffLine[] {
  const lines: DiffLine[] = [];

  for (const addition of diff.additions) {
    const textLines = addition.text.split("\n");
    textLines.forEach((text, i) => {
      lines.push({
        type: "addition",
        lineNumber: addition.start + i,
        text,
      });
    });
  }

  for (const deletion of diff.deletions) {
    const textLines = deletion.text.split("\n");
    textLines.forEach((text, i) => {
      lines.push({
        type: "deletion",
        lineNumber: deletion.start + i,
        text,
      });
    });
  }

  // 行番号昇順 → 同一行番号の場合は deletion を先に表示（GitHub 風）
  lines.sort((a, b) => {
    if (a.lineNumber !== b.lineNumber) return a.lineNumber - b.lineNumber;
    return a.type === "deletion" ? -1 : 1;
  });

  return lines;
}

// ── コンポーネント ────────────────────────────────────
export function DiffViewer({ diff }: DiffViewerProps) {
  const lines = useMemo(() => mergeDiffLines(diff), [diff]);

  // ── 空状態 ──────────────────────────────────────────
  if (diff.additions.length === 0 && diff.deletions.length === 0) {
    return (
      <div className={styles.empty} data-testid="diff-viewer-empty">
        <FileDiff size={32} className={styles.icon} />
        <p className={styles.emptyMessage}>変更はありません</p>
      </div>
    );
  }

  return (
    <div className={styles.diffViewer} data-testid="diff-viewer">
      <div className={styles.header}>
        <Badge variant="outline" className={styles.versionLabel}>
          v{diff.fromVersion}
        </Badge>
        <ArrowRight size={14} className={styles.arrow} />
        <Badge variant="outline" className={styles.versionLabel}>
          v{diff.toVersion}
        </Badge>
      </div>

      <div className={styles.summary}>
        <span className={styles.additionCount}>
          +{diff.additions.length} 追加
        </span>
        <span className={styles.deletionCount}>
          -{diff.deletions.length} 削除
        </span>
      </div>

      <div className={styles.lines}>
        {lines.map((line, index) => (
          <div
            key={`${line.type}-${line.lineNumber}-${index}`}
            className={`${styles.line} ${
              line.type === "addition" ? styles.addition : styles.deletion
            }`}
            data-testid={`diff-line-${line.type}`}
          >
            <span className={styles.lineNumber}>{line.lineNumber}</span>
            <span className={styles.marker}>
              {line.type === "addition" ? "+" : "-"}
            </span>
            <span className={styles.content}>{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
