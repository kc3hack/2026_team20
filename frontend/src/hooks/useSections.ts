"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { historyRepository, sectionRepository } from "@/lib/api/repositories";
import type {
  CreateSectionRequest,
  PlotDetailResponse,
  ReorderSectionRequest,
  SectionListResponse,
  UpdateSectionRequest,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/AuthProvider";

export function useSectionList(plotId: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.sections.byPlot(plotId),
    queryFn: () => sectionRepository.listByPlot(plotId, session?.access_token),
    enabled: !!plotId,
  });
}

export function useCreateSection() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ plotId, body }: { plotId: string; body: CreateSectionRequest }) =>
      sectionRepository.create(plotId, body, session?.access_token),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sections.byPlot(variables.plotId),
      });
      // Plot詳細キャッシュも無効化（PlotDetailPageがplots.detailでデータ取得しているため）
      queryClient.invalidateQueries({
        queryKey: queryKeys.plots.detail(variables.plotId),
      });
    },
  });
}

export function useUpdateSection() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      plotId: _plotId,
      sectionId,
      body,
    }: { plotId: string; sectionId: string; body: UpdateSectionRequest }) => {
      const result = await sectionRepository.update(sectionId, body, session?.access_token);

      try {
        await historyRepository.saveOperation(
          sectionId,
          { operationType: "update" },
          session?.access_token,
        );
      } catch {
      }

      return result;
    },
    onMutate: async ({ plotId, sectionId, body }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sections.byPlot(plotId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.plots.detail(plotId) });

      const previousSections = queryClient.getQueryData<SectionListResponse>(
        queryKeys.sections.byPlot(plotId),
      );
      const previousPlotDetail = queryClient.getQueryData<PlotDetailResponse>(
        queryKeys.plots.detail(plotId),
      );

      queryClient.setQueryData<SectionListResponse>(
        queryKeys.sections.byPlot(plotId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((s) =>
              s.id === sectionId ? { ...s, ...body, updatedAt: new Date().toISOString() } : s,
            ),
          };
        },
      );

      queryClient.setQueryData<PlotDetailResponse>(
        queryKeys.plots.detail(plotId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            sections: old.sections.map((s) =>
              s.id === sectionId ? { ...s, ...body, updatedAt: new Date().toISOString() } : s,
            ),
          };
        },
      );

      return { previousSections, previousPlotDetail };
    },
    onError: (_err, variables, context) => {
      if (context?.previousSections) {
        queryClient.setQueryData(
          queryKeys.sections.byPlot(variables.plotId),
          context.previousSections,
        );
      }
      if (context?.previousPlotDetail) {
        queryClient.setQueryData(
          queryKeys.plots.detail(variables.plotId),
          context.previousPlotDetail,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sections.byPlot(variables.plotId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.plots.detail(variables.plotId),
      });
    },
  });
}

export function useDeleteSection() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sectionId }: { sectionId: string; plotId: string }) => {
      await sectionRepository.remove(sectionId, session?.access_token);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sections.byPlot(variables.plotId),
      });
      // Plot詳細キャッシュも無効化（PlotDetailPageがplots.detailでデータ取得しているため）
      queryClient.invalidateQueries({
        queryKey: queryKeys.plots.detail(variables.plotId),
      });
    },
  });
}

export function useReorderSection() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sectionId,
      body,
    }: { sectionId: string; plotId: string; body: ReorderSectionRequest }) =>
      sectionRepository.reorder(sectionId, body, session?.access_token),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sections.byPlot(variables.plotId),
      });
      // Plot詳細キャッシュも無効化（PlotDetailPageがplots.detailでデータ取得しているため）
      queryClient.invalidateQueries({
        queryKey: queryKeys.plots.detail(variables.plotId),
      });
    },
  });
}
