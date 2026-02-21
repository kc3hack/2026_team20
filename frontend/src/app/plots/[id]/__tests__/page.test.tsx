import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlotDetailResponse } from "@/lib/api/types";

const mockNotFound = vi.fn();
vi.mock("@/lib/api/repositories/plotRepository", () => ({
  get: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: "test-access-token" } },
      })),
    },
  })),
}));

vi.mock("next/navigation", () => ({
  notFound: (...args: unknown[]) => mockNotFound(...args),
  useParams: vi.fn(() => ({ id: "plot-001" })),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: false })),
}));

vi.mock("@/hooks/usePlots", () => ({
  usePlotDetail: vi.fn(),
}));

vi.mock("@/hooks/usePlotRealtime", () => ({
  usePlotRealtime: vi.fn(() => ({
    ydoc: null,
    provider: null,
    awareness: null,
    lockStates: new Map(),
    connectionStatus: "disconnected",
  })),
}));

vi.mock("@/hooks/useSectionLock", () => ({
  useSectionLock: vi.fn(() => ({
    lockState: "unlocked",
    lockedBy: null,
    acquireLock: vi.fn(async () => true),
    releaseLock: vi.fn(),
  })),
}));

vi.mock("@/hooks/useSections", () => ({
  useCreateSection: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateSection: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock("@/hooks/useRealtimeSection", () => ({
  useRealtimeSection: vi.fn(() => ({
    liveContent: null,
    connectionStatus: "disconnected",
  })),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/hooks/useComments", () => ({
  useComments: vi.fn(() => ({ comments: [], total: 0, isLoading: false, error: null })),
  useCreateThread: vi.fn(() => ({
    createThread: vi.fn().mockResolvedValue({ id: "thread-001" }),
    isPending: false,
  })),
}));

vi.mock("@/components/sns/StarButton/StarButton", () => ({
  StarButton: () => <div data-testid="star-button" />,
}));

vi.mock("@/components/sns/ForkButton/ForkButton", () => ({
  ForkButton: () => <div data-testid="fork-button" />,
}));

vi.mock("@/components/sns/CommentForm/CommentForm", () => ({
  CommentForm: () => <div data-testid="comment-form" />,
}));

vi.mock("@/components/sns/CommentThread/CommentThread", () => ({
  CommentThread: () => <div data-testid="comment-thread" />,
}));

import { useParams } from "next/navigation";
import { usePlotDetail } from "@/hooks/usePlots";
import PlotDetailPage from "../page";

const mockPlot: PlotDetailResponse = {
  id: "plot-001",
  title: "テスト Plot",
  description: "テスト用の説明",
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
    displayName: "テストオーナー",
    avatarUrl: null,
  },
};

describe("PlotDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ id: "plot-001" });
  });

  it("正常なIDでPlotDetailが表示される", () => {
    vi.mocked(usePlotDetail).mockReturnValue({
      data: mockPlot,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePlotDetail>);

    render(<PlotDetailPage />);

    expect(screen.getByText("テスト Plot")).toBeInTheDocument();
    expect(plotRepository.get).toHaveBeenCalledWith("plot-001", "test-access-token");
  });

  it("ローディング中にスケルトンが表示される", () => {
    vi.mocked(usePlotDetail).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof usePlotDetail>);

    render(<PlotDetailPage />);

    expect(screen.getByTestId("plot-detail-skeleton")).toBeInTheDocument();
  });

  it("エラー時に notFound() が呼ばれる", () => {
    vi.mocked(usePlotDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Not Found"),
    } as ReturnType<typeof usePlotDetail>);

    render(<PlotDetailPage />);

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("data が undefined の場合 notFound() が呼ばれる", () => {
    vi.mocked(usePlotDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePlotDetail>);

    render(<PlotDetailPage />);

    expect(plotRepository.get).toHaveBeenCalledWith("plot-002", "test-access-token");
  });
});
