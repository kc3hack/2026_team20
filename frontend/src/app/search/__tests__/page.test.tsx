import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PlotResponse, SearchResponse } from "@/lib/api/types";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

const mockSearchFn = vi.fn<
  (
    params: { q: string; limit?: number; offset?: number },
    token?: string,
  ) => Promise<SearchResponse>
>();
vi.mock("@/lib/api/repositories", () => ({
  searchRepository: {
    search: (...args: Parameters<typeof mockSearchFn>) => mockSearchFn(...args),
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
import SearchPage from "../page";

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
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("SearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("q");
  });

  it("クエリがない場合はEmptyStateを表示する", () => {
    renderWithQuery(<SearchPage />);
    expect(screen.getByText("検索キーワードを入力してください")).toBeInTheDocument();
  });

  it("検索結果が0件の場合は「見つかりませんでした」を表示する", async () => {
    mockSearchParams.set("q", "存在しないキーワード");
    mockSearchFn.mockResolvedValue({ items: [], total: 0, query: "存在しないキーワード" });

    renderWithQuery(<SearchPage />);

    expect(await screen.findByText("見つかりませんでした")).toBeInTheDocument();
    expect(
      screen.getByText(/存在しないキーワード/),
    ).toBeInTheDocument();
  });

  it("検索結果がある場合はPlotListと件数を表示する", async () => {
    mockSearchParams.set("q", "テスト");
    const items = [
      createMockPlot({ id: "plot-001", title: "Plot Alpha" }),
      createMockPlot({ id: "plot-002", title: "Plot Beta" }),
    ];
    mockSearchFn.mockResolvedValue({ items, total: 2, query: "テスト" });

    renderWithQuery(<SearchPage />);

    expect(await screen.findByText("Plot Alpha")).toBeInTheDocument();
    expect(screen.getByText("Plot Beta")).toBeInTheDocument();
    expect(screen.getByText(/2 件/)).toBeInTheDocument();
  });

  it("結果が20件を超える場合はPaginationが表示される", async () => {
    mockSearchParams.set("q", "多い");
    const items = Array.from({ length: 20 }, (_, i) =>
      createMockPlot({ id: `plot-${i}`, title: `Plot ${i}` }),
    );
    mockSearchFn.mockResolvedValue({ items, total: 42, query: "多い" });

    renderWithQuery(<SearchPage />);

    expect(await screen.findByLabelText("ページネーション")).toBeInTheDocument();
    expect(screen.getByText(/42 件/)).toBeInTheDocument();
  });

  it("結果がPAGE_SIZE以下の場合はPaginationが表示されない", async () => {
    mockSearchParams.set("q", "少ない");
    const items = [createMockPlot({ id: "plot-001", title: "唯一の結果" })];
    mockSearchFn.mockResolvedValue({ items, total: 1, query: "少ない" });

    renderWithQuery(<SearchPage />);

    expect(await screen.findByText("唯一の結果")).toBeInTheDocument();
    expect(screen.queryByLabelText("ページネーション")).not.toBeInTheDocument();
  });

  it("ページネーションクリックで次ページのデータを取得する", async () => {
    mockSearchParams.set("q", "ページ");
    const firstPageItems = Array.from({ length: 20 }, (_, i) =>
      createMockPlot({ id: `plot-${i}`, title: `Plot Page1-${i}` }),
    );
    mockSearchFn.mockResolvedValue({
      items: firstPageItems,
      total: 40,
      query: "ページ",
    });

    renderWithQuery(<SearchPage />);

    expect(await screen.findByText("Plot Page1-0")).toBeInTheDocument();

    const secondPageItems = Array.from({ length: 20 }, (_, i) =>
      createMockPlot({ id: `plot-page2-${i}`, title: `Plot Page2-${i}` }),
    );
    mockSearchFn.mockResolvedValue({
      items: secondPageItems,
      total: 40,
      query: "ページ",
    });

    const page2Button = screen.getByRole("button", { name: "2" });
    fireEvent.click(page2Button);

    expect(await screen.findByText("Plot Page2-0")).toBeInTheDocument();
  });
});
