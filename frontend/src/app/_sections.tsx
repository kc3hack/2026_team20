"use client";

import { PlotSection } from "@/components/home/PlotSection/PlotSection";
import { useLatestPlots, usePopularPlots, useTrendingPlots } from "@/hooks/usePlots";

export function TrendingSection() {
  const { data, isLoading } = useTrendingPlots(5);
  return (
    <PlotSection
      title="🔥 急上昇"
      plots={data?.items ?? []}
      isLoading={isLoading}
      moreHref="/plots?sort=trending"
    />
  );
}

export function LatestSection() {
  const { data, isLoading } = useLatestPlots(5);
  return (
    <PlotSection
      title="🆕 新着"
      plots={data?.items ?? []}
      isLoading={isLoading}
      moreHref="/plots?sort=new"
    />
  );
}

export function PopularSection() {
  const { data, isLoading } = usePopularPlots(5);
  return (
    <PlotSection
      title="⭐ 人気"
      plots={data?.items ?? []}
      isLoading={isLoading}
      moreHref="/plots?sort=popular"
    />
  );
}
