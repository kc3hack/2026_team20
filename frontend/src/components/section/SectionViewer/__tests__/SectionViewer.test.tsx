import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SectionResponse } from "@/lib/api/types";
import { SectionViewer } from "../SectionViewer";

const sectionWithContent: SectionResponse = {
  id: "section-001",
  plotId: "plot-001",
  title: "概要",
  content: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "テスト内容です。" }],
      },
    ],
  },
  orderIndex: 0,
  version: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const sectionWithoutContent: SectionResponse = {
  ...sectionWithContent,
  id: "section-002",
  title: "空セクション",
  content: null,
};

describe("SectionViewer", () => {
  it("content が存在する場合、セクションが描画される", () => {
    render(<SectionViewer section={sectionWithContent} />);

    expect(screen.getByText("概要")).toBeInTheDocument();
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("content が null の場合でもセクションが描画される", () => {
    render(<SectionViewer section={sectionWithoutContent} />);

    expect(screen.getByText("空セクション")).toBeInTheDocument();
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("isBeingEdited が true の場合、SectionLockBadge が表示される", () => {
    const editedBy = {
      id: "user-001",
      displayName: "編集者",
      avatarUrl: null,
    };

    render(<SectionViewer section={sectionWithContent} isBeingEdited={true} editedBy={editedBy} />);

    expect(screen.getByText("編集者 が編集中")).toBeInTheDocument();
  });

  it("isBeingEdited がデフォルト(false)の場合、SectionLockBadge が表示されない", () => {
    render(<SectionViewer section={sectionWithContent} />);

    expect(screen.queryByText("が編集中")).not.toBeInTheDocument();
  });

  it("セクションに正しい id 属性が設定される", () => {
    render(<SectionViewer section={sectionWithContent} />);

    const container = screen.getByText("概要").closest("[id]");
    expect(container?.id).toBe("section-section-001");
  });
});
