export type Content = {
  type: string;
  // biome-ignore lint/suspicious/noExplicitAny: Tiptap content can be complex
  content?: any[];
};

export type PlotResponse = {
  id: string;
  title: string;
  tags: string[];
  is_public: boolean;
  author: {
    id: string;
    username: string;
    display_name: string;
  };
  forked_from?: string;
  created_at: string;
  updated_at: string;
  star_count: number;
  section_count: number;
};

export type PlotDetailResponse = PlotResponse & {
  content: Content;
  sections: SectionResponse[];
};

export type PlotListResponse = {
  plots: PlotResponse[];
  total: number;
};

export type SectionResponse = {
  id: string;
  plot_id: string;
  title: string;
  content: string;
  order: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SectionListResponse = {
  items: SectionResponse[];
  total: number;
};

export type HistoryEntry = {
  id: string;
  plot_id: string;
  operation: "create" | "update" | "delete";
  section_id: string;
  section_title: string;
  description: string;
  editor: {
    id: string;
    username: string;
    display_name: string;
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
      display_name: string;
      avatar_url: string;
    };
    created_at: string;
  }[];
  total: number;
};

export type ThreadResponse = {
  id: string;
  plot_id: string;
  title: string;
  user_id: string;
  comment_count: number;
  created_at: string;
  updated_at: string;
};

export type ThreadListResponse = {
  threads: ThreadResponse[];
  total: number;
};

export type CommentResponse = {
  id: string;
  thread_id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
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
  display_name: string;
  avatar_url: string;
  created_at: string;
};

export type UserProfileResponse = {
  id: string;
  display_name: string;
  avatar_url: string;
  plot_count: number;
  contribution_count: number;
  created_at: string;
};

// Request Types

export type CreatePlotRequest = {
  title: string;
  tags: string[];
  is_public: boolean;
};

export type UpdatePlotRequest = {
  title?: string;
  tags?: string[];
  is_public?: boolean;
};

export type CreateSectionRequest = {
  title: string;
  content: string;
  parent_id?: string | null;
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
  plot_title?: string;
  sections: {
    section_id: string;
    title?: string;
    content?: string;
    order?: number;
    parent_id?: string | null;
    operation: "create" | "update" | "delete";
  }[];
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
  user_id: string;
  reason: string;
};

export type UnbanUserRequest = {
  user_id: string;
};

export type PausePlotRequest = {
  reason: string;
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
