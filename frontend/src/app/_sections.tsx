"use client";

import { PlotList } from "@/components/plot/PlotList/PlotList";
import { useLatestPlots, usePopularPlots, useTrendingPlots } from "@/hooks/usePlots";

export function TrendingSection() {
  const { data, isLoading } = useTrendingPlots(5);
  return <PlotList items={data?.items ?? []} isLoading={isLoading} />;
}

export function PopularSection() {
  const { data, isLoading } = usePopularPlots(5);
  return <PlotList items={data?.items ?? []} isLoading={isLoading} />;
}

export function LatestSection() {
  const { data, isLoading } = useLatestPlots(5);
  return <PlotList items={data?.items ?? []} isLoading={isLoading} />;
}
