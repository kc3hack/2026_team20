"use client";

/**
 * Mock Data Provider
 * 
 * 単一巨大 Provider で全ドメインの Mock データを管理
 * React Context + State で書き込み操作を永続化
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type {
  PlotResponse,
  PlotDetailResponse,
  Content,
} from "@/lib/api/types";
import type {
  MockDataContextValue,
  MockDataState,
  CreatePlotInput,
  UpdatePlotInput,
  ListPlotsParams,
  CreateSectionInput,
  UpdateSectionInput,
  CreateThreadInput,
  CreateCommentInput,
  SaveOperationInput,
  SearchFilters,
  SectionData,
  StarData,
  ThreadData,
  CommentData,
  HistoryEntryData,
  DiffData,
  SectionSnapshot,
  ChangedSection,
} from "./types";
import { mockPlotList } from "../data/plots";
import { getMockSectionsByPlotId } from "../data/sections";
import { getMockStarsByPlotId, getMockThreadsByPlotId, getMockCommentsByThreadId } from "../data/sns";
import { getMockHistoryByPlotId, generateMockDiff } from "../data/history";

// ============================================================================
// Initial State
// ============================================================================

const now = new Date();

const generateDate = (daysAgo: number): string => {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

const createInitialState = (): MockDataState => {
  const plots = new Map<string, PlotDetailResponse>();
  const sections = new Map<string, SectionData[]>();
  const stars = new Map<string, StarData[]>();
  const threads = new Map<string, ThreadData[]>();
  const comments = new Map<string, CommentData[]>();
  const history = new Map<string, HistoryEntryData[]>();

  // Initialize with mock data
  for (const plot of mockPlotList) {
    const plotId = plot.id;

    // Plot details
    const detail: PlotDetailResponse = {
      ...plot,
      content: { type: "doc", content: [] },
      sections: [],
      owner: {
        id: plot.ownerId,
        displayName: "Mock User",
        avatarUrl: null,
      },
    };
    plots.set(plotId, detail);

    // Sections - map from SectionResponse to SectionData
    const plotSections: SectionData[] = getMockSectionsByPlotId(plotId).map((s: import("@/lib/api/types").SectionResponse) => ({
      id: s.id,
      plot_id: s.plot_id,
      title: s.title,
      content: s.content ? JSON.stringify(s.content) : "",
      order: s.orderIndex,
      parent_id: null,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    }));
    sections.set(plotId, plotSections);

    // Stars
    const plotStars: StarData[] = getMockStarsByPlotId(plotId).map((s: import("../data/sns").StarData) => ({
      id: s.id,
      plot_id: s.plot_id,
      user_id: s.user_id,
      created_at: s.created_at,
    }));
    stars.set(plotId, plotStars);

    // Threads and Comments
    const plotThreads: ThreadData[] = [];
    const mockThreadData = getMockThreadsByPlotId(plotId);
    
    for (const thread of mockThreadData) {
      const threadData: ThreadData = {
        id: thread.id,
        plot_id: thread.plotId,
        title: "",
        user_id: "",
        comment_count: thread.commentCount,
        created_at: thread.createdAt,
        updated_at: thread.createdAt,
      };
      plotThreads.push(threadData);

      // Comments for this thread
      const threadComments: CommentData[] = getMockCommentsByThreadId(thread.id).map((c: import("@/lib/api/types").CommentResponse) => ({
        id: c.id,
        thread_id: c.thread_id,
        content: c.content,
        user_id: c.user.id,
        created_at: c.createdAt,
        updated_at: c.createdAt,
      }));
      comments.set(thread.id, threadComments);
    }
    threads.set(plotId, plotThreads);

    // History
    const plotHistory: HistoryEntryData[] = getMockHistoryByPlotId(plotId).map((h: import("@/lib/api/types").HistoryEntry) => ({
      id: h.id,
      plot_id: "",
      operation: h.operationType as "create" | "update" | "delete",
      section_id: h.sectionId,
      section_title: "",
      description: "",
      user_id: h.user.id,
      created_at: h.created_at,
    }));
    history.set(plotId, plotHistory);
  }

  return {
    plots: {
      list: [...mockPlotList],
      details: plots,
    },
    sections: {
      byPlotId: sections,
    },
    sns: {
      stars,
      threads,
      comments,
    },
    history: {
      byPlotId: history,
    },
    images: {
      uploadedImages: new Map(),
    },
  };
};

// ============================================================================
// Context
// ============================================================================

export const MockDataContext = createContext<MockDataContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export function MockDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MockDataState>(createInitialState());
  const [isReady] = useState(true);

  // ============================================================================
  // Plot Actions
  // ============================================================================

  const createPlot = useCallback((data: CreatePlotInput): PlotResponse => {
    const id = `plot-${state.plots.list.length + 1}`;
    const now = new Date().toISOString();
    
    const newPlot: PlotResponse = {
      id,
      title: data.title,
      description: null,
      tags: data.tags,
      ownerId: "current-user",
      starCount: 0,
      isStarred: false,
      isPaused: false,
      thumbnailUrl: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    setState((prev) => ({
      ...prev,
      plots: {
        list: [newPlot, ...prev.plots.list],
        details: new Map(prev.plots.details).set(id, {
          ...newPlot,
          content: { type: "doc", content: [] },
          sections: [],
          owner: {
            id: "current-user",
            displayName: "Current User",
            avatarUrl: null,
          },
        }),
      },
    }));

    return newPlot;
  }, [state.plots.list.length]);

  const updatePlot = useCallback((id: string, data: UpdatePlotInput): PlotResponse => {
    const plot = state.plots.list.find((p) => p.id === id);
    if (!plot) throw new Error(`Plot ${id} not found`);

    const updatedPlot: PlotResponse = {
      ...plot,
      ...(data.title && { title: data.title }),
      ...(data.tags && { tags: data.tags }),
      updatedAt: new Date().toISOString(),
    };

    setState((prev) => {
      const newList = prev.plots.list.map((p) => (p.id === id ? updatedPlot : p));
      const newDetails = new Map(prev.plots.details);
      const existing = newDetails.get(id);
      if (existing) {
        newDetails.set(id, { ...existing, ...updatedPlot });
      }

      return {
        ...prev,
        plots: {
          list: newList,
          details: newDetails,
        },
      };
    });

    return updatedPlot;
  }, [state.plots.list]);

  const deletePlot = useCallback((id: string): void => {
    setState((prev) => {
      const newList = prev.plots.list.filter((p) => p.id !== id);
      const newDetails = new Map(prev.plots.details);
      newDetails.delete(id);

      return {
        ...prev,
        plots: {
          list: newList,
          details: newDetails,
        },
      };
    });
  }, []);

  const getPlot = useCallback((id: string): PlotDetailResponse | undefined => {
    const detail = state.plots.details.get(id);
    if (!detail) return undefined;

    // Get sections for this plot
    const sections = state.sections.byPlotId.get(id) || [];
    
    return {
      ...detail,
      sections: sections.map((s: SectionData) => ({
        id: s.id,
        plot_id: s.plot_id,
        title: s.title,
        content: s.content ? JSON.parse(s.content) : null,
        orderIndex: s.order,
        version: 1,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
    };
  }, [state.plots.details, state.sections.byPlotId]);

  const listPlots = useCallback((params: ListPlotsParams): PlotResponse[] => {
    let result = [...state.plots.list];

    // Filter by author
    if (params.author) {
      result = result.filter((p) => p.ownerId === params.author);
    }

    // Filter by tag
    if (params.tag) {
      const tag = params.tag;
      result = result.filter((p) => p.tags.includes(tag));
    }

    // Sort
    const sortKey = params.sort || "updatedAt";
    const order = params.order || "desc";

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "created_at":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "updated_at":
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "star_count":
          comparison = a.starCount - b.starCount;
          break;
      }
      return order === "asc" ? comparison : -comparison;
    });

    // Pagination
    const offset = params.offset || 0;
    const limit = params.limit || 20;

    return result.slice(offset, offset + limit);
  }, [state.plots.list]);

  // ============================================================================
  // Section Actions
  // ============================================================================

  const createSection = useCallback((plotId: string, data: CreateSectionInput): SectionData => {
    const now = new Date().toISOString();
    const sections = state.sections.byPlotId.get(plotId) || [];
    
    const newSection: SectionData = {
      id: `section-${plotId}-${sections.length + 1}`,
      plot_id: plotId,
      title: data.title,
      content: data.content,
      order: sections.length,
      parent_id: data.parent_id ?? null,
      created_at: now,
      updated_at: now,
    };

    setState((prev) => {
      const newSections = new Map(prev.sections.byPlotId);
      newSections.set(plotId, [...sections, newSection]);

      // Update plot's section count
      const newList = prev.plots.list.map((p) =>
        p.id === plotId
          ? { ...p, updatedAt: now }
          : p
      );

      return {
        ...prev,
        plots: {
          ...prev.plots,
          list: newList,
        },
        sections: {
          byPlotId: newSections,
        },
      };
    });

    return newSection;
  }, [state.sections.byPlotId, state.plots.list]);

  const updateSection = useCallback((id: string, data: UpdateSectionInput): SectionData => {
    let updatedSection: SectionData | undefined;

    setState((prev) => {
      const newSections = new Map(prev.sections.byPlotId);
      
      for (const [plotId, sections] of newSections.entries()) {
        const sectionIndex = sections.findIndex((s) => s.id === id);
        if (sectionIndex >= 0) {
          const section = sections[sectionIndex];
          updatedSection = {
            ...section,
            ...(data.title && { title: data.title }),
            ...(data.content && { content: data.content }),
            ...(data.parent_id !== undefined && { parent_id: data.parent_id }),
            updated_at: new Date().toISOString(),
          };
          const newPlotSections = [...sections];
          newPlotSections[sectionIndex] = updatedSection;
          newSections.set(plotId, newPlotSections);
          break;
        }
      }

      return {
        ...prev,
        sections: {
          byPlotId: newSections,
        },
      };
    });

    if (!updatedSection) throw new Error(`Section ${id} not found`);
    return updatedSection;
  }, []);

  const deleteSection = useCallback((id: string): void => {
    setState((prev) => {
      const newSections = new Map(prev.sections.byPlotId);
      
      for (const [plotId, sections] of newSections.entries()) {
        const filtered = sections.filter((s) => s.id !== id);
        if (filtered.length !== sections.length) {
          newSections.set(plotId, filtered);
          break;
        }
      }

      return {
        ...prev,
        sections: {
          byPlotId: newSections,
        },
      };
    });
  }, []);

  const listSections = useCallback((plotId: string): SectionData[] => {
    return state.sections.byPlotId.get(plotId) || [];
  }, [state.sections.byPlotId]);

  const reorderSections = useCallback((plotId: string, sectionIds: string[]): SectionData[] => {
    const sections = state.sections.byPlotId.get(plotId) || [];
    
    const reordered = sectionIds
      .map((id) => sections.find((s) => s.id === id))
      .filter((s): s is SectionData => s !== undefined)
      .map((s, index) => ({ ...s, order: index }));

    setState((prev) => {
      const newSections = new Map(prev.sections.byPlotId);
      newSections.set(plotId, reordered);

      return {
        ...prev,
        sections: {
          byPlotId: newSections,
        },
      };
    });

    return reordered;
  }, [state.sections.byPlotId]);

  // Continue in next part...

  // ============================================================================
  // Context Value
  // ============================================================================

  const value = useMemo<MockDataContextValue>(
    () => ({
      state,
      isReady,
      createPlot,
      updatePlot,
      deletePlot,
      getPlot,
      listPlots,
      createSection,
      updateSection,
      deleteSection,
      listSections,
      reorderSections,
      // SNS actions will be added in next part
      starPlot: () => { throw new Error("Not implemented"); },
      unstarPlot: () => { throw new Error("Not implemented"); },
      forkPlot: () => { throw new Error("Not implemented"); },
      createThread: () => { throw new Error("Not implemented"); },
      createComment: () => { throw new Error("Not implemented"); },
      listStars: () => [],
      listThreads: () => [],
      listComments: () => [],
      search: () => [],
      saveOperation: () => { throw new Error("Not implemented"); },
      listHistory: () => [],
      getHistoryDiff: () => ({ previous_sections: [], current_sections: [], changed_sections: [] }),
      rollback: () => { throw new Error("Not implemented"); },
      uploadImage: async () => ({ url: "", key: "" }),
      deleteImage: () => {},
    }),
    [state, isReady, createPlot, updatePlot, deletePlot, getPlot, listPlots, createSection, updateSection, deleteSection, listSections, reorderSections]
  );

  return (
    <MockDataContext.Provider value={value}>
      {children}
    </MockDataContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useMockData(): MockDataContextValue {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error("useMockData must be used within MockDataProvider");
  }
  return context;
}
