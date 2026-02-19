"use client";

import styles from "./styles/error.module.scss";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>エラーが発生しました</h1>
      <p>{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className={styles.retryButton}
      >
        再試行
      </button>
    </div>
  );
}
