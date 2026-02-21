"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PlotList } from "@/components/plot/PlotList/PlotList";
import { EmptyState } from "@/components/shared/EmptyState/EmptyState";
import { Pagination } from "@/components/shared/Pagination/Pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLatestPlots, usePlotList, usePopularPlots, useTrendingPlots } from "@/hooks/usePlots";
import { PAGE_SIZE } from "@/lib/constants";
import styles from "./page.module.scss";

type SortType = "trending" | "popular" | "new";

const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: "trending", label: "急上昇" },
  { value: "popular", label: "人気" },
  { value: "new", label: "新着" },
];

function isValidSort(value: string | null): value is SortType {
  return value === "trending" || value === "popular" || value === "new";
}

function SortedPlotContent({ sort, limit }: { sort: SortType; limit: number }) {
  const trendingQuery = useTrendingPlots(limit);
  const popularQuery = usePopularPlots(limit);
  const latestQuery = useLatestPlots(limit);

  const queryMap: Record<SortType, typeof trendingQuery> = {
    trending: trendingQuery,
    popular: popularQuery,
    new: latestQuery,
  };

  const { data, isLoading } = queryMap[sort];
  const items = data?.items ?? [];

  if (!isLoading && items.length === 0) {
    return <EmptyState title="Plotが見つかりませんでした" />;
  }

  return <PlotList items={items} isLoading={isLoading} />;
}

function TagFilteredContent({ tag }: { tag: string }) {
  const [offset, setOffset] = useState(0);
  const { data, isLoading } = usePlotList({ tag, limit: PAGE_SIZE, offset });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      {!isLoading && items.length === 0 ? (
        <EmptyState
          title="Plotが見つかりませんでした"
          description={`タグ「${tag}」に一致するPlotはありません`}
        />
      ) : (
        <PlotList items={items} isLoading={isLoading} />
      )}

      {total > PAGE_SIZE && (
        <div className={styles.pagination}>
          <Pagination total={total} limit={PAGE_SIZE} offset={offset} onPageChange={setOffset} />
        </div>
      )}
    </>
  );
}

export default function PlotsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tag = searchParams.get("tag");
  const sortParam = searchParams.get("sort");
  const currentSort: SortType = isValidSort(sortParam) ? sortParam : "trending";

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.push(`/plots?${params.toString()}`);
  };

  if (tag) {
    return (
      <main className={styles.main}>
        <h1 className={styles.heading}>タグ: {tag}</h1>
        <TagFilteredContent tag={tag} />
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.heading}>Plot 一覧</h1>

      <Tabs value={currentSort} onValueChange={handleSortChange}>
        <TabsList className={styles.tabsList}>
          {SORT_OPTIONS.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className={styles.content}>
        <SortedPlotContent sort={currentSort} limit={PAGE_SIZE} />
      </div>
    </main>
  );
}
