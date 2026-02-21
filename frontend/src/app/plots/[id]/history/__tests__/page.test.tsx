import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlotDetailResponse } from "@/lib/api/types";
import { mockSections } from "@/mocks/data/sections";
import { mockUsers } from "@/mocks/data/users";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "plot-001" }),
}));

const mockPlotDetail: PlotDetailResponse = {
  id: "plot-001",
  title: "空飛ぶ自動販売機",
  description: "テスト用",
  tags: ["テクノロジー"],
  ownerId: mockUsers.owner.id,
  starCount: 42,
  isStarred: false,
  isPaused: false,
  thumbnailUrl: null,
  version: 3,
  createdAt: "2026-02-10T00:00:00Z",
  updatedAt: "2026-02-18T12:00:00Z",
  sections: mockSections.filter((s) => s.plotId === "plot-001"),
  owner: {
    id: mockUsers.owner.id,
    displayName: mockUsers.owner.displayName,
    avatarUrl: mockUsers.owner.avatarUrl,
  },
};

let mockUsePlotDetailReturn: {
  data: PlotDetailResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

vi.mock("@/hooks/usePlots", () => ({
  usePlotDetail: () => mockUsePlotDetailReturn,
}));

let mockAuthUser: { id: string; email: string; displayName: string; avatarUrl: string | null; createdAt: string } | null =
  null;

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    session: mockAuthUser ? { access_token: "test-token" } : null,
    isLoading: false,
    isAuthenticated: !!mockAuthUser,
    signInWithGitHub: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    handleUnauthorized: vi.fn(),
  }),
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PlotHistoryPage from "../page";

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("PlotHistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePlotDetailReturn = {
      data: mockPlotDetail,
      isLoading: false,
      isError: false,
      error: null,
    };
    mockAuthUser = null;
  });

  it("ローディング中はスケルトンを表示する", () => {
    mockUsePlotDetailReturn = {
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    };

    renderWithQuery(<PlotHistoryPage />);

    expect(screen.queryByText("履歴")).not.toBeInTheDocument();
  });

  it("エラー時はエラーメッセージと戻るリンクを表示する", () => {
    mockUsePlotDetailReturn = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Not found"),
    };

    renderWithQuery(<PlotHistoryPage />);

    expect(screen.getByText("Not found")).toBeInTheDocument();
    expect(screen.getByText("Plot に戻る")).toBeInTheDocument();
  });

  it("Plot のタイトルとセクション選択ドロップダウンを表示する", () => {
    renderWithQuery(<PlotHistoryPage />);

    expect(screen.getByText("履歴")).toBeInTheDocument();
    expect(screen.getByText("空飛ぶ自動販売機")).toBeInTheDocument();
    expect(screen.getByTestId("section-selector")).toBeInTheDocument();
    expect(screen.getByText("セクションを選択")).toBeInTheDocument();
  });

  it("セクション未選択時は「セクションを選択してください」を表示する", () => {
    renderWithQuery(<PlotHistoryPage />);

    expect(screen.getByText("セクションを選択してください")).toBeInTheDocument();
  });

  it("編集履歴パネルとスナップショットパネルを表示する", () => {
    renderWithQuery(<PlotHistoryPage />);

    expect(screen.getByLabelText("編集履歴")).toBeInTheDocument();
    expect(screen.getByLabelText("スナップショット")).toBeInTheDocument();
  });

  it("所有者でないユーザーには監査ログセクションを表示しない", () => {
    mockAuthUser = {
      id: mockUsers.viewer.id,
      email: mockUsers.viewer.email,
      displayName: mockUsers.viewer.displayName,
      avatarUrl: mockUsers.viewer.avatarUrl,
      createdAt: "2026-01-01T00:00:00Z",
    };

    renderWithQuery(<PlotHistoryPage />);

    expect(screen.queryByLabelText("ロールバック監査ログ")).not.toBeInTheDocument();
  });

  it("所有者には監査ログセクションを表示する", () => {
    mockAuthUser = {
      id: mockUsers.owner.id,
      email: mockUsers.owner.email,
      displayName: mockUsers.owner.displayName,
      avatarUrl: mockUsers.owner.avatarUrl,
      createdAt: "2026-01-01T00:00:00Z",
    };

    renderWithQuery(<PlotHistoryPage />);

    expect(screen.getByLabelText("ロールバック監査ログ")).toBeInTheDocument();
    expect(screen.getByText("ロールバック監査ログ")).toBeInTheDocument();
  });

  it("Plot詳細ページへの戻るリンクが正しいhrefを持つ", () => {
    renderWithQuery(<PlotHistoryPage />);

    const backLink = screen.getByRole("link", { name: "Plot に戻る" });
    expect(backLink).toHaveAttribute("href", "/plots/plot-001");
  });

  it("スナップショットパネルにSnapshotListコンポーネントが表示される", () => {
    renderWithQuery(<PlotHistoryPage />);

    expect(screen.getByLabelText("スナップショット")).toBeInTheDocument();
  });
});
