# API 抽象化戦略

> **API仕様の詳細:** バックエンドAPIのエンドポイント仕様、リクエスト/レスポンス形式、認証方法等の詳細は [docs/api.md](../../api.md) を参照してください。

## 設計思想

バックエンド API は未確定で変動する可能性が高いため、**3 層のレイヤー分離**で変更の影響を局所化する。

```
┌──────────────────────────────────────────────────────────────┐
│  Component (page.tsx / *.tsx)                                 │
│    └─ hooks (usePlots, useSections, ...)               │
├──────────────────────────────────────────────────────────────┤
│  Hooks Layer (hooks/*.ts)                                    │
│    └─ TanStack Query でキャッシュ/ローディング管理           │
│    └─ Repository の関数を queryFn / mutationFn に渡す        │
│    └─ useSectionLock / useRealtimeSection (Y.js Awareness)   │
├──────────────────────────────────────────────────────────────┤
│  Repository Layer (lib/api/*.ts)                             │
│    └─ 薄い関数群。HTTP リクエスト ⇄ 型変換のみ              │
│    └─ API 仕様が変わったらここだけ修正                       │
├──────────────────────────────────────────────────────────────┤
│  HTTP Client (lib/api/client.ts)                             │
│    └─ fetch ラッパー。Base URL, Authorization, エラー変換    │
├──────────────────────────────────────────────────────────────┤
│  Realtime Layer (lib/realtime/*.ts) ← セクション編集専用          │
│    └─ Y.js Awareness (ロック状態管理) + Broadcast (差分配信) │
│    └─ REST API は使わない。すべて WebSocket 経由              │
└──────────────────────────────────────────────────────────────┘
```

> 📘 Realtime Layer の詳細は [10-realtime-editing.md](./10-realtime-editing.md) を参照。ロック管理は Y.js Awareness で行い、REST API のロックエンドポイントは存在しない。

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

API レスポンスの正規化型（抜粋）：

```typescript
// ---- Plot ----
export type PlotResponse = {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  ownerId: string;
  starCount: number;
  isStarred: boolean;
  isPaused: boolean;
  editingUsers: { id: string; displayName: string; avatarUrl: string | null; sectionId: string | null }[];
  createdAt: string;
  updatedAt: string;
};

export type PlotListResponse = {
  items: PlotResponse[];
  total: number;
  limit: number;
  offset: number;
};

export type PlotDetailResponse = PlotResponse & {
  sections: SectionResponse[];
  owner: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
};

export type CreatePlotRequest = {
  title: string;
  description?: string;
  tags?: string[];
};

export type UpdatePlotRequest = {
  title?: string;
  description?: string;
  tags?: string[];
};

// ---- Section ----
export type SectionResponse = {
  id: string;
  plotId: string;
  title: string;
  content: Record<string, unknown> | null;
  orderIndex: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type SectionListResponse = {
  items: SectionResponse[];
  total: number;
};

// ---- History ----
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

// ---- Image ----
export type ImageUploadResponse = {
  url: string;
  filename: string;
  width: number;
  height: number;
};

// ---- SNS ----
export type StarListResponse = {
  items: {
    user: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
    };
    createdAt: string;
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
  threadId: string;
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

// ---- Search ----
export type SearchResponse = {
  items: PlotResponse[];
  total: number;
  query: string;
};

// ---- User ----
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
```

### 3. リポジトリ例 — `lib/api/plots.ts`

```typescript
import { apiClient } from "./client";
import type { PlotListResponse, PlotDetailResponse, PlotResponse, CreatePlotRequest } from "./types";

export const plotRepository = {
  list(query: string) { return apiClient<PlotListResponse>(`/plots?${query}`) },
  get(id: string) { return apiClient<PlotDetailResponse>(`/plots/${id}`) },
  create(data: CreatePlotRequest, token?: string) { return apiClient<PlotResponse>("/plots", { method: "POST", body: data, token }) },
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
