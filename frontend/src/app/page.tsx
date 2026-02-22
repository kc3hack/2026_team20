import { LatestSection, PopularSection, TrendingSection } from "./_sections";
import styles from "./styles/page.module.scss";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Home</h1>
      <p className={styles.subtitle}>"本当に欲しい"をカタチに</p>

      <TrendingSection />
      <LatestSection />
      <PopularSection />
    </main>
  );
}
