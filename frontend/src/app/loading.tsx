import styles from "./styles/loading.module.scss";

export default function Loading() {
  return (
    <div className={styles.container}>
      <p>読み込み中...</p>
    </div>
  );
}
