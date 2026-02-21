"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { snsRepository } from "@/lib/api/repositories";
import type { ThreadResponse } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export function useComments(threadId: string) {
  const { session } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.comments.byThread(threadId),
    queryFn: () => snsRepository.getComments(threadId, undefined, session?.access_token),
    enabled: !!threadId,
  });

  return {
    comments: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
  };
}

export function useAddComment(threadId: string) {
  const { isAuthenticated, session } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: { content: string; parentCommentId?: string }) =>
      snsRepository.addComment(
        threadId,
        { content: params.content, parentCommentId: params.parentCommentId },
        session?.access_token,
      ),
    onSuccess: () => {
      toast.success("コメントを投稿しました");
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byThread(threadId) });
    },
  });

  const addComment = (content: string, parentCommentId?: string) => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    mutation.mutate({ content, parentCommentId });
  };

  return {
    addComment,
    isPending: mutation.isPending,
  };
}

export function useCreateThread() {
  const { session } = useAuth();

  const mutation = useMutation({
    mutationFn: (plotId: string) => snsRepository.createThread({ plotId }, session?.access_token),
  });

  const createThread = async (plotId: string): Promise<ThreadResponse> => {
    return mutation.mutateAsync(plotId);
  };

  return {
    createThread,
    isPending: mutation.isPending,
  };
}
