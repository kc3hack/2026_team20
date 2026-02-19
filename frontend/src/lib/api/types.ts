import type { JSONContent } from "@tiptap/react";

export type Content = JSONContent;

export type PlotResponse = {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  ownerId: string;
  starCount: number;
  isStarred: boolean;
  isPaused: boolean;
  thumbnailUrl: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type PlotDetailResponse = PlotResponse & {
  content: Content;
  sections: SectionResponse[];
  owner: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
};

export type PlotListResponse = {
  plots: PlotResponse[];
  total: number;
};

export type SectionResponse = {
  id: string;
  plot_id: string;
  title: string;
  content: Content | null;
  orderIndex: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type SectionListResponse = {
  items: SectionResponse[];
  total: number;
};

export type OperationPayload = {
  position: number | null;
  content: string | null;
  length: number | null;
};

export type HistoryEntry = {
  id: string;
  sectionId: string;
  operationType: "insert" | "delete" | "update";
  payload: OperationPayload | null;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  created_at: string;
};

export type HistoryListResponse = {
  items: HistoryEntry[];
  total: number;
};

export type DiffResponse = {
  previous_sections: {
    id: string;
    title: string;
    content: string;
    order: number;
    parent_id: string | null;
  }[];
  current_sections: {
    id: string;
    title: string;
    content: string;
    order: number;
    parent_id: string | null;
  }[];
  changed_sections: {
    id: string;
    title_before: string;
    title_after: string;
    content_before: string;
    content_after: string;
    operation: "create" | "update" | "delete";
  }[];
};

export type ImageUploadResponse = {
  url: string;
  filename: string;
  width: number;
  height: number;
};

export type StarListResponse = {
  stars: {
    user: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
    };
    created_at: string;
  }[];
  total: number;
};

export type ThreadResponse = {
  id: string;
  plotId: string;
  sectionId: string | null;
  commentCount: number;
  createdAt: string;
};

export type CommentResponse = {
  id: string;
  thread_id: string;
  content: string;
  parentCommentId: string | null;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
};

export type CommentListResponse = {
  items: CommentResponse[];
  total: number;
};

export type SearchResponse = {
  plots: PlotResponse[];
  total: number;
  query: string;
};

export type UserResponse = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
};

export type UserProfileResponse = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  plotCount: number;
  contributionCount: number;
  createdAt: string;
};

// Request Types

export type CreatePlotRequest = {
  title: string;
  description?: string;
  tags?: string[];
  thumbnailUrl?: string;
};

export type UpdatePlotRequest = {
  title?: string;
  tags?: string[];
  thumbnailUrl?: string | null;
};

export type CreateSectionRequest = {
  title: string;
  content?: Content;
};

export type UpdateSectionRequest = {
  title?: string;
  content?: string;
  parent_id?: string | null;
};

export type ReorderSectionRequest = {
  section_ids: string[];
};

export type SaveOperationRequest = {
  operationType: "insert" | "delete" | "update";
  position?: number;
  content?: string;
  length?: number;
};

export type ForkPlotRequest = {
  title?: string;
};

export type CreateThreadRequest = {
  title: string;
};

export type CreateCommentRequest = {
  content: string;
  parent_comment_id?: string;
};

export type BanUserRequest = {
  plotId: string;
  userId: string;
  reason?: string;
};

export type UnbanUserRequest = {
  user_id: string;
};

export type PausePlotRequest = {
  reason?: string;
};

// ---- Snapshot ----
export type SnapshotResponse = {
  id: string;
  plotId: string;
  version: number;
  createdAt: string;
};

export type SnapshotListResponse = {
  items: SnapshotResponse[];
  total: number;
};

export type SnapshotDetailResponse = {
  id: string;
  plotId: string;
  version: number;
  content: {
    plot: { title: string; description: string | null; tags: string[] };
    sections: {
      id: string;
      title: string;
      content: Content | null;
      orderIndex: number;
      version: number;
    }[];
  } | null;
  createdAt: string;
};

// ---- Rollback ----
export type RollbackRequest = {
  expectedVersion?: number;
  reason?: string;
};

export type RollbackLogResponse = {
  id: string;
  plotId: string;
  snapshotId: string | null;
  snapshotVersion: number;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  reason: string | null;
  createdAt: string;
};

export type RollbackLogListResponse = {
  items: RollbackLogResponse[];
  total: number;
};

// Query Parameters
export type ListPlotsParams = {
  limit?: number;
  offset?: number;
  sort?: "created_at" | "updated_at" | "star_count";
  order?: "asc" | "desc";
  author?: string;
  tag?: string;
  q?: string;
  search?: string;
  starred?: boolean;
};

// Input Types (for Mock)
export type CreatePlotInput = {
  title: string;
  tags: string[];
  is_public: boolean;
};

export type UpdatePlotInput = {
  title?: string;
  tags?: string[];
  is_public?: boolean;
};

// Error Response
export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    detail?: string;
  };
};
