"use client";

import { PlotSection } from "@/components/home/PlotSection/PlotSection";
import styles from "@/components/home/PlotSection/PlotSection.module.scss";
import { useLatestPlots, usePopularPlots, useTrendingPlots } from "@/hooks/usePlots";
import { Clock3, Star, TrendingUp } from "lucide-react";

export function TrendingSection() {
  const { data, isLoading } = useTrendingPlots(5);
  return (
    <PlotSection
      title="急上昇"
      titleIcon={<TrendingUp aria-hidden="true" />}
      titleClassName={styles.titleTrending}
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
      title="新着"
      titleIcon={<Clock3 aria-hidden="true" />}
      titleClassName={styles.titleLatest}
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
      title="人気"
      titleIcon={<Star aria-hidden="true" />}
      titleClassName={styles.titlePopular}
      plots={data?.items ?? []}
      isLoading={isLoading}
      moreHref="/plots?sort=popular"
    />
  );
}
