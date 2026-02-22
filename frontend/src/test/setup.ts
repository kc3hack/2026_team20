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

vi.mock("@tiptap/react/menus", () => ({
  BubbleMenu: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "bubble-menu" }, children),
  FloatingMenu: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "floating-menu" }, children),
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: { configure: vi.fn().mockReturnValue({}) },
}));

const mockExtension = { configure: vi.fn().mockReturnValue({}) };

vi.mock("@tiptap/extension-placeholder", () => ({ default: mockExtension }));
vi.mock("@tiptap/extension-collaboration", () => ({
  default: mockExtension,
}));
vi.mock("@tiptap/extension-collaboration-cursor", () => ({
  default: mockExtension,
}));
vi.mock("@tiptap/extension-underline", () => ({ default: {} }));
vi.mock("@tiptap/extension-link", () => ({ default: mockExtension }));
vi.mock("@tiptap/extension-color", () => ({ default: {}, Color: {} }));
vi.mock("@tiptap/extension-text-style", () => ({ TextStyle: {} }));
vi.mock("@tiptap/extension-image", () => ({ default: mockExtension }));
vi.mock("@tiptap/extension-file-handler", () => ({ default: mockExtension }));

vi.mock("yjs", () => {
  const mockXmlFragment = {
    toJSON: vi.fn(() => ""),
    toString: vi.fn(() => ""),
    observe: vi.fn(),
    unobserve: vi.fn(),
  };

  class MockDoc {
    clientID = Math.floor(Math.random() * 1_000_000);
    gc = true;

    getXmlFragment = vi.fn(() => mockXmlFragment);
    on = vi.fn();
    off = vi.fn();
    destroy = vi.fn();

    transact = vi.fn((fn: () => void) => fn());
  }

  return {
    Doc: MockDoc,
    XmlFragment: vi.fn(() => mockXmlFragment),
    applyUpdate: vi.fn(),
    encodeStateAsUpdate: vi.fn(() => new Uint8Array(0)),
  };
});

vi.mock("y-supabase", () => {
  class MockSupabaseProvider {
    awareness = {
      getLocalState: vi.fn(() => null),
      setLocalState: vi.fn(),
      getStates: vi.fn(() => new Map()),
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn(),
    };

    on = vi.fn();
    off = vi.fn();
    connect = vi.fn();
    disconnect = vi.fn();
    destroy = vi.fn();
  }

  return {
    default: MockSupabaseProvider,
    SupabaseProvider: MockSupabaseProvider,
  };
});
