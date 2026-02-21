import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAddComment = vi.fn();
let mockIsPending = false;

vi.mock("@/hooks/useComments", () => ({
  useAddComment: () => ({
    addComment: mockAddComment,
    isPending: mockIsPending,
  }),
}));

let mockIsAuthenticated = true;

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    session: mockIsAuthenticated ? { access_token: "test-token" } : null,
    user: mockIsAuthenticated ? { id: "user-1", displayName: "Test" } : null,
    isLoading: false,
    isAuthenticated: mockIsAuthenticated,
    signInWithGitHub: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    handleUnauthorized: vi.fn(),
  }),
}));

import { CommentForm } from "../CommentForm";

describe("CommentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = true;
    mockIsPending = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("空文字では投稿ボタンが disabled", () => {
    render(<CommentForm threadId="thread-001" />);

    const submitButton = screen.getByRole("button", { name: "投稿" });
    expect(submitButton).toBeDisabled();
  });

  it("5000 文字超で投稿ボタンが disabled", async () => {
    const user = userEvent.setup();
    render(<CommentForm threadId="thread-001" />);

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    const longText = "a".repeat(5001);
    await user.click(textarea);
    await user.paste(longText);

    const submitButton = screen.getByRole("button", { name: "投稿" });
    expect(submitButton).toBeDisabled();
  });

  it("有効な入力で投稿ボタンが enabled", async () => {
    const user = userEvent.setup();
    render(<CommentForm threadId="thread-001" />);

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    await user.type(textarea, "テストコメント");

    const submitButton = screen.getByRole("button", { name: "投稿" });
    expect(submitButton).toBeEnabled();
  });

  it("返信モードで親コメント引用が表示される", () => {
    render(
      <CommentForm
        threadId="thread-001"
        parentCommentId="comment-1"
        parentCommentUser="テストユーザー"
      />,
    );

    expect(screen.getByText("@テストユーザー に返信")).toBeInTheDocument();
  });

  it("キャンセルボタンで onCancelReply が呼ばれる", async () => {
    const user = userEvent.setup();
    const onCancelReply = vi.fn();

    render(
      <CommentForm
        threadId="thread-001"
        parentCommentId="comment-1"
        parentCommentUser="テストユーザー"
        onCancelReply={onCancelReply}
      />,
    );

    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onCancelReply).toHaveBeenCalledTimes(1);
  });

  it("未ログイン時は Textarea が disabled + ログインリンクが表示される", () => {
    mockIsAuthenticated = false;
    render(<CommentForm threadId="thread-001" />);

    const textarea = screen.getByPlaceholderText("コメントを入力...");
    expect(textarea).toBeDisabled();

    expect(screen.getByText("ログインしてコメントする")).toBeInTheDocument();
  });
});
