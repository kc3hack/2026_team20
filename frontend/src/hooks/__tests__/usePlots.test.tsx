import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CreatePlotRequest,
  PlotListResponse,
  PlotResponse,
  UpdatePlotRequest,
} from "@/lib/api/types";

// ── mock 関数 ──────────────────────────────────────────────────
const mockTrending = vi.fn();
const mockPopular = vi.fn();
const mockLatest = vi.fn();
const mockList = vi.fn();
const mockGet = vi.fn();
const mockCreate = vi.fn<(body: CreatePlotRequest, token?: string) => Promise<PlotResponse>>();
const mockUpdate =
  vi.fn<(plotId: string, body: UpdatePlotRequest, token?: string) => Promise<PlotResponse>>();

// ── repository mock ────────────────────────────────────────────
vi.mock("@/lib/api/repositories", () => ({
  plotRepository: {
    trending: (...args: unknown[]) => mockTrending(...args),
    popular: (...args: unknown[]) => mockPopular(...args),
    latest: (...args: unknown[]) => mockLatest(...args),
    list: (...args: unknown[]) => mockList(...args),
    get: (...args: unknown[]) => mockGet(...args),
    create: (...args: Parameters<typeof mockCreate>) => mockCreate(...args),
    update: (...args: Parameters<typeof mockUpdate>) => mockUpdate(...args),
  },
}));

// ── useAuth mock（デフォルト: 未認証） ─────────────────────────
const mockUseAuth = vi.fn();
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
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

// ── imports under test ─────────────────────────────────────────
import {
  useCreatePlot,
  useLatestPlots,
  usePlotDetail,
  usePlotList,
  usePopularPlots,
  useTrendingPlots,
  useUpdatePlot,
} from "../usePlots";

// ── 共通テストデータ ───────────────────────────────────────────
const mockPlotListResponse: PlotListResponse = {
  items: [
    {
      id: "plot-1",
      title: "Test Plot",
      description: null,
      tags: ["test"],
      ownerId: "user-1",
      starCount: 10,
      isStarred: false,
      isPaused: false,
      thumbnailUrl: null,
      version: 1,
      createdAt: "2026-02-20T00:00:00Z",
      updatedAt: "2026-02-20T00:00:00Z",
    },
  ],
  total: 1,
  limit: 5,
  offset: 0,
};

const createMockPlotResponse = (overrides: Partial<PlotResponse> = {}): PlotResponse => ({
  id: "plot-001",
  title: "テストPlot",
  description: null,
  tags: [],
  ownerId: "user-001",
  starCount: 0,
  isStarred: false,
  isPaused: false,
  thumbnailUrl: null,
  version: 0,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

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

describe("usePlots hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(unauthenticatedAuth);
    mockTrending.mockResolvedValue(mockPlotListResponse);
    mockPopular.mockResolvedValue(mockPlotListResponse);
    mockLatest.mockResolvedValue(mockPlotListResponse);
    mockList.mockResolvedValue(mockPlotListResponse);
    mockGet.mockResolvedValue({ ...mockPlotListResponse.items[0], sections: [], owner: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useTrendingPlots", () => {
    it("デフォルト limit=5 でリポジトリを呼び出す", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTrendingPlots(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockTrending).toHaveBeenCalledWith({ limit: 5 }, undefined);
      expect(result.current.data).toEqual(mockPlotListResponse);
    });

    it("カスタム limit でリポジトリを呼び出す", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTrendingPlots(10), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockTrending).toHaveBeenCalledWith({ limit: 10 }, undefined);
    });

    it("異なる limit 値は異なるキャッシュキーを使用する", async () => {
      const { wrapper } = createWrapper();

      const { result: result5 } = renderHook(() => useTrendingPlots(5), { wrapper });

      await waitFor(() => expect(result5.current.isSuccess).toBe(true));

      const { result: result10 } = renderHook(() => useTrendingPlots(10), { wrapper });

      await waitFor(() => expect(result10.current.isSuccess).toBe(true));

      expect(mockTrending).toHaveBeenCalledTimes(2);
      expect(mockTrending).toHaveBeenCalledWith({ limit: 5 }, undefined);
      expect(mockTrending).toHaveBeenCalledWith({ limit: 10 }, undefined);
    });
  });

  describe("usePopularPlots", () => {
    it("デフォルト limit=5 でリポジトリを呼び出す", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePopularPlots(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPopular).toHaveBeenCalledWith({ limit: 5 }, undefined);
    });

    it("カスタム limit でリポジトリを呼び出す", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePopularPlots(10), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPopular).toHaveBeenCalledWith({ limit: 10 }, undefined);
    });
  });

  describe("useLatestPlots", () => {
    it("デフォルト limit=5 でリポジトリを呼び出す", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useLatestPlots(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockLatest).toHaveBeenCalledWith({ limit: 5 }, undefined);
    });

    it("カスタム limit でリポジトリを呼び出す", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useLatestPlots(10), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockLatest).toHaveBeenCalledWith({ limit: 10 }, undefined);
    });
  });

  describe("usePlotList", () => {
    it("パラメータなしでリポジトリを呼び出す", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePlotList(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockList).toHaveBeenCalledWith(undefined, undefined);
    });

    it("tag パラメータ付きでリポジトリを呼び出す", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePlotList({ tag: "React" }), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockList).toHaveBeenCalledWith({ tag: "React" }, undefined);
    });
  });

  describe("usePlotDetail", () => {
    it("id を渡してリポジトリを呼び出す", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePlotDetail("plot-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGet).toHaveBeenCalledWith("plot-1", undefined);
    });

    it("空文字 id ではクエリが無効化される", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePlotDetail(""), { wrapper });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("session が null（未ログイン）のとき", () => {
    it("token が undefined でも正常にデータ取得できる", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTrendingPlots(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockTrending).toHaveBeenCalledWith({ limit: 5 }, undefined);
      expect(result.current.data).toEqual(mockPlotListResponse);
    });
  });
});

describe("useCreatePlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(authenticatedAuth);
  });

  it("plotRepository.create を呼び出して PlotResponse を返す", async () => {
    const mockResponse = createMockPlotResponse({ id: "created-plot" });
    mockCreate.mockResolvedValue(mockResponse);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatePlot(), { wrapper });

    result.current.mutate({ title: "新しいPlot" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCreate).toHaveBeenCalledWith({ title: "新しいPlot" }, "mock-token");
    expect(result.current.data).toEqual(mockResponse);
  });

  it("成功時に plots キャッシュを無効化する", async () => {
    const mockResponse = createMockPlotResponse();
    mockCreate.mockResolvedValue(mockResponse);
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreatePlot(), { wrapper });

    result.current.mutate({ title: "テスト" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["plots"] });
  });

  it("失敗時にエラー状態になる", async () => {
    mockCreate.mockRejectedValue(new Error("API Error"));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatePlot(), { wrapper });

    result.current.mutate({ title: "失敗するPlot" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe("API Error");
  });
});

describe("useUpdatePlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(authenticatedAuth);
  });

  it("plotRepository.update を呼び出して PlotResponse を返す", async () => {
    const mockResponse = createMockPlotResponse({ title: "更新済みPlot" });
    mockUpdate.mockResolvedValue(mockResponse);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdatePlot(), { wrapper });

    result.current.mutate({ plotId: "plot-001", data: { title: "更新済みPlot" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUpdate).toHaveBeenCalledWith("plot-001", { title: "更新済みPlot" }, "mock-token");
    expect(result.current.data).toEqual(mockResponse);
  });

  it("成功時に plots キャッシュを無効化する", async () => {
    const mockResponse = createMockPlotResponse();
    mockUpdate.mockResolvedValue(mockResponse);
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdatePlot(), { wrapper });

    result.current.mutate({ plotId: "plot-001", data: { title: "更新" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["plots"] });
  });

  it("失敗時にエラー状態になる", async () => {
    mockUpdate.mockRejectedValue(new Error("Not Found"));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdatePlot(), { wrapper });

    result.current.mutate({ plotId: "plot-404", data: { title: "更新" } });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe("Not Found");
  });
});
