/**
 * Mock Data Type Definitions
 * 
 * src/lib/api/types.ts で定義された API 型をベースに、
 * Mock データ生成と管理に必要な型を定義
 */

import type {
  PlotResponse,
  PlotDetailResponse,
  SectionResponse,
  ThreadResponse,
  CommentResponse,
  HistoryEntry,
  DiffResponse,
} from "@/lib/api/types";

// Local star data type (StarResponse doesn't exist in api/types)
export interface StarData {
  id: string;
  plot_id: string;
  user_id: string;
  created_at: string;
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

// ============================================================================
// Mock State Types
// ============================================================================

/**
 * Mock データの完全な状態を表す型
 */
export interface MockDataState {
  plots: PlotResponse[];
  plotDetails: Map<string, PlotDetailResponse>;
  sections: Map<string, SectionResponse[]>; // plotId -> sections
  stars: Map<string, StarData[]>; // plotId -> stars
  threads: Map<string, ThreadResponse[]>; // plotId -> threads
  comments: Map<string, CommentResponse[]>; // threadId -> comments
  history: Map<string, HistoryEntry[]>; // plotId -> history entries
  searchResults: PlotResponse[];
}

/**
 * Mock データのアクション型
 */
export interface MockDataActions {
  // Plot actions
  createPlot: (data: CreatePlotInput) => PlotResponse;
  updatePlot: (id: string, data: UpdatePlotInput) => PlotResponse;
  deletePlot: (id: string) => void;
  getPlot: (id: string) => PlotDetailResponse | undefined;
  listPlots: (params: ListPlotsParams) => PlotResponse[];
  
  // Section actions
  createSection: (plotId: string, data: CreateSectionInput) => SectionResponse;
  updateSection: (id: string, data: UpdateSectionInput) => SectionResponse;
  deleteSection: (id: string) => void;
  listSections: (plotId: string) => SectionResponse[];
  reorderSections: (plotId: string, sectionIds: string[]) => SectionResponse[];
  
  // SNS actions
  starPlot: (plotId: string, userId: string) => StarData;
  unstarPlot: (plotId: string, userId: string) => void;
  forkPlot: (plotId: string, userId: string) => PlotResponse;
  createThread: (plotId: string, data: CreateThreadInput) => ThreadResponse;
  createComment: (threadId: string, data: CreateCommentInput) => CommentResponse;
  listStars: (plotId: string) => StarData[];
  listThreads: (plotId: string) => ThreadResponse[];
  listComments: (threadId: string) => CommentResponse[];
  
  // Search actions
  search: (query: string, filters?: SearchFilters) => PlotResponse[];
  
  // History actions
  saveOperation: (plotId: string, data: SaveOperationInput) => HistoryEntry;
  listHistory: (plotId: string) => HistoryEntry[];
  getHistoryDiff: (plotId: string, entryId: string) => DiffResponse;
  rollback: (plotId: string, entryId: string) => PlotDetailResponse;
  
  // Image actions
  uploadImage: (file: File) => Promise<{ url: string; key: string }>;
}

/**
 * Mock Data Context の値型
 */
export interface MockDataContextValue extends MockDataActions {
  state: MockDataState;
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
  content: string; // JSON string
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

export interface SearchFilters {
  author?: string;
  tag?: string;
  dateFrom?: Date;
  dateTo?: Date;
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

// ============================================================================
// Permission Types
// ============================================================================

/**
 * 権限チェック関数の型
 * 今は常に true を返すが、将来的に実装を変更可能
 */
export type PermissionChecker = (resource: {
  type: "plot" | "section" | "comment" | "thread";
  id: string;
  ownerId?: string;
}) => boolean;

// ============================================================================
// Error Simulation Types
// ============================================================================

/**
 * エラーシミュレーション設定
 */
export interface ErrorSimulationConfig {
  enabled: boolean;
  triggerWords: string[]; // これらの文字列が含まれるとエラー
  errorStatus: 400 | 401 | 403 | 404 | 429 | 500;
  errorMessage: string;
}

// Default config
export const defaultErrorConfig: ErrorSimulationConfig = {
  enabled: true,
  triggerWords: ["error", "fail", "crash"],
  errorStatus: 400,
  errorMessage: "Invalid request",
};
