import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SectionResponse } from "@/lib/api/types";
import { SectionViewer } from "../SectionViewer";

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => null),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content">{editor ? "rendered" : "no-editor"}</div>
  ),
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: {},
}));

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

  it("content が null の場合、何も表示されない", () => {
    const { container } = render(<SectionViewer section={sectionWithoutContent} />);

    expect(container.firstChild).toBeNull();
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
