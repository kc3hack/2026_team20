import { fireEvent, render, screen } from "@testing-library/react";
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
  toast: { error: vi.fn() },
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

    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("作成日が相対時間で表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    const statsArea = screen.getByText("42").parentElement?.parentElement;
    expect(statsArea?.textContent).toContain("前");
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

  it("セクションが表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    expect(screen.getByRole("heading", { level: 2, name: "概要" })).toBeInTheDocument();
  });

  it("description が null の場合、説明文が表示されない", () => {
    render(<PlotDetail plot={{ ...basePlot, description: null }} />);

    expect(screen.queryByText("テスト用の説明文です。")).not.toBeInTheDocument();
  });

  it("owner が null の場合、オーナー情報が表示されない", () => {
    render(<PlotDetail plot={{ ...basePlot, owner: null }} />);

    expect(screen.queryByText("テストオーナー")).not.toBeInTheDocument();
  });

  it("編集ボタンが表示される", () => {
    render(<PlotDetail plot={basePlot} />);

    expect(screen.getByRole("button", { name: /編集する/ })).toBeInTheDocument();
  });

  it("未ログインで編集ボタンを押すと toast + ログインページ遷移", () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);
    render(<PlotDetail plot={basePlot} />);

    fireEvent.click(screen.getByRole("button", { name: /編集する/ }));

    expect(toast.error).toHaveBeenCalledWith("編集するにはログインが必要です");
    expect(mockPush).toHaveBeenCalledWith("/auth/login?redirectTo=/plots/plot-001");
  });

  it("ログイン済みで編集ボタンを押しても遷移しない (Issue #9 TODO)", () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    render(<PlotDetail plot={basePlot} />);

    fireEvent.click(screen.getByRole("button", { name: /編集する/ }));

    expect(toast.error).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
