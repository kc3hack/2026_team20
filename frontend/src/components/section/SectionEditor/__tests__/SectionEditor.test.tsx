import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Doc } from "yjs";
import type { SectionResponse } from "@/lib/api/types";
import { SectionEditor } from "../SectionEditor";

let capturedTiptapProps: Record<string, unknown> = {};

vi.mock("@/components/editor/TiptapEditor", () => ({
  TiptapEditor: (props: Record<string, unknown>) => {
    capturedTiptapProps = props;
    return <div data-testid="editor-content">mock-tiptap</div>;
  },
}));

const mockSection: SectionResponse = {
  id: "section-001",
  plotId: "plot-001",
  title: "概要",
  content: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "テスト内容" }] }],
  },
  orderIndex: 0,
  version: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockLockedBy = {
  id: "user-002",
  displayName: "他のユーザー",
  avatarUrl: null,
};

describe("SectionEditor", () => {
  const defaultProps = {
    section: mockSection,
    lockState: "unlocked" as const,
    lockedBy: null,
    onSave: vi.fn().mockResolvedValue(true),
    onEditStart: vi.fn(),
    onEditEnd: vi.fn(),
    onDelete: vi.fn().mockResolvedValue(undefined),
    isDeleting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedTiptapProps = {};
  });

  it("lockState が unknown の場合、接続中表示と非活性ボタンが表示される", () => {
    render(<SectionEditor {...defaultProps} lockState="unknown" />);

    expect(screen.getByText("概要")).toBeInTheDocument();
    const editButton = screen.getByRole("button", { name: /編集する/ });
    expect(editButton).toBeDisabled();
  });

  it("lockState が unlocked の場合、閲覧表示と編集ボタンが表示される", () => {
    render(<SectionEditor {...defaultProps} lockState="unlocked" />);

    expect(screen.getByText("概要")).toBeInTheDocument();
    const editButton = screen.getByRole("button", { name: /編集する/ });
    expect(editButton).toBeEnabled();
  });

  it("lockState が unlocked の場合、削除ボタンが編集ボタンと一緒に表示される", () => {
    render(<SectionEditor {...defaultProps} lockState="unlocked" />);

    expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /編集する/ })).toBeInTheDocument();
  });

  it("削除ダイアログで削除するを押すと onDelete が呼ばれる", async () => {
    render(<SectionEditor {...defaultProps} lockState="unlocked" />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
    });
  });

  it("lockState が unlocked で編集ボタンクリック時、onEditStart が呼ばれる", () => {
    render(<SectionEditor {...defaultProps} lockState="unlocked" />);

    fireEvent.click(screen.getByRole("button", { name: /編集する/ }));

    expect(defaultProps.onEditStart).toHaveBeenCalledTimes(1);
  });

  it("lockState が locked-by-me の場合、エディタと編集完了ボタンが表示される", () => {
    render(<SectionEditor {...defaultProps} lockState="locked-by-me" />);

    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "セクションタイトル" })).toHaveValue("概要");
    expect(screen.getByRole("button", { name: /編集完了/ })).toBeInTheDocument();
  });

  it("lockState が locked-by-me で編集完了クリック時、onSave と onEditEnd が呼ばれる", async () => {
    render(<SectionEditor {...defaultProps} lockState="locked-by-me" />);

    fireEvent.click(screen.getByRole("button", { name: /編集完了/ }));

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
      expect(defaultProps.onEditEnd).toHaveBeenCalledTimes(1);
    });
  });

  it("編集モードでタイトル変更後に編集完了すると、更新後タイトルで保存される", async () => {
    render(<SectionEditor {...defaultProps} lockState="locked-by-me" />);

    fireEvent.change(screen.getByRole("textbox", { name: "セクションタイトル" }), {
      target: { value: "更新後タイトル" },
    });
    fireEvent.click(screen.getByRole("button", { name: /編集完了/ }));

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith("更新後タイトル", expect.any(Object));
    });
  });

  it("lockState が locked-by-other の場合、閲覧表示と SectionLockBadge が表示される", () => {
    render(
      <SectionEditor {...defaultProps} lockState="locked-by-other" lockedBy={mockLockedBy} />,
    );

    expect(screen.getByText("概要")).toBeInTheDocument();
    expect(screen.getByText("他のユーザー が編集中")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /編集する/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "削除" })).not.toBeInTheDocument();
  });

  it("content が null のセクションでも正しく表示される", () => {
    const emptySection = { ...mockSection, content: null };
    render(<SectionEditor {...defaultProps} section={emptySection} lockState="unlocked" />);

    expect(screen.getByText("概要")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /編集する/ })).toBeInTheDocument();
  });

  it("セクションに正しい id 属性が設定される", () => {
    render(<SectionEditor {...defaultProps} lockState="unlocked" />);

    const container = screen.getByText("概要").closest("[id]");
    expect(container?.id).toBe("section-section-001");
  });

  it("lockState が unlocked から locked-by-other に変わった時にUIが更新される", () => {
    const { rerender } = render(
      <SectionEditor {...defaultProps} lockState="unlocked" lockedBy={null} />,
    );

    expect(screen.getByRole("button", { name: /編集する/ })).toBeEnabled();
    expect(screen.queryByText("他のユーザー が編集中")).not.toBeInTheDocument();

    rerender(
      <SectionEditor {...defaultProps} lockState="locked-by-other" lockedBy={mockLockedBy} />,
    );

    expect(screen.queryByRole("button", { name: /編集する/ })).not.toBeInTheDocument();
    expect(screen.getByText("他のユーザー が編集中")).toBeInTheDocument();
  });

  describe("ydoc / provider の受け渡し", () => {
    it("ydoc が TiptapEditor に渡される（provider は Collaboration 用に不要）", () => {
      const ydoc = new Doc();

      render(
        <SectionEditor
          {...defaultProps}
          lockState="locked-by-me"
          ydoc={ydoc}
        />,
      );

      expect(capturedTiptapProps.ydoc).toBe(ydoc);
    });

    it("ydoc が省略された場合、undefined が渡される", () => {
      render(<SectionEditor {...defaultProps} lockState="locked-by-me" />);

      expect(capturedTiptapProps.ydoc).toBeUndefined();
    });

    it("lockState が unlocked のとき、read-only TiptapEditor に ydoc は渡されない（JSON 直接同期を使うため）", () => {
      const ydoc = new Doc();

      render(
        <SectionEditor {...defaultProps} lockState="unlocked" ydoc={ydoc} />,
      );

      expect(capturedTiptapProps.ydoc).toBeUndefined();
    });
  });
});
