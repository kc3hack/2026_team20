"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import styles from "./StarButton.module.scss";

interface StarButtonProps {
  plotId: string;
  initialStarred: boolean;
  initialCount: number;
}

export default function StarButton({
  plotId,
  initialStarred,
  initialCount,
}: StarButtonProps) {
  const [starred, setStarred] = useState(initialStarred);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    const wasStarred = starred;
    setStarred(!wasStarred);
    setCount((c) => (wasStarred ? c - 1 : c + 1));

    try {
      if (wasStarred) {
        await api.stars.remove(plotId);
      } else {
        await api.stars.add(plotId);
      }
    } catch {
      setStarred(wasStarred);
      setCount((c) => (wasStarred ? c + 1 : c - 1));
    } finally {
      setLoading(false);
    }
  }, [plotId, starred, loading]);

  return (
    <button
      type="button"
      className={`${styles.starButton} ${starred ? styles.starred : ""}`}
      onClick={toggle}
      disabled={loading}
      aria-label={starred ? "スターを外す" : "スターをつける"}
      aria-pressed={starred}
    >
      <span className={styles.icon} aria-hidden="true">
        {starred ? "★" : "☆"}
      </span>
      <span className={styles.count}>{count}</span>
    </button>
  );
}
