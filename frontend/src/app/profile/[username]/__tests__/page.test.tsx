import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlotListResponse, UserProfileResponse } from "@/lib/api/types";

const mockGetUserProfile = vi.fn();
const mockGetUserPlots = vi.fn();
const mockGetUserContributions = vi.fn();

vi.mock("@/lib/api/repositories", () => ({
  authRepository: {
    getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
    getUserPlots: (...args: unknown[]) => mockGetUserPlots(...args),
    getUserContributions: (...args: unknown[]) => mockGetUserContributions(...args),
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

vi.mock("next/navigation", () => ({
  useParams: () => ({ username: "tanaka" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import ProfilePage from "../page";

const mockProfile: UserProfileResponse = {
  id: "user-001",
  displayName: "田中太郎",
  avatarUrl: "https://example.com/avatar.png",
  plotCount: 10,
  contributionCount: 50,
  createdAt: "2026-01-15T09:00:00Z",
};

const mockPlotsData: PlotListResponse = {
  items: [
    {
      id: "plot-001",
      title: "空飛ぶ自動販売機",
      description: "テスト用の説明",
      tags: ["テスト"],
      ownerId: "user-001",
      starCount: 42,
      isStarred: false,
      isPaused: false,
      thumbnailUrl: null,
      version: 1,
      createdAt: "2026-02-10T00:00:00Z",
      updatedAt: "2026-02-18T12:00:00Z",
    },
  ],
  total: 1,
  limit: 20,
  offset: 0,
};

const mockContributionsData: PlotListResponse = {
  items: [
    {
      id: "plot-contrib-001",
      title: "猫語翻訳イヤホン",
      description: "コントリビューションのテスト",
      tags: ["動物"],
      ownerId: "user-002",
      starCount: 128,
      isStarred: true,
      isPaused: false,
      thumbnailUrl: null,
      version: 7,
      createdAt: "2026-01-28T09:00:00Z",
      updatedAt: "2026-02-19T15:00:00Z",
    },
  ],
  total: 1,
  limit: 20,
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

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserProfile.mockResolvedValue(mockProfile);
    mockGetUserPlots.mockResolvedValue(mockPlotsData);
    mockGetUserContributions.mockResolvedValue(mockContributionsData);
  });

  it("プロフィール情報が正しく表示される", async () => {
    render(<ProfilePage />, { wrapper: createWrapper() });

    expect(await screen.findByText("田中太郎")).toBeInTheDocument();
    expect(screen.getByText("2026年01月15日 に参加")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("「作成した Plot」タブにPlotが表示される", async () => {
    render(<ProfilePage />, { wrapper: createWrapper() });

    expect(await screen.findByText("空飛ぶ自動販売機")).toBeInTheDocument();
  });

  it("タブ切り替えで「コントリビューション」のデータが表示される", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />, { wrapper: createWrapper() });

    await screen.findByText("田中太郎");

    const contributionsTab = screen.getByRole("tab", { name: "コントリビューション" });
    await user.click(contributionsTab);

    expect(await screen.findByText("猫語翻訳イヤホン")).toBeInTheDocument();
  });

  it("ユーザーが見つからない場合は404が表示される", async () => {
    mockGetUserProfile.mockRejectedValue(new Error("Not Found"));

    render(<ProfilePage />, { wrapper: createWrapper() });

    expect(await screen.findByText("404")).toBeInTheDocument();
    expect(screen.getByText("ユーザーが見つかりません")).toBeInTheDocument();
  });

  it("ローディング中はスケルトンが表示される", () => {
    mockGetUserProfile.mockReturnValue(new Promise(() => {}));

    const { container } = render(<ProfilePage />, { wrapper: createWrapper() });

    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
