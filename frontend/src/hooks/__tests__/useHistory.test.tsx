import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import type {
  DiffResponse,
  HistoryListResponse,
  PlotDetailResponse,
  RollbackLogListResponse,
  RollbackRequest,
  SnapshotDetailResponse,
  SnapshotListResponse,
} from "@/lib/api/types";

// ── mock 関数 ──────────────────────────────────────────────────
const mockGetHistory = vi.fn();
const mockGetDiff = vi.fn();
const mockSnapshotList = vi.fn();
const mockSnapshotGet = vi.fn();
const mockSnapshotRollback =
  vi.fn<(plotId: string, snapshotId: string, body?: RollbackRequest, token?: string) => Promise<PlotDetailResponse>>();
const mockGetRollbackLogs = vi.fn();

// ── repository mock ────────────────────────────────────────────
vi.mock("@/lib/api/repositories", () => ({
  historyRepository: {
    getHistory: (...args: unknown[]) => mockGetHistory(...args),
    getDiff: (...args: unknown[]) => mockGetDiff(...args),
  },
  snapshotRepository: {
    list: (...args: unknown[]) => mockSnapshotList(...args),
    get: (...args: unknown[]) => mockSnapshotGet(...args),
    rollback: (...args: Parameters<typeof mockSnapshotRollback>) => mockSnapshotRollback(...args),
    getRollbackLogs: (...args: unknown[]) => mockGetRollbackLogs(...args),
  },
}));

// ── useAuth mock ───────────────────────────────────────────────
const mockUseAuth = vi.fn();
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

// ── sonner mock ────────────────────────────────────────────────
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const unauthenticatedAuth = {
  session: null,
  user: null,
  isLoading: false,
  isAuthenticated: false,
  signInWithGitHub: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  handleUnauthorized: vi.fn(),
};

const authenticatedAuth = {
  user: {
    id: "user-001",
    displayName: "Test User",
    email: "test@example.com",
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00Z",
  },
  session: { access_token: "mock-token" },
  isLoading: false,
  isAuthenticated: true,
  signInWithGitHub: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  handleUnauthorized: vi.fn(),
};

import {
  useDiff,
  useHistory,
  useRollback,
  useRollbackLogs,
  useSnapshotDetail,
  useSnapshots,
} from "../useHistory";

// ── テストデータ ───────────────────────────────────────────────
const mockHistoryListResponse: HistoryListResponse = {
  items: [
    {
      id: "history-1",
      sectionId: "section-1",
      operationType: "insert",
      payload: { position: 0, content: "テスト", length: 3 },
      user: { id: "user-001", displayName: "Test User", avatarUrl: null },
      version: 5,
      createdAt: "2026-02-20T00:00:00Z",
    },
    {
      id: "history-2",
      sectionId: "section-1",
      operationType: "update",
      payload: null,
      user: { id: "user-002", displayName: "User 2", avatarUrl: null },
      version: 4,
      createdAt: "2026-02-19T12:00:00Z",
    },
  ],
  total: 2,
};

const mockSnapshotListResponse: SnapshotListResponse = {
  items: [
    { id: "snap-1", plotId: "plot-1", version: 3, createdAt: "2026-02-20T00:00:00Z" },
    { id: "snap-2", plotId: "plot-1", version: 2, createdAt: "2026-02-19T00:00:00Z" },
  ],
  total: 2,
};

const mockSnapshotDetailResponse: SnapshotDetailResponse = {
  id: "snap-1",
  plotId: "plot-1",
  version: 3,
  content: {
    plot: { title: "Test Plot", description: "desc", tags: ["tag1"] },
    sections: [
      { id: "sec-1", title: "Section 1", content: null, orderIndex: 0, version: 1 },
    ],
  },
  createdAt: "2026-02-20T00:00:00Z",
};

const mockRollbackLogListResponse: RollbackLogListResponse = {
  items: [
    {
      id: "log-1",
      plotId: "plot-1",
      snapshotId: "snap-1",
      snapshotVersion: 3,
      user: { id: "user-001", displayName: "Test User", avatarUrl: null },
      reason: "荒らし行為の復旧",
      createdAt: "2026-02-20T00:00:00Z",
    },
  ],
  total: 1,
};

const mockDiffResponse: DiffResponse = {
  fromVersion: 1,
  toVersion: 2,
  additions: [{ start: 0, end: 10, text: "追加テキスト" }],
  deletions: [{ start: 20, end: 30, text: "削除テキスト" }],
};

const mockPlotDetailResponse: PlotDetailResponse = {
  id: "plot-1",
  title: "Test Plot",
  description: null,
  tags: [],
  ownerId: "user-001",
  starCount: 0,
  isStarred: false,
  isPaused: false,
  thumbnailUrl: null,
  version: 4,
  createdAt: "2026-02-20T00:00:00Z",
  updatedAt: "2026-02-20T00:00:00Z",
  sections: [],
  owner: null,
};

// ── ヘルパー ───────────────────────────────────────────────────
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

// ================================================================
// テスト
// ================================================================

describe("useHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(unauthenticatedAuth);
    mockGetHistory.mockResolvedValue(mockHistoryListResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sectionId を渡して履歴一覧を取得する", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHistory("section-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetHistory).toHaveBeenCalledWith("section-1", undefined, undefined);
    expect(result.current.data).toEqual(mockHistoryListResponse);
  });

  it("limit / offset パラメータを渡せる", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useHistory("section-1", { limit: 10, offset: 5 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetHistory).toHaveBeenCalledWith("section-1", { limit: 10, offset: 5 }, undefined);
  });

  it("空文字 sectionId ではクエリが無効化される", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHistory(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetHistory).not.toHaveBeenCalled();
  });

  it("認証済みユーザーのトークンがリポジトリに渡される", async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHistory("section-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetHistory).toHaveBeenCalledWith("section-1", undefined, "mock-token");
  });
});

describe("useSnapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(unauthenticatedAuth);
    mockSnapshotList.mockResolvedValue(mockSnapshotListResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("plotId を渡してスナップショット一覧を取得する", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSnapshots("plot-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSnapshotList).toHaveBeenCalledWith("plot-1", undefined, undefined);
    expect(result.current.data?.items).toHaveLength(2);
  });

  it("limit / offset パラメータを渡せる", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useSnapshots("plot-1", { limit: 5, offset: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSnapshotList).toHaveBeenCalledWith("plot-1", { limit: 5, offset: 10 }, undefined);
  });

  it("空文字 plotId ではクエリが無効化される", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSnapshots(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockSnapshotList).not.toHaveBeenCalled();
  });
});

describe("useSnapshotDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(unauthenticatedAuth);
    mockSnapshotGet.mockResolvedValue(mockSnapshotDetailResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("plotId と snapshotId を渡してスナップショット詳細を取得する", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useSnapshotDetail("plot-1", "snap-1"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSnapshotGet).toHaveBeenCalledWith("plot-1", "snap-1", undefined);
    expect(result.current.data).toEqual(mockSnapshotDetailResponse);
  });

  it("空文字 plotId ではクエリが無効化される", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useSnapshotDetail("", "snap-1"),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockSnapshotGet).not.toHaveBeenCalled();
  });

  it("空文字 snapshotId ではクエリが無効化される", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useSnapshotDetail("plot-1", ""),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockSnapshotGet).not.toHaveBeenCalled();
  });
});

describe("useRollback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(authenticatedAuth);
    mockSnapshotRollback.mockResolvedValue(mockPlotDetailResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ロールバックを実行し、成功時に toast.success を表示する", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useRollback("plot-1", "snap-1"),
      { wrapper },
    );

    result.current.mutate({ expectedVersion: 3, reason: "荒らし行為の復旧" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSnapshotRollback).toHaveBeenCalledWith(
      "plot-1",
      "snap-1",
      { expectedVersion: 3, reason: "荒らし行為の復旧" },
      "mock-token",
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("スナップショットから復元しました");
  });

  it("成功時に Plot 詳細・スナップショット一覧・ロールバックログを invalidate する", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useRollback("plot-1", "snap-1"),
      { wrapper },
    );

    result.current.mutate(undefined);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["plots", "detail", "plot-1"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["snapshots", "list", "plot-1", undefined],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["snapshots", "rollbackLogs", "plot-1", undefined],
    });
  });

  it("404 エラー時にスナップショット未検出のメッセージを表示する", async () => {
    mockSnapshotRollback.mockRejectedValue(new ApiError(404, "Not Found"));
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useRollback("plot-1", "snap-1"),
      { wrapper },
    );

    result.current.mutate(undefined);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockToastError).toHaveBeenCalledWith("指定のスナップショットが見つかりません");
  });

  it("403 エラー時に一時停止中のメッセージを表示する", async () => {
    mockSnapshotRollback.mockRejectedValue(new ApiError(403, "This plot is paused"));
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useRollback("plot-1", "snap-1"),
      { wrapper },
    );

    result.current.mutate(undefined);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockToastError).toHaveBeenCalledWith(
      "このPlotは現在一時停止中のため、復元できません",
    );
  });

  it("409 エラー時にバージョン不一致メッセージを表示し、Plot 詳細を invalidate する", async () => {
    mockSnapshotRollback.mockRejectedValue(new ApiError(409, "Version conflict"));
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useRollback("plot-1", "snap-1"),
      { wrapper },
    );

    result.current.mutate(undefined);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockToastError).toHaveBeenCalledWith(
      "他のユーザーが先に変更を行いました。ページを再読み込みしてください",
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["plots", "detail", "plot-1"],
    });
  });

  it("未認証時に「認証が必要です」エラーを投げ、リポジトリを呼ばない", async () => {
    mockUseAuth.mockReturnValue(unauthenticatedAuth);
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useRollback("plot-1", "snap-1"),
      { wrapper },
    );

    result.current.mutate(undefined);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe("認証が必要です");
    expect(mockSnapshotRollback).not.toHaveBeenCalled();
  });

  it("options なし（undefined）でもロールバックを実行できる", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useRollback("plot-1", "snap-1"),
      { wrapper },
    );

    result.current.mutate(undefined);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSnapshotRollback).toHaveBeenCalledWith(
      "plot-1",
      "snap-1",
      undefined,
      "mock-token",
    );
  });
});

describe("useRollbackLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(authenticatedAuth);
    mockGetRollbackLogs.mockResolvedValue(mockRollbackLogListResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("plotId を渡してロールバック監査ログ一覧を取得する", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRollbackLogs("plot-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetRollbackLogs).toHaveBeenCalledWith("plot-1", undefined, "mock-token");
    expect(result.current.data?.items).toHaveLength(1);
  });

  it("limit / offset パラメータを渡せる", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useRollbackLogs("plot-1", { limit: 10, offset: 5 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetRollbackLogs).toHaveBeenCalledWith(
      "plot-1",
      { limit: 10, offset: 5 },
      "mock-token",
    );
  });

  it("空文字 plotId ではクエリが無効化される", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRollbackLogs(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetRollbackLogs).not.toHaveBeenCalled();
  });
});

describe("useDiff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(unauthenticatedAuth);
    mockGetDiff.mockResolvedValue(mockDiffResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sectionId, fromVersion, toVersion を渡して差分を取得する", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useDiff("section-1", 1, 2),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetDiff).toHaveBeenCalledWith("section-1", 1, 2, undefined);
    expect(result.current.data).toEqual(mockDiffResponse);
  });

  it("空文字 sectionId ではクエリが無効化される", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDiff("", 1, 2), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetDiff).not.toHaveBeenCalled();
  });

  it("fromVersion が 0 以下ではクエリが無効化される", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDiff("section-1", 0, 2), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetDiff).not.toHaveBeenCalled();
  });

  it("toVersion が 0 以下ではクエリが無効化される", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDiff("section-1", 1, 0), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetDiff).not.toHaveBeenCalled();
  });

  it("認証済みユーザーのトークンがリポジトリに渡される", async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth);
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useDiff("section-1", 1, 2),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetDiff).toHaveBeenCalledWith("section-1", 1, 2, "mock-token");
  });
});
