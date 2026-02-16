"use client";

import { useCallback, useEffect, useState } from "react";
import { type PlotItem, api } from "@/lib/api";

type PlotCategory = "trending" | "popular" | "new";

interface UsePlotsResult {
  plots: PlotItem[];
  isLoading: boolean;
  error: string | null;
}

export function usePlots(category: PlotCategory, limit = 5): UsePlotsResult {
  const [plots, setPlots] = useState<PlotItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlots = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.plots[category](limit);
      setPlots(res.items);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "データの取得に失敗しました";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [category, limit]);

  useEffect(() => {
    fetchPlots();
  }, [fetchPlots]);

  return { plots, isLoading, error };
}
