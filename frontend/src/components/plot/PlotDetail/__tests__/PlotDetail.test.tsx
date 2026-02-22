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
const mockDeleteMutateAsync = vi.fn();
vi.mock("@/hooks/useSections", () => ({
  useCreateSection: vi.fn(() => ({ mutate: mockCreateMutate, isPending: false })),
  useUpdateSection: vi.fn(() => ({ mutate: vi.fn() })),
  useDeleteSection: vi.fn(() => ({ mutateAsync: mockDeleteMutateAsync, isPending: false })),
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

const multiSectionPlot: PlotDetailResponse = {
  ...basePlot,
  sections: [
    basePlot.sections[0],
    {
      id: "section-002",
      plotId: "plot-001",
      title: "中盤",
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "中盤の内容" }] }],
      },
      orderIndex: 1,
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
};

describe("PlotDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const storage: Record<string, string> = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
        clear: () => {
          Object.keys(storage).forEach((key) => delete storage[key]);
        },
      },
      configurable: true,
    });
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

  it("StarButton にスター数が表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    expect(screen.getByTestId("star-button")).toHaveTextContent("42");
  });

  it("作成日が相対時間で表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    expect(screen.getByText(/前/)).toBeInTheDocument();
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

    it("リアルタイム接続インジケータが表示されない", () => {
      render(<PlotDetail plot={basePlot} />);

      expect(screen.queryByTestId("connection-indicator")).not.toBeInTheDocument();
    });

    it("セクションが表示される", () => {
      render(<PlotDetail plot={basePlot} />);

      expect(screen.getByRole("heading", { level: 2, name: "概要" })).toBeInTheDocument();
    });

    it("セクション追加ボタンが表示される", () => {
      render(<PlotDetail plot={basePlot} />);

      expect(screen.getByRole("button", { name: /セクション追加/ })).toBeInTheDocument();
    });

    it("編集するボタンが表示される", () => {
      render(<PlotDetail plot={basePlot} />);

      expect(screen.getByRole("button", { name: /編集する/ })).toBeInTheDocument();
    });

    it("編集するボタンを押すとログインページへ遷移する", () => {
      render(<PlotDetail plot={basePlot} />);

      fireEvent.click(screen.getByRole("button", { name: /編集する/ }));

      expect(toast.error).toHaveBeenCalledWith("編集するにはログインが必要です");
      expect(mockPush).toHaveBeenCalledWith("/auth/login?redirectTo=/plots/plot-001");
    });

    it("セクション追加ボタンを押すとログインページへ遷移する", () => {
      render(<PlotDetail plot={basePlot} />);

      fireEvent.click(screen.getByRole("button", { name: /セクション追加/ }));

      expect(toast.error).toHaveBeenCalledWith("セクションを追加するにはログインが必要です");
      expect(mockPush).toHaveBeenCalledWith("/auth/login?redirectTo=/plots/plot-001");
    });

    it("削除ボタンが表示され、押すとログインページへ遷移する", () => {
      render(<PlotDetail plot={basePlot} />);

      fireEvent.click(screen.getByRole("button", { name: "削除" }));
      fireEvent.click(screen.getByRole("button", { name: "削除する" }));

      expect(toast.error).toHaveBeenCalledWith("セクションを削除するにはログインが必要です");
      expect(mockPush).toHaveBeenCalledWith("/auth/login?redirectTo=/plots/plot-001");
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
        body: { title: "新しいセクション 2", orderIndex: 1 },
      });
    });

    it("セクション間の挿入ボタンを押すと途中位置で createSection.mutate が呼ばれる", () => {
      render(<PlotDetail plot={multiSectionPlot} />);

      fireEvent.click(screen.getByRole("button", { name: /ここにセクションを挿入/ }));

      expect(mockCreateMutate).toHaveBeenCalledWith({
        plotId: "plot-001",
        body: { title: "新しいセクション 3", orderIndex: 1 },
      });
    });

    it("先頭挿入ボタンを押すと orderIndex 0 で createSection.mutate が呼ばれる", () => {
      render(<PlotDetail plot={multiSectionPlot} />);

      fireEvent.click(screen.getByRole("button", { name: /先頭にセクションを挿入/ }));

      expect(mockCreateMutate).toHaveBeenCalledWith({
        plotId: "plot-001",
        body: { title: "新しいセクション 3", orderIndex: 0 },
      });
    });

    it("isPaused 時はセクション追加ボタンが表示されない", () => {
      render(<PlotDetail plot={{ ...basePlot, isPaused: true }} />);

      expect(screen.queryByRole("button", { name: /セクション追加/ })).not.toBeInTheDocument();
    });

    it("削除ダイアログで削除するを押すと deleteSection.mutateAsync が呼ばれる", async () => {
      render(<PlotDetail plot={basePlot} />);

      fireEvent.click(screen.getByRole("button", { name: "削除" }));
      fireEvent.click(screen.getByRole("button", { name: "削除する" }));

      await waitFor(() => {
        expect(mockDeleteMutateAsync).toHaveBeenCalledWith({
          plotId: "plot-001",
          sectionId: "section-001",
        });
      });
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

  it("ログイン済みで保存済み threadId がない場合、スレッドを作成してコメント欄を表示する", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    render(<PlotDetail plot={basePlot} />);

    expect(mockCreateThread).toHaveBeenCalledWith("plot-001");
    await waitFor(() => {
      expect(window.localStorage.getItem("plot-comment-thread:plot-001")).toBe("mock-thread-id");
    });

    await waitFor(() => {
      expect(screen.getByTestId("comment-form")).toBeInTheDocument();
      expect(screen.getByTestId("comment-thread")).toBeInTheDocument();
    });
  });

  it("保存済み threadId がある場合、スレッドを新規作成しない", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    window.localStorage.setItem("plot-comment-thread:plot-001", "saved-thread-id");
    render(<PlotDetail plot={basePlot} />);

    expect(mockCreateThread).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByTestId("comment-form")).toBeInTheDocument();
      expect(screen.getByTestId("comment-thread")).toBeInTheDocument();
    });
  });

  it("未ログインかつ保存済み threadId がない場合、案内メッセージを表示する", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);
    render(<PlotDetail plot={basePlot} />);

    expect(mockCreateThread).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(
        screen.getByText("ログインをしないとコメント表示ができません。"),
      ).toBeInTheDocument();
    });
  });

  it("スレッド作成に失敗した場合、エラートーストが表示される", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    mockCreateThread.mockRejectedValueOnce(new Error("Network error"));
    render(<PlotDetail plot={basePlot} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("コメントスレッドの読み込みに失敗しました");
    });
  });
});
