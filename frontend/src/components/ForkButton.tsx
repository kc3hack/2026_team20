"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./ForkButton.module.scss";

interface ForkButtonProps {
  plotId: string;
}

export default function ForkButton({ plotId }: ForkButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleFork = useCallback(async () => {
    if (loading) return;

    if (!window.confirm("このPlotをフォークしますか？")) return;

    setLoading(true);
    try {
      const forked = await api.forks.create(plotId);
      router.push(`/plots/${forked.id}`);
    } catch {
      setLoading(false);
    }
  }, [plotId, loading, router]);

  return (
    <button
      type="button"
      className={styles.forkButton}
      onClick={handleFork}
      disabled={loading}
      aria-label="Plotをフォーク"
    >
      <svg
        className={styles.icon}
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 3.25a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0ZM5 12.75a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0ZM15.5 3.25a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0ZM2.75 5.5v2c0 1.1.9 2 2 2h6.5c1.1 0 2-.9 2-2v-2M8 9.5v1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{loading ? "フォーク中…" : "フォーク"}</span>
    </button>
  );
}
