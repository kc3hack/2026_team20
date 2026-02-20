import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlotDetail } from "../usePlots";

vi.mock("@/lib/api/repositories/plotRepository", () => ({
  get: vi.fn(),
}));

import * as plotRepository from "@/lib/api/repositories/plotRepository";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return QueryClientProvider({ client: queryClient, children });
  };
}

const mockPlotDetail = {
  id: "plot-001",
  title: "テスト Plot",
  description: "テスト用の Plot です",
  tags: ["テスト"],
  ownerId: "user-001",
  starCount: 10,
  isStarred: false,
  isPaused: false,
  thumbnailUrl: null,
  version: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  sections: [],
  owner: {
    id: "user-001",
    displayName: "テストユーザー",
    avatarUrl: null,
  },
};

describe("usePlotDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常なIDで PlotDetailResponse が返る", async () => {
    vi.mocked(plotRepository.get).mockResolvedValue(mockPlotDetail);

    const { result } = renderHook(() => usePlotDetail("plot-001"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockPlotDetail);
    expect(result.current.error).toBeNull();
    expect(plotRepository.get).toHaveBeenCalledWith("plot-001");
  });

  it("isLoading が初期状態で true になる", () => {
    vi.mocked(plotRepository.get).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePlotDetail("plot-001"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("存在しないIDで error がセットされる", async () => {
    vi.mocked(plotRepository.get).mockRejectedValue(new Error("Not Found"));

    const { result } = renderHook(() => usePlotDetail("non-existent"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });

  it("id が空文字の場合はクエリが無効化される", () => {
    const { result } = renderHook(() => usePlotDetail(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(plotRepository.get).not.toHaveBeenCalled();
  });

  it("refetch 関数が返される", async () => {
    vi.mocked(plotRepository.get).mockResolvedValue(mockPlotDetail);

    const { result } = renderHook(() => usePlotDetail("plot-001"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe("function");
  });
});
