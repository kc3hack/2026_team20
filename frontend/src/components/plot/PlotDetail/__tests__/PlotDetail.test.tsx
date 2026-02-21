import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlotDetailResponse } from "@/lib/api/types";
import { PlotDetail } from "../PlotDetail";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: false })),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockCreateThread = vi.fn().mockResolvedValue({
  id: "mock-thread-id",
  plotId: "plot-001",
  sectionId: null,
  commentCount: 0,
  createdAt: "2026-02-20T00:00:00Z",
});

vi.mock("@/hooks/useComments", () => ({
  useComments: vi.fn(() => ({ comments: [], total: 0, isLoading: false, error: null })),
  useCreateThread: vi.fn(() => ({ createThread: mockCreateThread, isPending: false })),
}));

vi.mock("@/components/sns/StarButton/StarButton", () => ({
  StarButton: ({ plotId, initialCount }: { plotId: string; initialCount: number }) => (
    <button type="button" data-testid="star-button" data-plot-id={plotId}>
      {initialCount}
    </button>
  ),
}));

vi.mock("@/components/sns/ForkButton/ForkButton", () => ({
  ForkButton: ({ plotId }: { plotId: string }) => (
    <button type="button" data-testid="fork-button" data-plot-id={plotId}>
      フォーク
    </button>
  ),
}));

vi.mock("@/components/sns/CommentForm/CommentForm", () => ({
  CommentForm: () => <div data-testid="comment-form" />,
}));

vi.mock("@/components/sns/CommentThread/CommentThread", () => ({
  CommentThread: () => <div data-testid="comment-thread" />,
}));

const mockCreateMutate = vi.fn();
vi.mock("@/hooks/useSections", () => ({
  useCreateSection: vi.fn(() => ({ mutate: mockCreateMutate, isPending: false })),
  useUpdateSection: vi.fn(() => ({ mutate: vi.fn() })),
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

vi.mock("@/hooks/useRealtimeSection", () => ({
  useRealtimeSection: vi.fn(() => ({
    liveContent: null,
    connectionStatus: "disconnected",
  })),
}));

import { useAuth } from "@/hooks/useAuth";

const basePlot: PlotDetailResponse = {
  id: "plot-001",
  title: "テストプロット",
  description: "テスト用の説明文です。",
  tags: ["テスト", "開発"],
  ownerId: "user-001",
  starCount: 42,
  isStarred: false,
  isPaused: false,
  thumbnailUrl: null,
  version: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  sections: [
    {
      id: "section-001",
      plotId: "plot-001",
      title: "概要",
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "内容" }] }],
      },
      orderIndex: 0,
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
  owner: {
    id: "user-001",
    displayName: "テストオーナー",
    avatarUrl: null,
  },
};

describe("PlotDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateThread.mockResolvedValue({
      id: "mock-thread-id",
      plotId: "plot-001",
      sectionId: null,
      commentCount: 0,
      createdAt: "2026-02-20T00:00:00Z",
    });
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);
  });

  it("タイトルが正しく表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("テストプロット");
  });

  it("説明文が表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    expect(screen.getByText("テスト用の説明文です。")).toBeInTheDocument();
  });

  it("タグが表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    expect(screen.getByText("テスト")).toBeInTheDocument();
    expect(screen.getByText("開発")).toBeInTheDocument();
  });

  it("オーナー名が表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    expect(screen.getByText("テストオーナー")).toBeInTheDocument();
  });

  it("スター数が表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    expect(screen.getAllByText("42").length).toBeGreaterThanOrEqual(1);
  });

  it("作成日が相対時間で表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    const statsArea = screen.getAllByText("42")[0].parentElement?.parentElement;
    expect(statsArea?.textContent).toContain("前");
  });

  it("createdAt が不正な場合、日時不明を表示する", () => {
    render(<PlotDetail plot={{ ...basePlot, createdAt: "invalid-date" }} />);

    expect(screen.getByText("日時不明")).toBeInTheDocument();
  });

  it("isPaused が true の場合、一時停止バナーが表示される", () => {
    render(<PlotDetail plot={{ ...basePlot, isPaused: true }} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("⚠️ 編集一時停止中")).toBeInTheDocument();
  });

  it("isPaused が false の場合、一時停止バナーが表示されない", () => {
    render(<PlotDetail plot={basePlot} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("目次が表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    expect(screen.getByRole("navigation", { name: "目次" })).toBeInTheDocument();
  });

  it("description が null の場合、説明文が表示されない", () => {
    render(<PlotDetail plot={{ ...basePlot, description: null }} />);

    expect(screen.queryByText("テスト用の説明文です。")).not.toBeInTheDocument();
  });

  it("owner が null の場合、オーナー情報が表示されない", () => {
    render(<PlotDetail plot={{ ...basePlot, owner: null }} />);

    expect(screen.queryByText("テストオーナー")).not.toBeInTheDocument();
  });

  describe("未ログイン時", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);
    });

    it("セクションが SectionList 経由で表示される", () => {
      render(<PlotDetail plot={basePlot} />);

      expect(screen.getByRole("heading", { level: 2, name: "概要" })).toBeInTheDocument();
    });

    it("セクション追加ボタンが表示されない", () => {
      render(<PlotDetail plot={basePlot} />);

      expect(screen.queryByRole("button", { name: /セクション追加/ })).not.toBeInTheDocument();
    });

    it("編集するボタンが表示されない", () => {
      render(<PlotDetail plot={basePlot} />);

      expect(screen.queryByRole("button", { name: /編集する/ })).not.toBeInTheDocument();
    });
  });

  describe("ログイン済み時", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    });

    it("SectionEditor が各セクションに表示される", () => {
      render(<PlotDetail plot={basePlot} />);

      expect(screen.getByRole("button", { name: /編集する/ })).toBeInTheDocument();
    });

    it("セクションタイトルが表示される", () => {
      render(<PlotDetail plot={basePlot} />);

      expect(screen.getByRole("heading", { level: 2, name: "概要" })).toBeInTheDocument();
    });

    it("セクション追加ボタンが表示される", () => {
      render(<PlotDetail plot={basePlot} />);

      expect(screen.getByRole("button", { name: /セクション追加/ })).toBeInTheDocument();
    });

    it("セクション追加ボタンを押すと createSection.mutate が呼ばれる", () => {
      render(<PlotDetail plot={basePlot} />);

      fireEvent.click(screen.getByRole("button", { name: /セクション追加/ }));

      expect(mockCreateMutate).toHaveBeenCalledWith({
        plotId: "plot-001",
        body: { title: "新しいセクション 2" },
      });
    });

    it("isPaused 時はセクション追加ボタンが表示されない", () => {
      render(<PlotDetail plot={{ ...basePlot, isPaused: true }} />);

      expect(screen.queryByRole("button", { name: /セクション追加/ })).not.toBeInTheDocument();
    });
  });

  it("StarButton が表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    const starButton = screen.getByTestId("star-button");
    expect(starButton).toBeInTheDocument();
    expect(starButton).toHaveTextContent("42");
  });

  it("ForkButton が表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    expect(screen.getByTestId("fork-button")).toBeInTheDocument();
    expect(screen.getByTestId("fork-button")).toHaveTextContent("フォーク");
  });

  it("コメントセクションのヘッダーが表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    expect(screen.getByRole("heading", { level: 2, name: "コメント" })).toBeInTheDocument();
  });

  it("マウント時にスレッドが自動作成され、コメント欄が常時表示される", async () => {
    render(<PlotDetail plot={basePlot} />);

    // useEffect でスレッドが自動作成される
    expect(mockCreateThread).toHaveBeenCalledWith("plot-001");

    // スレッド作成後、CommentForm と CommentThread が表示される
    await waitFor(() => {
      expect(screen.getByTestId("comment-form")).toBeInTheDocument();
      expect(screen.getByTestId("comment-thread")).toBeInTheDocument();
    });
  });

  it("スレッド作成に失敗した場合、エラートーストが表示される", async () => {
    mockCreateThread.mockRejectedValueOnce(new Error("Network error"));
    render(<PlotDetail plot={basePlot} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("コメントスレッドの読み込みに失敗しました");
    });
  });
});
