import { render, screen } from "@testing-library/react";
import { useEditor } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
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
    it("ydoc が渡された場合、Collaboration.configure が呼ばれる", () => {
      const ydoc = new Doc();
      render(<TiptapEditor ydoc={ydoc} />);

      expect(Collaboration.configure).toHaveBeenCalledWith({ document: ydoc });
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
      render(<TiptapEditor ydoc={ydoc} />);

      expect(StarterKit.configure).toHaveBeenCalledWith(
        expect.objectContaining({ undoRedo: false }),
      );
    });

    it("ydoc と provider が両方渡された場合、CollaborationCursor.configure が呼ばれる", () => {
      const ydoc = new Doc();
      const mockProvider = { awareness: {} };
      render(<TiptapEditor ydoc={ydoc} provider={mockProvider as never} />);

      expect(CollaborationCursor.configure).toHaveBeenCalledWith({
        provider: mockProvider,
      });
    });

    it("ydoc のみで provider がない場合、CollaborationCursor.configure は provider 引数で呼ばれない", () => {
      const cursorConfigure = vi.mocked(CollaborationCursor.configure);
      render(<TiptapEditor ydoc={new Doc()} />);

      const calledWithProvider = cursorConfigure.mock.calls.some(
        (args) => args[0] && typeof args[0] === "object" && "provider" in args[0],
      );
      expect(calledWithProvider).toBe(false);
    });
  });
});
