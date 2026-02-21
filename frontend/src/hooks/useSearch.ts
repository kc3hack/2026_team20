"use client";

import { useQuery } from "@tanstack/react-query";
import { searchRepository } from "@/lib/api/repositories";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/AuthProvider";
import { PAGE_SIZE } from "@/lib/constants";

export function useSearchPlots(q: string, offset = 0, limit = PAGE_SIZE) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.search.results({ q, limit, offset }),
    queryFn: () => searchRepository.search({ q, limit, offset }, session?.access_token),
    enabled: q.length > 0,
  });
}
