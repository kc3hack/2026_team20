"use client";

import { useQuery } from "@tanstack/react-query";
import * as plotRepository from "@/lib/api/repositories/plotRepository";
import type { PlotDetailResponse } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export function usePlotDetail(id: string) {
  return useQuery<PlotDetailResponse, Error>({
    queryKey: queryKeys.plots.detail(id),
    queryFn: () => plotRepository.get(id),
    enabled: !!id,
  });
}
