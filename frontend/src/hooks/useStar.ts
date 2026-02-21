"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { snsRepository } from "@/lib/api/repositories";
import { queryKeys } from "@/lib/query-keys";

export function useStar(plotId: string, initialCount: number, initialIsStarred: boolean) {
  const { isAuthenticated, session } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [count, setCount] = useState(initialCount);
  const [isStarred, setIsStarred] = useState(initialIsStarred);

  const mutation = useMutation({
    mutationFn: (starred: boolean) => {
      const token = session?.access_token;
      return starred
        ? snsRepository.removeStar(plotId, token)
        : snsRepository.addStar(plotId, token);
    },
    onMutate: (starred: boolean) => {
      const previousCount = count;
      const previousIsStarred = starred;

      setCount((prev) => (starred ? prev - 1 : prev + 1));
      setIsStarred(!starred);

      return { previousCount, previousIsStarred };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        setCount(context.previousCount);
        setIsStarred(context.previousIsStarred);
      }
      toast.error("スターの更新に失敗しました");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stars.byPlot(plotId) });
    },
  });

  const toggleStar = () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirectTo=/plots/${plotId}`);
      return;
    }
    mutation.mutate(isStarred);
  };

  return {
    count,
    isStarred,
    isPending: mutation.isPending,
    toggleStar,
  };
}
