"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PlotList } from "@/components/plot/PlotList/PlotList";
import { EmptyState } from "@/components/shared/EmptyState/EmptyState";
import { Pagination } from "@/components/shared/Pagination/Pagination";
import { PAGE_SIZE } from "@/lib/constants";
import { useSearchPlots } from "@/hooks/useSearch";
import styles from "./page.module.scss";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useSearchPlots(query, offset);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  if (!query) {
    return (
      <main className={styles.main}>
        <EmptyState title="検索キーワードを入力してください" />
      </main>
    );
  }

  return (
    <main className={styles.main}>
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
          <Pagination
            total={total}
            limit={PAGE_SIZE}
            offset={offset}
            onPageChange={setOffset}
          />
        </div>
      )}
    </main>
  );
}
