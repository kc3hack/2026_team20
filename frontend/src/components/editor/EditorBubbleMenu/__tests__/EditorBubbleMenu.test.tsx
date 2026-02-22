import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Editor } from "@tiptap/core";
import { describe, expect, it, vi } from "vitest";
import { BubbleMenuContent } from "../EditorBubbleMenu";

vi.mock("@tiptap/react/menus", () => ({
  BubbleMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bubble-menu">{children}</div>
  ),
}));

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
    getAttributes: vi.fn().mockReturnValue({}),
    ...overrides,
  } as unknown as Editor;
}

describe("BubbleMenuContent", () => {
  it("太字ボタンが表示される", () => {
    const editor = createMockEditor();
    render(<BubbleMenuContent editor={editor} />);
    expect(
      screen.getByRole("button", { name: /太字/i }),
    ).toBeInTheDocument();
  });

  it("斜体ボタンが表示される", () => {
    const editor = createMockEditor();
    render(<BubbleMenuContent editor={editor} />);
    expect(
      screen.getByRole("button", { name: /斜体/i }),
    ).toBeInTheDocument();
  });

  it("リンクボタンが表示される", () => {
    const editor = createMockEditor();
    render(<BubbleMenuContent editor={editor} />);
    expect(
      screen.getByRole("button", { name: /リンク/i }),
    ).toBeInTheDocument();
  });

  it("太字ボタンをクリックすると toggleBold が呼ばれる", async () => {
    const run = vi.fn();
    const toggleBold = vi.fn().mockReturnValue({ run });
    const focus = vi.fn().mockReturnValue({ toggleBold });
    const editor = createMockEditor({
      chain: () => ({ focus }),
    });
    const user = userEvent.setup();

    render(<BubbleMenuContent editor={editor} />);
    await user.click(screen.getByRole("button", { name: /太字/i }));

    expect(focus).toHaveBeenCalled();
    expect(toggleBold).toHaveBeenCalled();
  });

  it("太字がアクティブのとき、ボタンが押下状態になる", () => {
    const editor = createMockEditor({
      isActive: vi.fn((name: string) => name === "bold"),
    });

    render(<BubbleMenuContent editor={editor} />);
    const boldButton = screen.getByRole("button", { name: /太字/i });
    expect(boldButton).toHaveAttribute("data-state", "on");
  });
});
