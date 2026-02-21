import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlotResponse } from "@/lib/api/types";
import { PlotSection } from "../PlotSection";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockPlots: PlotResponse[] = [
  {
    id: "plot-001",
    title: "テスト Plot 1",
    description: "説明文1",
    tags: ["React"],
    ownerId: "user-001",
    starCount: 10,
    isStarred: false,
    isPaused: false,
    thumbnailUrl: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "plot-002",
    title: "テスト Plot 2",
    description: "説明文2",
    tags: ["TypeScript"],
    ownerId: "user-002",
    starCount: 20,
    isStarred: false,
    isPaused: false,
    thumbnailUrl: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("PlotSection", () => {
  it("セクションタイトルが正しく表示される", () => {
    render(
      <PlotSection
        title="🔥 急上昇"
        plots={mockPlots}
        isLoading={false}
        moreHref="/plots?sort=trending"
      />,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("🔥 急上昇");
  });

  it("「もっと見る →」リンクが正しい href を持つ", () => {
    render(
      <PlotSection
        title="🔥 急上昇"
        plots={mockPlots}
        isLoading={false}
        moreHref="/plots?sort=trending"
      />,
    );
    const moreLink = screen.getByText("もっと見る →");
    expect(moreLink).toBeInTheDocument();
    expect(moreLink.closest("a")).toHaveAttribute("href", "/plots?sort=trending");
  });

  it("plots が渡されると PlotCard が表示される", () => {
    render(
      <PlotSection
        title="⭐ 人気"
        plots={mockPlots}
        isLoading={false}
        moreHref="/plots?sort=popular"
      />,
    );
    expect(screen.getByText("テスト Plot 1")).toBeInTheDocument();
    expect(screen.getByText("テスト Plot 2")).toBeInTheDocument();
  });

  it("isLoading=true のとき Skeleton が表示される（PlotList に委譲）", () => {
    const { container } = render(
      <PlotSection title="🆕 新着" plots={[]} isLoading={true} moreHref="/plots?sort=new" />,
    );
    // PlotList がローディング時に Skeleton を表示するため、
    // セクションタイトルは表示されつつ、PlotCard は表示されない
    expect(screen.getByText("🆕 新着")).toBeInTheDocument();
    expect(screen.queryByText("テスト Plot 1")).not.toBeInTheDocument();
    // Skeleton の存在を確認（data-slot="skeleton" は shadcn/ui の Skeleton が出力する属性）
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("plots が空配列のとき空状態メッセージが表示される", () => {
    render(
      <PlotSection title="⭐ 人気" plots={[]} isLoading={false} moreHref="/plots?sort=popular" />,
    );
    expect(screen.getByText("該当するPlotがありません")).toBeInTheDocument();
  });

  it("section 要素としてレンダリングされる", () => {
    const { container } = render(
      <PlotSection
        title="🔥 急上昇"
        plots={mockPlots}
        isLoading={false}
        moreHref="/plots?sort=trending"
      />,
    );
    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();
  });

  it("異なる moreHref が正しく反映される", () => {
    render(
      <PlotSection
        title="🆕 新着"
        plots={mockPlots}
        isLoading={false}
        moreHref="/plots?sort=new"
      />,
    );
    const moreLink = screen.getByText("もっと見る →");
    expect(moreLink.closest("a")).toHaveAttribute("href", "/plots?sort=new");
  });
});
