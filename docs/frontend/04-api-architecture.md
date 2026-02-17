# API 抽象化戦略

> **API仕様の詳細:** バックエンドAPIのエンドポイント仕様、リクエスト/レスポンス形式、認証方法等の詳細は [docs/api.md](../../api.md) を参照してください。

## 設計思想

バックエンド API は未確定で変動する可能性が高いため、**3 層のレイヤー分離**で変更の影響を局所化する。

```
┌──────────────────────────────────────────────────────────────┐
│  Component (page.tsx / *.tsx)                                 │
│    └─ hooks (usePlots, useSections, ...)を呼ぶだけ           │
├──────────────────────────────────────────────────────────────┤
│  Hooks Layer (hooks/*.ts)                                    │
│    └─ TanStack Query でキャッシュ/ローディング管理           │
│    └─ Repository の関数を queryFn / mutationFn に渡す        │
├──────────────────────────────────────────────────────────────┤
│  Repository Layer (lib/api/*.ts)                             │
│    └─ 薄い関数群。HTTP リクエスト ⇄ 型変換のみ              │
│    └─ API 仕様が変わったらここだけ修正                       │
├──────────────────────────────────────────────────────────────┤
│  HTTP Client (lib/api/client.ts)                             │
│    └─ fetch ラッパー。Base URL, Authorization, エラー変換    │
└──────────────────────────────────────────────────────────────┘
```

**API が変わったとき:**
- エンドポイント URL 変更 → `lib/api/{resource}.ts` のみ修正
- レスポンス形式変更 → `lib/api/types.ts` + `lib/api/{resource}.ts` のみ修正
- フィールド名変更（camelCase ⇄ snake_case）→ `lib/api/{resource}.ts` 内でマッピング
- hooks 層・コンポーネント層は **一切変更不要**

## コード例

### 1. HTTP クライアント — `lib/api/client.ts`

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string;
};

export async function apiClient<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { body, token, headers: customHeaders, ...init } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, err.detail ?? "Unknown error");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** multipart/form-data 用（画像アップロード等） */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, err.detail ?? "Upload failed");
  }

  return res.json() as Promise<T>;
}
```

### 2. 型定義 — `lib/api/types.ts`

API レスポンスの正規化型：

```typescript
// ---- 共通 ----
export interface UserBrief {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

// ---- Plot ----
export interface PlotItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  ownerId: string;
  starCount: number;
  isStarred: boolean;
  isPaused: boolean;
  editingUsers: { id: string; displayName: string; avatarUrl: string; sectionId: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface PlotListResponse {
  items: PlotItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlotDetailResponse extends PlotItem {
  sections: SectionItem[];
  owner: UserBrief;
}

export interface CreatePlotRequest {
  title: string;
  description?: string;
  tags?: string[];
}

export interface UpdatePlotRequest {
  title?: string;
  description?: string;
  tags?: string[];
}

// ---- Section ----
export interface SectionItem {
  id: string;
  plotId: string;
  title: string;
  content: Record<string, unknown> | null;
  orderIndex: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SectionListResponse {
  items: SectionItem[];
  total: number;
}

// ---- History ----
export interface HistoryEntry {
  id: string;
  sectionId: string;
  operationType: string;
  payload: Record<string, unknown> | null;
  user: UserBrief;
  version: number;
  createdAt: string;
}

export interface HistoryListResponse {
  items: HistoryEntry[];
  total: number;
}

export interface DiffResponse {
  fromVersion: number;
  toVersion: number;
  additions: { start: number; end: number; text: string }[];
  deletions: { start: number; end: number; text: string }[];
}

// ---- Image ----
export interface ImageUploadResponse {
  url: string;
  filename: string;
  width: number;
  height: number;
}

// ---- SNS ----
export interface StarListResponse {
  items: { user: UserBrief; createdAt: string }[];
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
  content: string;
  parentCommentId: string | null;
  user: UserBrief;
  createdAt: string;
}

export interface CommentListResponse {
  items: CommentItem[];
  total: number;
}

// ---- Search ----
export interface SearchResponse {
  items: PlotItem[];
  total: number;
  query: string;
}

// ---- User ----
export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  plotCount: number;
  contributionCount: number;
  createdAt: string;
}
```

### 3. リポジトリ例 — `lib/api/plots.ts`

```typescript
import { apiClient } from "./client";

export const plotRepository = {
  list(params) { return apiClient<PlotListResponse>(`/plots?${query}`) },
  get(id) { return apiClient<PlotDetailResponse>(`/plots/${id}`) },
  create(data, token) { return apiClient<PlotItem>("/plots", { method: "POST", body: data, token }) },
  trending(limit = 5) { return apiClient<PlotListResponse>(`/plots/trending?limit=${limit}`) },
  // ... popular, latest など同様
};
```

### 4. TanStack Query Hook — `hooks/usePlots.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plotRepository } from "@/lib/api/plots";

// クエリ例
export function usePlotDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.plots.detail(id),
    queryFn: () => plotRepository.get(id),
    enabled: !!id,
  });
}

// ミューテーション例 (楽観的更新 + invalidateQueries)
export function useCreatePlot() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (data) => plotRepository.create(data, session?.access_token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.plots.all }),
  });
}
```

### 5. Query Key 定義 — `lib/query-keys.ts`

階層構造で管理：

```typescript
export const queryKeys = {
  plots: {
    all: ["plots"] as const,
    detail: (id: string) => ["plots", "detail", id] as const,
    // ... trending, list など
  },
  sections: { ... },
  // 他のリソースも同様
} as const;
```

### 6. コンポーネントでの使用例

Client Component で hook を呼び出すだけ：

```tsx
"use client";
function TrendingSection() {
  const { data, isLoading } = useTrendingPlots(5);
  if (isLoading) return <Skeleton />;
  return <PlotList items={data?.items ?? []} />;
}
```
