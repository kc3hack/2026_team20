import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlotResponse } from "@/lib/api/types";
import { PlotList } from "../PlotList";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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

  it("空配列の場合は何も表示されない", () => {
    const { container } = render(<PlotList items={[]} />);
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
