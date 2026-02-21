import Link from "next/link";
import { LatestSection, PopularSection, TrendingSection } from "./_sections";
import styles from "./styles/page.module.scss";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Plot Platform</h1>
      <p className={styles.subtitle}>「架空の欲しいもの」をみんなで作り上げる</p>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>🔥 急上昇</h2>
          <Link href="/plots?sort=trending" className={styles.moreLink}>
            もっと見る →
          </Link>
        </div>
        <TrendingSection />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>🆕 新着</h2>
          <Link href="/plots?sort=new" className={styles.moreLink}>
            もっと見る →
          </Link>
        </div>
        <LatestSection />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>⭐ 人気</h2>
          <Link href="/plots?sort=popular" className={styles.moreLink}>
            もっと見る →
          </Link>
        </div>
        <PopularSection />
      </section>
    </main>
  );
}
