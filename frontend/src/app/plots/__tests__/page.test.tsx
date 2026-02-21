import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlotListResponse, PlotResponse } from "@/lib/api/types";

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
import PlotsPage from "../page";

const createMockPlot = (overrides: Partial<PlotResponse> = {}): PlotResponse => ({
  id: "plot-001",
  title: "テスト用Plot",
  description: "テスト用の説明文です。",
  tags: ["TypeScript"],
  ownerId: "user-001",
  starCount: 10,
  isStarred: false,
  isPaused: false,
  thumbnailUrl: null,
  version: 1,
  createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

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

  it("sort=popularの場合、人気Plotを表示する", async () => {
    mockSearchParams.set("sort", "popular");
    const items = [createMockPlot({ id: "plot-p1", title: "Popular Plot" })];
    mockTrendingFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    mockPopularFn.mockResolvedValue({ items, total: 1, limit: 20, offset: 0 });
    mockLatestFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    expect(await screen.findByText("Popular Plot")).toBeInTheDocument();
  });

  it("sort=newの場合、新着Plotを表示する", async () => {
    mockSearchParams.set("sort", "new");
    const items = [createMockPlot({ id: "plot-n1", title: "New Plot" })];
    mockTrendingFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    mockPopularFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    mockLatestFn.mockResolvedValue({ items, total: 1, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    expect(await screen.findByText("New Plot")).toBeInTheDocument();
  });

  it("結果が0件の場合はEmptyStateを表示する", async () => {
    mockTrendingFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    mockPopularFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    mockLatestFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });

    renderWithQuery(<PlotsPage />);

    expect(await screen.findByText("Plotが見つかりませんでした")).toBeInTheDocument();
  });

  it("ソートタブが3つ表示される", async () => {
    mockTrendingFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    mockPopularFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    mockLatestFn.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });

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
});
