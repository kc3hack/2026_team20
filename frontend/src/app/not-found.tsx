import Link from "next/link";
import styles from "./styles/not-found.module.scss";

export default function NotFound() {
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>404</h1>
      <p>ページが見つかりません</p>
      <Link href="/" className={styles.homeLink}>
        ホームに戻る
      </Link>
    </div>
  );
}
