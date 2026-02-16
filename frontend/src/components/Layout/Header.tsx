import AuthButton from "@/components/AuthButton";
import styles from "./Header.module.scss";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="/" className={styles.logo}>
          <span className={styles.logoMark}>D</span>
          <span className={styles.logoText}>DocEditor</span>
        </a>
        <nav className={styles.nav}>
          <a href="/documents" className={styles.navLink}>
            ドキュメント
          </a>
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
