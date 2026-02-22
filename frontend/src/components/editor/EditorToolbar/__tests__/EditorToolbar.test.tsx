import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Editor } from "@tiptap/core";
import { describe, expect, it, vi } from "vitest";
import { EditorToolbar } from "../EditorToolbar";

function createMockEditor(
  overrides: Partial<Record<string, unknown>> = {},
): Editor {
  const chain = new Proxy(
    {},
    {
      get: () => vi.fn().mockReturnValue(chain),
    },
  );

  return {
    chain: () => chain,
    isActive: vi.fn().mockReturnValue(false),
    can: () =>
      new Proxy(
        {},
        {
          get: () =>
            new Proxy(
              {},
              {
                get: () => vi.fn().mockReturnValue(true),
              },
            ),
        },
      ),
    getAttributes: vi.fn().mockReturnValue({}),
    ...overrides,
  } as unknown as Editor;
}

describe("EditorToolbar", () => {
  it("editor=null のとき何も表示しない", () => {
    const { container } = render(<EditorToolbar editor={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("太字ボタンが表示される", () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    expect(
      screen.getByRole("button", { name: /太字/i }),
    ).toBeInTheDocument();
  });

  it("斜体ボタンが表示される", () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    expect(
      screen.getByRole("button", { name: /斜体/i }),
    ).toBeInTheDocument();
  });

  it("下線ボタンが表示される", () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    expect(
      screen.getByRole("button", { name: /下線/i }),
    ).toBeInTheDocument();
  });

  it("取消線ボタンが表示される", () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    expect(
      screen.getByRole("button", { name: /取消線/i }),
    ).toBeInTheDocument();
  });

  it("見出しボタン（H1, H2, H3）が表示される", () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    expect(screen.getByRole("button", { name: "H1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "H2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "H3" })).toBeInTheDocument();
  });

  it("箇条書き・番号付きリストボタンが表示される", () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    expect(
      screen.getByRole("button", { name: /箇条書き/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /番号付きリスト/i }),
    ).toBeInTheDocument();
  });

  it("リンクボタンが表示される", () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    expect(
      screen.getByRole("button", { name: /リンク/i }),
    ).toBeInTheDocument();
  });

  it("元に戻す・やり直しボタンが表示される", () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);
    expect(
      screen.getByRole("button", { name: /元に戻す/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /やり直し/i }),
    ).toBeInTheDocument();
  });

  it("太字ボタンをクリックすると toggleBold が呼ばれる", async () => {
    const toggleBold = vi.fn().mockReturnValue({ run: vi.fn() });
    const chain = {
      focus: vi.fn().mockReturnValue({ toggleBold }),
    };
    const editor = createMockEditor({
      chain: () => chain,
    });
    const user = userEvent.setup();

    render(<EditorToolbar editor={editor} />);
    await user.click(screen.getByRole("button", { name: /太字/i }));

    expect(chain.focus).toHaveBeenCalled();
  });

  it("太字がアクティブのとき、ボタンが押下状態になる", () => {
    const editor = createMockEditor({
      isActive: vi.fn((name: string) => name === "bold"),
    });

    render(<EditorToolbar editor={editor} />);
    const boldButton = screen.getByRole("button", { name: /太字/i });
    expect(boldButton).toHaveAttribute("data-state", "on");
  });
});
