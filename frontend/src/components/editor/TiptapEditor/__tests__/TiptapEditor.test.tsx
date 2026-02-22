import { render, screen } from "@testing-library/react";
import { useEditor } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import StarterKit from "@tiptap/starter-kit";
import { Doc } from "yjs";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import { TiptapEditor } from "../TiptapEditor";

const mockUseEditor = useEditor as Mock;

describe("TiptapEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("EditorContent がレンダリングされる", () => {
    render(<TiptapEditor />);
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("useEditor が呼ばれる", () => {
    render(<TiptapEditor />);
    expect(mockUseEditor).toHaveBeenCalled();
  });

  it("className が適用される", () => {
    const { container } = render(<TiptapEditor className="custom-class" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("custom-class");
  });

  it("editable=false のとき、ツールバーが非表示", () => {
    render(<TiptapEditor editable={false} />);
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("editable=true のとき（デフォルト）、editor=null でもツールバー領域がある", () => {
    mockUseEditor.mockReturnValueOnce(null);
    render(<TiptapEditor editable={true} />);
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("content を渡すと useEditor に content が渡される", () => {
    const content = { type: "doc", content: [] };
    render(<TiptapEditor content={content} />);

    expect(mockUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({ content }),
      expect.anything(),
    );
  });

  describe("Collaboration 拡張", () => {
    it("ydoc と useCollaboration が渡された場合、Collaboration.configure が呼ばれる（CollaborationCursor は使用しない）", () => {
      const ydoc = new Doc();
      render(<TiptapEditor ydoc={ydoc} useCollaboration={true} />);

      expect(Collaboration.configure).toHaveBeenCalledWith({
        document: ydoc,
        field: undefined,
      });
    });

    it("ydoc が渡されない場合、Collaboration.configure は document 引数で呼ばれない", () => {
      const collaborationConfigure = vi.mocked(Collaboration.configure);
      render(<TiptapEditor />);

      const calledWithDocument = collaborationConfigure.mock.calls.some(
        (args) => args[0] && typeof args[0] === "object" && "document" in args[0],
      );
      expect(calledWithDocument).toBe(false);
    });

    it("ydoc が渡された場合、StarterKit の undoRedo が false になる", () => {
      const ydoc = new Doc();
      render(<TiptapEditor ydoc={ydoc} useCollaboration={true} />);

      expect(StarterKit.configure).toHaveBeenCalledWith(
        expect.objectContaining({ undoRedo: false }),
      );
    });

    it("collaborationField が渡された場合、Collaboration.configure に field が渡される", () => {
      const ydoc = new Doc();
      render(
        <TiptapEditor ydoc={ydoc} collaborationField="section-1" useCollaboration={true} />,
      );

      expect(Collaboration.configure).toHaveBeenCalledWith({
        document: ydoc,
        field: "section-1",
      });
    });
  });
});
