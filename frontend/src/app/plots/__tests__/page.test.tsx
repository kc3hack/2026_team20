import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlotListResponse } from "@/lib/api/types";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

const mockListFn =
  vi.fn<
    (
      params?: { tag?: string; limit?: number; offset?: number },
      token?: string,
    ) => Promise<PlotListResponse>
  >();
const mockTrendingFn =
  vi.fn<(params?: { limit?: number }, token?: string) => Promise<PlotListResponse>>();
const mockPopularFn =
  vi.fn<(params?: { limit?: number }, token?: string) => Promise<PlotListResponse>>();
const mockLatestFn =
  vi.fn<(params?: { limit?: number }, token?: string) => Promise<PlotListResponse>>();

vi.mock("@/lib/api/repositories", () => ({
  plotRepository: {
    list: (...args: Parameters<typeof mockListFn>) => mockListFn(...args),
    trending: (...args: Parameters<typeof mockTrendingFn>) => mockTrendingFn(...args),
    popular: (...args: Parameters<typeof mockPopularFn>) => mockPopularFn(...args),
    latest: (...args: Parameters<typeof mockLatestFn>) => mockLatestFn(...args),
  },
}));

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: null,
    session: null,
    isLoading: false,
    isAuthenticated: false,
    signInWithGitHub: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    handleUnauthorized: vi.fn(),
  }),
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMockPlot } from "@/__tests__/helpers/mockData";
import PlotsPage from "../page";

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("PlotsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("tag");
    mockSearchParams.delete("sort");
  });

  it("デフォルトでtrendingタブが選択され、急上昇Plotを表示する", async () => {
    const items = [createMockPlot({ id: "plot-t1", title: "Trending Plot" })];
    mockTrendingFn.mockResolvedValue({ items, total: 1, limit: 20, offset: 0 });
    mockPopularFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    mockLatestFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    expect(screen.getByText("Plot 一覧")).toBeInTheDocument();
    expect(await screen.findByText("Trending Plot")).toBeInTheDocument();
  });

  it("trendingタブ選択時にpopular/latestのAPIが発火しない", async () => {
    const items = [createMockPlot({ id: "plot-t1", title: "Trending Plot" })];
    mockTrendingFn.mockResolvedValue({ items, total: 1, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    await screen.findByText("Trending Plot");

    expect(mockTrendingFn).toHaveBeenCalled();
    expect(mockPopularFn).not.toHaveBeenCalled();
    expect(mockLatestFn).not.toHaveBeenCalled();
  });

  it("sort=popularの場合、人気Plotを表示する", async () => {
    mockSearchParams.set("sort", "popular");
    const items = [createMockPlot({ id: "plot-p1", title: "Popular Plot" })];
    mockPopularFn.mockResolvedValue({ items, total: 1, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    expect(await screen.findByText("Popular Plot")).toBeInTheDocument();
  });

  it("sort=popularの場合、trending/latestのAPIが発火しない", async () => {
    mockSearchParams.set("sort", "popular");
    const items = [createMockPlot({ id: "plot-p1", title: "Popular Plot" })];
    mockPopularFn.mockResolvedValue({ items, total: 1, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    await screen.findByText("Popular Plot");

    expect(mockPopularFn).toHaveBeenCalled();
    expect(mockTrendingFn).not.toHaveBeenCalled();
    expect(mockLatestFn).not.toHaveBeenCalled();
  });

  it("sort=newの場合、新着Plotを表示する", async () => {
    mockSearchParams.set("sort", "new");
    const items = [createMockPlot({ id: "plot-n1", title: "New Plot" })];
    mockLatestFn.mockResolvedValue({ items, total: 1, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    expect(await screen.findByText("New Plot")).toBeInTheDocument();
  });

  it("sort=newの場合、trending/popularのAPIが発火しない", async () => {
    mockSearchParams.set("sort", "new");
    const items = [createMockPlot({ id: "plot-n1", title: "New Plot" })];
    mockLatestFn.mockResolvedValue({ items, total: 1, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    await screen.findByText("New Plot");

    expect(mockLatestFn).toHaveBeenCalled();
    expect(mockTrendingFn).not.toHaveBeenCalled();
    expect(mockPopularFn).not.toHaveBeenCalled();
  });

  it("結果が0件の場合はEmptyStateを表示する", async () => {
    mockTrendingFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    expect(await screen.findByText("Plotが見つかりませんでした")).toBeInTheDocument();
  });

  it("ソートタブが3つ表示される", async () => {
    mockTrendingFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    expect(screen.getByRole("tab", { name: "急上昇" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "人気" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "新着" })).toBeInTheDocument();
  });

  it("tagパラメータがある場合、タグフィルタモードで表示する", async () => {
    mockSearchParams.set("tag", "React");
    const items = [createMockPlot({ id: "plot-tag1", title: "React Plot" })];
    mockListFn.mockResolvedValue({ items, total: 1, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    expect(screen.getByText("タグ: React")).toBeInTheDocument();
    expect(await screen.findByText("React Plot")).toBeInTheDocument();
  });

  it("tagフィルタで結果が0件の場合はEmptyStateを表示する", async () => {
    mockSearchParams.set("tag", "存在しないタグ");
    mockListFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    expect(await screen.findByText("Plotが見つかりませんでした")).toBeInTheDocument();
    expect(screen.getByText("タグ: 存在しないタグ")).toBeInTheDocument();
  });

  it("tagフィルタで結果がPAGE_SIZEを超える場合はPaginationを表示する", async () => {
    mockSearchParams.set("tag", "多い");
    const items = Array.from({ length: 20 }, (_, i) =>
      createMockPlot({ id: `plot-${i}`, title: `Plot ${i}` }),
    );
    mockListFn.mockResolvedValue({ items, total: 42, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    expect(await screen.findByLabelText("ページネーション")).toBeInTheDocument();
  });

  it("tagフィルタで結果がPAGE_SIZE以下の場合はPaginationを表示しない", async () => {
    mockSearchParams.set("tag", "少ない");
    const items = [createMockPlot({ id: "plot-001", title: "唯一の結果" })];
    mockListFn.mockResolvedValue({ items, total: 1, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    expect(await screen.findByText("唯一の結果")).toBeInTheDocument();
    expect(screen.queryByLabelText("ページネーション")).not.toBeInTheDocument();
  });

  it("tagパラメータがある状態でソートタブを切り替えるとtagが削除される", async () => {
    const user = userEvent.setup();
    mockSearchParams.delete("tag");
    mockTrendingFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    mockPopularFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    mockLatestFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    await screen.findByText("Plotが見つかりませんでした");

    mockSearchParams.set("tag", "React");

    await user.click(screen.getByRole("tab", { name: "人気" }));

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("sort=popular"));
    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const pushedParams = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(pushedParams.has("tag")).toBe(false);
  });

  it("tagが変更されたときにoffsetが0にリセットされる", async () => {
    const user = userEvent.setup();
    mockSearchParams.set("tag", "React");
    const items = Array.from({ length: 20 }, (_, i) =>
      createMockPlot({ id: `plot-r${i}`, title: `React Plot ${i}` }),
    );
    mockListFn.mockResolvedValue({ items, total: 42, limit: 20, offset: 0 });

    const { rerender } = renderWithQuery(<PlotsPage />);

    await screen.findByText("React Plot 0");
    await user.click(screen.getByRole("button", { name: "2" }));

    mockListFn.mockClear();
    mockSearchParams.set("tag", "Vue");
    const vueItems = [createMockPlot({ id: "plot-v1", title: "Vue Plot" })];
    mockListFn.mockResolvedValue({ items: vueItems, total: 1, limit: 20, offset: 0 });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    rerender(
      <QueryClientProvider client={queryClient}>
        <PlotsPage />
      </QueryClientProvider>,
    );

    await screen.findByText("タグ: Vue");

    const resetCall = mockListFn.mock.calls.find(
      (call) => call[0]?.tag === "Vue" && call[0]?.offset === 0,
    );
    expect(resetCall).toBeDefined();
  });
});
