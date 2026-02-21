import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMockPlot } from "@/__tests__/helpers/mockData";
import { PlotList } from "../PlotList";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("PlotList", () => {
  it("isLoading=true でSkeletonが3つ表示される", () => {
    const { container } = render(<PlotList items={[]} isLoading={true} />);
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons).toHaveLength(3);
  });

  it("isLoading=false でitemsの数だけPlotCardが表示される", () => {
    const items = [
      createMockPlot({ id: "plot-001", title: "Plot 1" }),
      createMockPlot({ id: "plot-002", title: "Plot 2" }),
    ];
    render(<PlotList items={items} />);
    expect(screen.getByText("Plot 1")).toBeInTheDocument();
    expect(screen.getByText("Plot 2")).toBeInTheDocument();
  });

  it("空配列の場合は空状態メッセージが表示される", () => {
    render(<PlotList items={[]} />);
    expect(screen.getByText("該当するPlotがありません")).toBeInTheDocument();
  });

  it("空配列かつshowEmptyState=falseの場合は何も表示されない", () => {
    const { container } = render(<PlotList items={[]} showEmptyState={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("isLoading=true の場合、itemsがあってもSkeletonが表示される", () => {
    const items = [createMockPlot()];
    const { container } = render(<PlotList items={items} isLoading={true} />);
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons).toHaveLength(3);
    // PlotCard のタイトルは表示されない
    expect(screen.queryByText("テスト用Plot")).not.toBeInTheDocument();
  });
});
