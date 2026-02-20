import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SectionResponse } from "@/lib/api/types";
import { TableOfContents } from "../TableOfContents";

const mockSections: SectionResponse[] = [
  {
    id: "section-002",
    plotId: "plot-001",
    title: "仕様",
    content: { type: "doc", content: [] },
    orderIndex: 1,
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "section-001",
    plotId: "plot-001",
    title: "概要",
    content: { type: "doc", content: [] },
    orderIndex: 0,
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

describe("TableOfContents", () => {
  const scrollIntoViewMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    scrollIntoViewMock.mockClear();
  });

  it("セクションが orderIndex 順に表示される", () => {
    render(<TableOfContents sections={mockSections} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("概要");
    expect(buttons[1]).toHaveTextContent("仕様");
  });

  it("タイトルクリックで scrollIntoView が呼ばれる", async () => {
    const user = userEvent.setup();

    const targetElement = document.createElement("div");
    targetElement.id = "section-section-001";
    targetElement.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(targetElement);

    render(<TableOfContents sections={mockSections} />);

    await user.click(screen.getByText("概要"));

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });

    document.body.removeChild(targetElement);
  });

  it("currentSectionId が一致する場合、ハイライトされる", () => {
    render(<TableOfContents sections={mockSections} currentSectionId="section-001" />);

    const activeButton = screen.getByText("概要");
    expect(activeButton.className).toContain("active");
  });

  it("currentSectionId が一致しない場合、ハイライトされない", () => {
    render(<TableOfContents sections={mockSections} />);

    const button = screen.getByText("概要");
    expect(button.className).not.toContain("active");
  });

  it("目次のナビゲーションラベルが設定されている", () => {
    render(<TableOfContents sections={mockSections} />);

    expect(screen.getByRole("navigation", { name: "目次" })).toBeInTheDocument();
  });
});
