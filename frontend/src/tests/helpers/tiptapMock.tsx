import { vi } from "vitest";

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => null),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content">{editor ? "rendered" : "no-editor"}</div>
  ),
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: {},
}));
