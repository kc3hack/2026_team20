import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlotListResponse } from "@/lib/api/types";

const mockTrending = vi.fn();
const mockPopular = vi.fn();
const mockLatest = vi.fn();
const mockList = vi.fn();
const mockGet = vi.fn();

vi.mock("@/lib/api/repositories", () => ({
  plotRepository: {
    trending: (...args: unknown[]) => mockTrending(...args),
    popular: (...args: unknown[]) => mockPopular(...args),
    latest: (...args: unknown[]) => mockLatest(...args),
    list: (...args: unknown[]) => mockList(...args),
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    session: null,
    user: null,
    isLoading: false,
    isAuthenticated: false,
    signInWithGitHub: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    handleUnauthorized: vi.fn(),
  }),
}));

import {
  useLatestPlots,
  usePlotDetail,
  usePlotList,
  usePopularPlots,
  useTrendingPlots,
} from "../usePlots";

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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("usePlots hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      const { result } = renderHook(() => useTrendingPlots(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockTrending).toHaveBeenCalledWith({ limit: 5 }, undefined);
      expect(result.current.data).toEqual(mockPlotListResponse);
    });

    it("カスタム limit でリポジトリを呼び出す", async () => {
      const { result } = renderHook(() => useTrendingPlots(10), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockTrending).toHaveBeenCalledWith({ limit: 10 }, undefined);
    });

    it("異なる limit 値は異なるキャッシュキーを使用する", async () => {
      const wrapper = createWrapper();

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
      const { result } = renderHook(() => usePopularPlots(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPopular).toHaveBeenCalledWith({ limit: 5 }, undefined);
    });

    it("カスタム limit でリポジトリを呼び出す", async () => {
      const { result } = renderHook(() => usePopularPlots(10), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPopular).toHaveBeenCalledWith({ limit: 10 }, undefined);
    });
  });

  describe("useLatestPlots", () => {
    it("デフォルト limit=5 でリポジトリを呼び出す", async () => {
      const { result } = renderHook(() => useLatestPlots(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockLatest).toHaveBeenCalledWith({ limit: 5 }, undefined);
    });

    it("カスタム limit でリポジトリを呼び出す", async () => {
      const { result } = renderHook(() => useLatestPlots(10), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockLatest).toHaveBeenCalledWith({ limit: 10 }, undefined);
    });
  });

  describe("usePlotList", () => {
    it("パラメータなしでリポジトリを呼び出す", async () => {
      const { result } = renderHook(() => usePlotList(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockList).toHaveBeenCalledWith(undefined, undefined);
    });

    it("tag パラメータ付きでリポジトリを呼び出す", async () => {
      const { result } = renderHook(() => usePlotList({ tag: "React" }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockList).toHaveBeenCalledWith({ tag: "React" }, undefined);
    });
  });

  describe("usePlotDetail", () => {
    it("id を渡してリポジトリを呼び出す", async () => {
      const { result } = renderHook(() => usePlotDetail("plot-1"), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGet).toHaveBeenCalledWith("plot-1", undefined);
    });

    it("空文字 id ではクエリが無効化される", () => {
      const { result } = renderHook(() => usePlotDetail(""), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("session が null（未ログイン）のとき", () => {
    it("token が undefined でも正常にデータ取得できる", async () => {
      const { result } = renderHook(() => useTrendingPlots(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockTrending).toHaveBeenCalledWith({ limit: 5 }, undefined);
      expect(result.current.data).toEqual(mockPlotListResponse);
    });
  });
});
