import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SectionResponse } from "@/lib/api/types";
import { SectionList } from "../SectionList";

const mockSections: SectionResponse[] = [
  {
    id: "section-002",
    plotId: "plot-001",
    title: "仕様",
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "仕様内容" }] }],
    },
    orderIndex: 1,
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "section-001",
    plotId: "plot-001",
    title: "概要",
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "概要内容" }] }],
    },
    orderIndex: 0,
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

describe("SectionList", () => {
  it("セクションが orderIndex 順にソートされて表示される", () => {
    render(<SectionList sections={mockSections} />);

    const titles = screen.getAllByRole("heading", { level: 2 });
    expect(titles[0]).toHaveTextContent("概要");
    expect(titles[1]).toHaveTextContent("仕様");
  });

  it("isLoading が true の場合、ローディング表示がされる", () => {
    render(<SectionList sections={[]} isLoading={true} />);

    expect(screen.getByTestId("section-list-loading")).toBeInTheDocument();
  });

  it("セクションが空の場合、何も表示されない", () => {
    const { container } = render(<SectionList sections={[]} />);

    expect(container.querySelector("h2")).toBeNull();
  });

  it("content が null のセクションでもタイトルは表示される", () => {
    const sectionsWithNull: SectionResponse[] = [
      {
        ...mockSections[0],
        content: null,
      },
    ];

    render(<SectionList sections={sectionsWithNull} />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("仕様");
  });
});
