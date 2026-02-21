import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SectionListResponse, SectionResponse } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

// ── Mock: repositories ──────────────────────────────────────────
const mockListByPlot = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockReorder = vi.fn();
const mockSaveOperation = vi.fn();

vi.mock("@/lib/api/repositories", () => ({
  sectionRepository: {
    listByPlot: (...args: unknown[]) => mockListByPlot(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    reorder: (...args: unknown[]) => mockReorder(...args),
  },
  historyRepository: {
    saveOperation: (...args: unknown[]) => mockSaveOperation(...args),
  },
}));

// ── Mock: AuthProvider ──────────────────────────────────────────
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    session: { access_token: "mock-token" },
    user: {
      id: "user-1",
      email: "taro@example.com",
      displayName: "太郎",
      avatarUrl: null,
      createdAt: "2026-02-20T00:00:00Z",
    },
    isLoading: false,
    isAuthenticated: true,
    signInWithGitHub: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    handleUnauthorized: vi.fn(),
  }),
}));

import {
  useCreateSection,
  useDeleteSection,
  useReorderSection,
  useSectionList,
  useUpdateSection,
} from "../useSections";

const mockSection: SectionResponse = {
  id: "section-1",
  plotId: "plot-1",
  title: "概要",
  content: null,
  orderIndex: 0,
  version: 1,
  createdAt: "2026-02-20T00:00:00Z",
  updatedAt: "2026-02-20T00:00:00Z",
};

const mockSectionListResponse: SectionListResponse = {
  items: [mockSection],
  total: 1,
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

describe("useSections hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListByPlot.mockResolvedValue(mockSectionListResponse);
    mockCreate.mockResolvedValue({ ...mockSection, id: "section-new" });
    mockUpdate.mockResolvedValue({ ...mockSection, title: "更新済み" });
    mockRemove.mockResolvedValue(undefined);
    mockReorder.mockResolvedValue({ ...mockSection, orderIndex: 2 });
    mockSaveOperation.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useSectionList", () => {
    it("plotId でセクション一覧を取得する", async () => {
      const { result } = renderHook(() => useSectionList("plot-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockListByPlot).toHaveBeenCalledWith("plot-1", "mock-token");
      expect(result.current.data).toEqual(mockSectionListResponse);
    });

    it("空文字 plotId ではクエリが無効化される", () => {
      const { result } = renderHook(() => useSectionList(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockListByPlot).not.toHaveBeenCalled();
    });
  });

  describe("useCreateSection", () => {
    it("セクションを作成し成功する", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateSection(), { wrapper });

      await act(async () => {
        result.current.mutate({
          plotId: "plot-1",
          body: { title: "新セクション" },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreate).toHaveBeenCalledWith("plot-1", { title: "新セクション" }, "mock-token");
    });
  });

  describe("useUpdateSection", () => {
    it("セクションを更新し成功する", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateSection(), { wrapper });

      await act(async () => {
        result.current.mutate({
          plotId: "plot-1",
          sectionId: "section-1",
          body: { title: "更新済み" },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdate).toHaveBeenCalledWith(
        "section-1",
        { title: "更新済み" },
        "mock-token",
      );
    });

    it("更新時に HotOperation を保存する（保存と履歴記録が並列実行される）", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateSection(), { wrapper });

      await act(async () => {
        result.current.mutate({
          plotId: "plot-1",
          sectionId: "section-1",
          body: { title: "更新済み" },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockSaveOperation).toHaveBeenCalledWith(
        "section-1",
        { operationType: "update" },
        "mock-token",
      );
    });

    it("楽観的更新: mutate 直後にキャッシュが即座に更新される", async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      queryClient.setQueryData(
        queryKeys.sections.byPlot("plot-1"),
        mockSectionListResponse,
      );

      let resolveUpdate: (value: SectionResponse) => void;
      mockUpdate.mockImplementation(
        () => new Promise<SectionResponse>((resolve) => { resolveUpdate = resolve; }),
      );
      mockSaveOperation.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useUpdateSection(), { wrapper });

      act(() => {
        result.current.mutate({
          plotId: "plot-1",
          sectionId: "section-1",
          body: { title: "楽観的タイトル" },
        });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<SectionListResponse>(
          queryKeys.sections.byPlot("plot-1"),
        );
        expect(cached?.items[0].title).toBe("楽観的タイトル");
      });
    });

    it("楽観的更新: エラー時にキャッシュがロールバックされる", async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      queryClient.setQueryData(
        queryKeys.sections.byPlot("plot-1"),
        mockSectionListResponse,
      );

      mockUpdate.mockRejectedValue(new Error("Server error"));
      mockSaveOperation.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useUpdateSection(), { wrapper });

      await act(async () => {
        result.current.mutate({
          plotId: "plot-1",
          sectionId: "section-1",
          body: { title: "失敗するタイトル" },
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      const cached = queryClient.getQueryData<SectionListResponse>(
        queryKeys.sections.byPlot("plot-1"),
      );
      expect(cached?.items[0].title).toBe("概要");
    });
  });

  describe("useDeleteSection", () => {
    it("セクションを削除し成功する", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteSection(), { wrapper });

      await act(async () => {
        result.current.mutate({ sectionId: "section-1", plotId: "plot-1" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockRemove).toHaveBeenCalledWith("section-1", "mock-token");
    });
  });

  describe("useReorderSection", () => {
    it("セクションを並び替え成功する", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useReorderSection(), { wrapper });

      await act(async () => {
        result.current.mutate({
          sectionId: "section-1",
          plotId: "plot-1",
          body: { newOrder: 2 },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockReorder).toHaveBeenCalledWith("section-1", { newOrder: 2 }, "mock-token");
    });
  });
});
