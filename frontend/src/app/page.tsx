import { LatestSection, PopularSection, TrendingSection } from "./_sections";
import styles from "./styles/page.module.scss";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Plot Platform</h1>
      <p className={styles.subtitle}>「架空の欲しいもの」をみんなで作り上げる</p>

      <TrendingSection />
      <LatestSection />
      <PopularSection />
    </main>
  );
}
