import Link from "next/link";
import { PlotList } from "@/components/plot/PlotList/PlotList";
import type { PlotResponse } from "@/lib/api/types";
import styles from "./PlotSection.module.scss";

type PlotSectionProps = {
  /** セクション見出し（例: "🔥 急上昇"） */
  title: string;
  /** 表示する Plot の配列 */
  plots: PlotResponse[];
  /** データ取得中かどうか */
  isLoading: boolean;
  /** 「もっと見る →」リンクの遷移先 */
  moreHref: string;
};

/**
 * トップページのセクション共通コンポーネント。
 * タイトル + PlotList + 「もっと見る」リンクを一括で描画する。
 * page.tsx を薄く保つため、セクション表示の責務をここに集約している。
 */
export function PlotSection({ title, plots, isLoading, moreHref }: PlotSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <Link href={moreHref} className={styles.moreLink}>
          もっと見る →
        </Link>
      </div>
      <PlotList items={plots} isLoading={isLoading} />
    </section>
  );
}
