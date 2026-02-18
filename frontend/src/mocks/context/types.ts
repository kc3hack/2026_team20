/**
 * Mock Data Context Types
 * 
 * 単一巨大 Provider の型定義
 * 全ドメインの state と actions を統合
 */

import type { PlotResponse, PlotDetailResponse } from "@/lib/api/types";

// ============================================================================
// Domain State Types
// ============================================================================

export interface MockPlotsState {
  list: PlotResponse[];
  details: Map<string, PlotDetailResponse>;
}

export interface MockSectionsState {
  byPlotId: Map<string, SectionData[]>;
}

export interface SectionData {
  id: string;
  plot_id: string;
  title: string;
  content: string;
  order: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockSnsState {
  stars: Map<string, StarData[]>; // plotId -> stars
  threads: Map<string, ThreadData[]>; // plotId -> threads
  comments: Map<string, CommentData[]>; // threadId -> comments
}

export interface StarData {
  id: string;
  plot_id: string;
  user_id: string;
  created_at: string;
}

export interface ThreadData {
  id: string;
  plot_id: string;
  title: string;
  user_id: string;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommentData {
  id: string;
  thread_id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface MockHistoryState {
  byPlotId: Map<string, HistoryEntryData[]>;
}

export interface HistoryEntryData {
  id: string;
  plot_id: string;
  operation: "create" | "update" | "delete";
  section_id: string;
  section_title: string;
  description: string;
  user_id: string;
  created_at: string;
}

export interface MockImageState {
  uploadedImages: Map<string, string>; // key -> blobUrl
}

// ============================================================================
// Combined State
// ============================================================================

export interface MockDataState {
  plots: MockPlotsState;
  sections: MockSectionsState;
  sns: MockSnsState;
  history: MockHistoryState;
  images: MockImageState;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreatePlotInput {
  title: string;
  tags: string[];
  is_public: boolean;
}

export interface UpdatePlotInput {
  title?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface ListPlotsParams {
  limit?: number;
  offset?: number;
  sort?: "created_at" | "updated_at" | "title" | "star_count";
  order?: "asc" | "desc";
  author?: string;
  tag?: string;
}

export interface CreateSectionInput {
  title: string;
  content: string;
  parent_id?: string | null;
}

export interface UpdateSectionInput {
  title?: string;
  content?: string;
  parent_id?: string | null;
}

export interface CreateThreadInput {
  title: string;
}

export interface CreateCommentInput {
  content: string;
}

export interface SaveOperationInput {
  plot_title?: string;
  sections: Array<{
    section_id: string;
    title?: string;
    content?: string;
    order?: number;
    parent_id?: string | null;
    operation: "create" | "update" | "delete";
  }>;
}

export interface SearchFilters {
  author?: string;
  tag?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface MockDataActions {
  // Plot actions
  createPlot: (data: CreatePlotInput) => PlotResponse;
  updatePlot: (id: string, data: UpdatePlotInput) => PlotResponse;
  deletePlot: (id: string) => void;
  getPlot: (id: string) => PlotDetailResponse | undefined;
  listPlots: (params: ListPlotsParams) => PlotResponse[];
  
  // Section actions
  createSection: (plotId: string, data: CreateSectionInput) => SectionData;
  updateSection: (id: string, data: UpdateSectionInput) => SectionData;
  deleteSection: (id: string) => void;
  listSections: (plotId: string) => SectionData[];
  reorderSections: (plotId: string, sectionIds: string[]) => SectionData[];
  
  // SNS actions
  starPlot: (plotId: string, userId: string) => StarData;
  unstarPlot: (plotId: string, userId: string) => void;
  forkPlot: (plotId: string, userId: string) => PlotResponse;
  createThread: (plotId: string, userId: string, data: CreateThreadInput) => ThreadData;
  createComment: (threadId: string, userId: string, data: CreateCommentInput) => CommentData;
  listStars: (plotId: string) => StarData[];
  listThreads: (plotId: string) => ThreadData[];
  listComments: (threadId: string) => CommentData[];
  
  // Search actions
  search: (query: string, filters?: SearchFilters) => PlotResponse[];
  
  // History actions
  saveOperation: (plotId: string, userId: string, data: SaveOperationInput) => HistoryEntryData;
  listHistory: (plotId: string) => HistoryEntryData[];
  getHistoryDiff: (plotId: string, entryId: string) => DiffData;
  rollback: (plotId: string, entryId: string) => PlotDetailResponse;
  
  // Image actions
  uploadImage: (file: File) => Promise<{ url: string; key: string }>;
  deleteImage: (key: string) => void;
}

export interface DiffData {
  previous_sections: SectionSnapshot[];
  current_sections: SectionSnapshot[];
  changed_sections: ChangedSection[];
}

export interface SectionSnapshot {
  id: string;
  title: string;
  content: string;
  order: number;
  parent_id: string | null;
}

export interface ChangedSection {
  id: string;
  title_before: string;
  title_after: string;
  content_before: string;
  content_after: string;
  operation: "create" | "update" | "delete";
}

// ============================================================================
// Context Value
// ============================================================================

export interface MockDataContextValue extends MockDataActions {
  state: MockDataState;
  isReady: boolean;
}
