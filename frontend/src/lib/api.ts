const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export interface EditingUser {
  id: string;
  displayName: string;
  avatarUrl: string;
  sectionId: string;
}

export interface PlotItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  ownerId: string;
  starCount: number;
  isStarred: boolean;
  isPaused: boolean;
  editingUsers: EditingUser[];
  createdAt: string;
  updatedAt: string;
}

export interface PlotListResponse {
  items: PlotItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlotOwner {
  id: string;
  displayName: string;
  avatarUrl: string;
}

export interface SectionItem {
  id: string;
  plotId: string;
  title: string;
  content: Record<string, unknown>;
  orderIndex: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SectionListResponse {
  items: SectionItem[];
  total: number;
}

export interface PlotDetailResponse extends PlotItem {
  sections: SectionItem[];
  owner: PlotOwner;
}

export interface HistoryEntry {
  id: string;
  sectionId: string;
  operationType: string;
  payload: Record<string, unknown>;
  user: PlotOwner;
  version: number;
  createdAt: string;
}

export interface HistoryListResponse {
  items: HistoryEntry[];
  total: number;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? "Unknown error");
  }

  return res.json() as Promise<T>;
}

export interface ImageUploadResponse {
  url: string;
  filename: string;
  width: number;
  height: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string;
  plotCount: number;
  contributionCount: number;
  createdAt: string;
}

// SNS Types
export interface StarItem {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string;
  createdAt: string;
}

export interface StarListResponse {
  items: StarItem[];
  total: number;
}

export interface ThreadResponse {
  id: string;
  plotId: string;
  sectionId: string | null;
  commentCount: number;
  createdAt: string;
}

export interface CommentItem {
  id: string;
  threadId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  content: string;
  parentCommentId: string | null;
  createdAt: string;
}

export interface CommentListResponse {
  items: CommentItem[];
  total: number;
}

export interface SearchResponse {
  items: PlotItem[];
  total: number;
  query: string;
}

export const api = {
  plots: {
    trending(limit = 5) {
      return request<PlotListResponse>(
        `/plots/trending?limit=${limit}`,
      );
    },
    popular(limit = 5) {
      return request<PlotListResponse>(
        `/plots/popular?limit=${limit}`,
      );
    },
    new(limit = 5) {
      return request<PlotListResponse>(
        `/plots/new?limit=${limit}`,
      );
    },
    get(id: string) {
      return request<PlotDetailResponse>(`/plots/${id}`);
    },
  },
  sections: {
    list(plotId: string) {
      return request<SectionListResponse>(
        `/plots/${plotId}/sections`,
      );
    },
    get(id: string) {
      return request<SectionItem>(`/sections/${id}`);
    },
    create(plotId: string, body: { title: string; content?: Record<string, unknown> }) {
      return request<SectionItem>(`/plots/${plotId}/sections`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    update(id: string, body: { title?: string; content?: Record<string, unknown> }) {
      return request<SectionItem>(`/sections/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    delete(id: string) {
      return request<void>(`/sections/${id}`, {
        method: "DELETE",
      });
    },
    history(id: string, limit = 10) {
      return request<HistoryListResponse>(
        `/sections/${id}/history?limit=${limit}`,
      );
    },
    rollback(id: string, version: number) {
      return request<SectionItem>(
        `/sections/${id}/rollback/${version}`,
        { method: "POST" },
      );
    },
  },
  images: {
    async upload(file: File): Promise<ImageUploadResponse> {
      const url = `${API_BASE}/images`;
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new ApiError(res.status, body.detail ?? "Upload failed");
      }

      return res.json() as Promise<ImageUploadResponse>;
    },
  },
  users: {
    get(username: string) {
      return request<UserProfile>(`/auth/users/${username}`);
    },
    plots(username: string, limit = 20, offset = 0) {
      return request<PlotListResponse>(
        `/auth/users/${username}/plots?limit=${limit}&offset=${offset}`,
      );
    },
    contributions(username: string, limit = 20, offset = 0) {
      return request<PlotListResponse>(
        `/auth/users/${username}/contributions?limit=${limit}&offset=${offset}`,
      );
    },
  },
  stars: {
    list(plotId: string) {
      return request<StarListResponse>(`/plots/${plotId}/stars`);
    },
    add(plotId: string) {
      return request<{ status: string }>(`/plots/${plotId}/stars`, {
        method: "POST",
      });
    },
    remove(plotId: string) {
      return request<void>(`/plots/${plotId}/stars`, {
        method: "DELETE",
      });
    },
  },
  forks: {
    create(plotId: string) {
      return request<PlotItem>(`/plots/${plotId}/fork`, {
        method: "POST",
      });
    },
  },
  threads: {
    create(plotId: string, sectionId?: string) {
      return request<ThreadResponse>(`/threads`, {
        method: "POST",
        body: JSON.stringify({ plotId, sectionId }),
      });
    },
    comments(threadId: string, limit = 50, offset = 0) {
      return request<CommentListResponse>(
        `/threads/${threadId}/comments?limit=${limit}&offset=${offset}`,
      );
    },
    addComment(threadId: string, content: string, parentCommentId?: string) {
      return request<CommentItem>(`/threads/${threadId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, parentCommentId }),
      });
    },
  },
  search: {
    query(q: string, limit = 20, offset = 0) {
      return request<SearchResponse>(
        `/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`,
      );
    },
  },
} as const;
