import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlotResponse } from "@/lib/api/types";
import { PlotCard } from "../PlotCard";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockPlot: PlotResponse = {
  id: "test-plot-001",
  title: "テスト用Plot",
  description: "これはテスト用の説明文です。",
  tags: ["TypeScript", "React"],
  ownerId: "user-001",
  starCount: 42,
  isStarred: false,
  isPaused: false,
  thumbnailUrl: null,
  version: 1,
  createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("PlotCard", () => {
  it("タイトルが正しく表示される", () => {
    render(<PlotCard plot={mockPlot} />);
    expect(screen.getByText("テスト用Plot")).toBeInTheDocument();
  });

  it("タイトルがh3見出しとしてレンダリングされる", () => {
    render(<PlotCard plot={mockPlot} />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("テスト用Plot");
  });

  it("説明文が正しく表示される", () => {
    render(<PlotCard plot={mockPlot} />);
    expect(screen.getByText("これはテスト用の説明文です。")).toBeInTheDocument();
  });

  it("タグが正しく表示される", () => {
    render(<PlotCard plot={mockPlot} />);
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("スター数が正しく表示される", () => {
    render(<PlotCard plot={mockPlot} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("リンク先が正しい (/plots/{id})", () => {
    render(<PlotCard plot={mockPlot} />);
    const links = screen.getAllByRole("link");
    // 最初のリンクがカード全体のリンク（/plots/{id}）
    const cardLink = links.find((link) => link.getAttribute("href") === "/plots/test-plot-001");
    expect(cardLink).toBeDefined();
  });

  it("説明文がnullの場合は表示されない", () => {
    const plotWithoutDescription: PlotResponse = {
      ...mockPlot,
      description: null,
    };
    render(<PlotCard plot={plotWithoutDescription} />);
    expect(screen.queryByText("これはテスト用の説明文です。")).not.toBeInTheDocument();
  });

  it("タグが空配列の場合はタグ領域が表示されない", () => {
    const plotWithoutTags: PlotResponse = {
      ...mockPlot,
      tags: [],
    };
    const { container } = render(<PlotCard plot={plotWithoutTags} />);
    // TagBadge がレンダリングされないことを確認
    expect(container.querySelectorAll("[data-slot='badge']")).toHaveLength(0);
  });

  it("作成日が相対時間で表示される", () => {
    render(<PlotCard plot={mockPlot} />);
    // date-fns ja locale: "約3時間前" のような形式
    const timeElement = screen.getByRole("time");
    expect(timeElement).toBeInTheDocument();
    expect(timeElement).toHaveAttribute("dateTime", mockPlot.createdAt);
  });

  it("createdAtが不正な文字列の場合「日時不明」と表示される", () => {
    const plotWithInvalidDate: PlotResponse = {
      ...mockPlot,
      createdAt: "invalid-date-string",
    };
    render(<PlotCard plot={plotWithInvalidDate} />);
    expect(screen.getByText("日時不明")).toBeInTheDocument();
  });

  it("createdAtが空文字の場合「日時不明」と表示される", () => {
    const plotWithEmptyDate: PlotResponse = {
      ...mockPlot,
      createdAt: "",
    };
    render(<PlotCard plot={plotWithEmptyDate} />);
    expect(screen.getByText("日時不明")).toBeInTheDocument();
  });
});
