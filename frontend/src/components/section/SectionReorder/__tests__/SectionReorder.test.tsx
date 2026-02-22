import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SectionResponse } from "@/lib/api/types";
import { SectionReorder } from "../SectionReorder";

const mockSections: SectionResponse[] = [
  {
    id: "section-001",
    plotId: "plot-001",
    title: "第1章: 概要",
    content: { type: "doc", content: [] },
    orderIndex: 0,
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "section-002",
    plotId: "plot-001",
    title: "第2章: 仕様",
    content: { type: "doc", content: [] },
    orderIndex: 1,
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "section-003",
    plotId: "plot-001",
    title: "第3章: まとめ",
    content: { type: "doc", content: [] },
    orderIndex: 2,
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

describe("SectionReorder", () => {
  it("セクションが orderIndex 順にリスト表示される", () => {
    render(<SectionReorder sections={mockSections} onReorder={vi.fn()} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("第1章: 概要");
    expect(items[1]).toHaveTextContent("第2章: 仕様");
    expect(items[2]).toHaveTextContent("第3章: まとめ");
  });

  it("各セクションにドラッグハンドルが表示される", () => {
    render(<SectionReorder sections={mockSections} onReorder={vi.fn()} />);

    const handles = screen.getAllByRole("button", { name: /ドラッグ/ });
    expect(handles).toHaveLength(3);
  });

  it("セクションが空の場合、リストが空で表示される", () => {
    render(<SectionReorder sections={[]} onReorder={vi.fn()} />);

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("orderIndex が逆順で渡されてもソートされて表示される", () => {
    const reversed = [...mockSections].reverse();
    render(<SectionReorder sections={reversed} onReorder={vi.fn()} />);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("第1章: 概要");
    expect(items[1]).toHaveTextContent("第2章: 仕様");
    expect(items[2]).toHaveTextContent("第3章: まとめ");
  });

  it("セクションタイトルと orderIndex 番号が表示される", () => {
    render(<SectionReorder sections={mockSections} onReorder={vi.fn()} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("disabled が true の場合、ドラッグハンドルが無効になる", () => {
    render(<SectionReorder sections={mockSections} onReorder={vi.fn()} disabled={true} />);

    const handles = screen.getAllByRole("button", { name: /ドラッグ/ });
    for (const handle of handles) {
      expect(handle).toBeDisabled();
    }
  });
});
