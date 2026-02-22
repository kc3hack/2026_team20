"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PlotList } from "@/components/plot/PlotList/PlotList";
import { SearchBar } from "@/components/search/SearchBar/SearchBar";
import { EmptyState } from "@/components/shared/EmptyState/EmptyState";
import { Pagination } from "@/components/shared/Pagination/Pagination";
import { useSearchPlots } from "@/hooks/useSearch";
import { PAGE_SIZE } from "@/lib/constants";
import styles from "./page.module.scss";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [offset, setOffset] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: queryは検索パラメータであり、値が変わったときにページを先頭に戻す必要がある
  useEffect(() => {
    setOffset(0);
  }, [query]);

  const { data, isLoading } = useSearchPlots(query, offset);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  if (!query) {
    return (
      <main className={styles.main}>
        <div className={styles.searchBar}>
          <SearchBar />
        </div>
        <EmptyState title="検索キーワードを入力してください" />
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.searchBar}>
        <SearchBar />
      </div>

      <h1 className={styles.heading}>
        &ldquo;{query}&rdquo; の検索結果: {isLoading ? "..." : `${total} 件`}
      </h1>

      {!isLoading && total === 0 ? (
        <EmptyState title="見つかりませんでした" />
      ) : (
        <PlotList items={items} isLoading={isLoading} />
      )}

      {total > PAGE_SIZE && (
        <div className={styles.pagination}>
          <Pagination total={total} limit={PAGE_SIZE} offset={offset} onPageChange={setOffset} />
        </div>
      )}
    </main>
  );
}
