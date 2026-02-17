export type Content = {
  type: string;
  // biome-ignore lint/suspicious/noExplicitAny: Tiptap content can be complex
  content?: any[];
};

export type PlotResponse = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  ownerId: string;
  starCount: number;
  isStarred: boolean;
  isPaused: boolean;
  editingUsers: {
    id: string;
    displayName: string;
    avatarUrl: string;
    sectionId: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type PlotDetailResponse = PlotResponse & {
  sections: SectionResponse[];
  owner: {
    id: string;
    displayName: string;
    avatarUrl: string;
  };
};

export type PlotListResponse = {
  items: PlotResponse[];
  total: number;
  limit: number;
  offset: number;
};

export type SectionResponse = {
  id: string;
  plotId: string;
  title: string;
  content: Content;
  orderIndex: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type SectionListResponse = {
  items: SectionResponse[];
  total: number;
};

export type HistoryEntry = {
  id: string;
  sectionId: string;
  operationType: "insert" | "delete" | "update";
  // biome-ignore lint/suspicious/noExplicitAny: Operation payload can be dynamic
  payload: any;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string;
  };
  version: number;
  createdAt: string;
};

export type HistoryListResponse = {
  items: HistoryEntry[];
  total: number;
};

export type DiffResponse = {
  fromVersion: number;
  toVersion: number;
  additions: {
    start: number;
    end: number;
    text: string;
  }[];
  deletions: {
    start: number;
    end: number;
    text: string;
  }[];
};

export type ImageUploadResponse = {
  url: string;
  filename: string;
  width: number;
  height: number;
};

export type StarListResponse = {
  items: {
    user: {
      id: string;
      displayName: string;
      avatarUrl: string;
    };
    createdAt: string;
  }[];
  total: number;
};

export type ThreadResponse = {
  id: string;
  plotId: string;
  sectionId?: string;
  commentCount: number;
  createdAt: string;
};

export type CommentResponse = {
  id: string;
  threadId: string;
  content: string;
  parentCommentId?: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string;
  };
  createdAt: string;
};

export type CommentListResponse = {
  items: CommentResponse[];
  total: number;
};

export type SearchResponse = {
  items: PlotResponse[];
  total: number;
  query: string;
};

export type UserResponse = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  createdAt: string;
};

export type UserProfileResponse = {
  id: string;
  displayName: string;
  avatarUrl: string;
  plotCount: number;
  contributionCount: number;
  createdAt: string;
};

// Request Types

export type CreatePlotRequest = {
  title: string;
  description: string;
  tags: string[];
};

export type UpdatePlotRequest = {
  title?: string;
  description?: string;
  tags?: string[];
};

export type CreateSectionRequest = {
  title: string;
  content: Content;
};

export type UpdateSectionRequest = {
  title?: string;
  content?: Content;
};

export type ReorderSectionRequest = {
  newOrder: number;
};

export type SaveOperationRequest = {
  operationType: "insert" | "delete" | "update";
  position: number;
  content: string;
  length: number;
};

export type ForkPlotRequest = {
  title?: string;
};

export type CreateThreadRequest = {
  plotId: string;
  sectionId?: string;
};

export type CreateCommentRequest = {
  content: string;
  parentCommentId?: string;
};

export type BanUserRequest = {
  plotId: string;
  userId: string;
  reason: string;
};

export type UnbanUserRequest = {
  plotId: string;
  userId: string;
};

export type PausePlotRequest = {
  reason: string;
};

// Error Response
export type ApiErrorResponse = {
  detail: string;
};
