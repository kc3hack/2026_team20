import "@testing-library/jest-dom";

import React from "react";
import { vi } from "vitest";

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => null),
  EditorContent: ({ editor }: { editor: unknown }) =>
    React.createElement(
      "div",
      { "data-testid": "editor-content" },
      editor ? "rendered" : "no-editor",
    ),
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: {},
}));
