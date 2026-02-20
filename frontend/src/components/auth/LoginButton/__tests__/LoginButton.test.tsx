import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSignInWithGitHub = vi.fn();
const mockSignInWithGoogle = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signInWithGitHub: mockSignInWithGitHub,
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

import { LoginButton } from "../LoginButton";

describe("LoginButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("GitHub ボタンをクリックすると signInWithGitHub が呼ばれる", async () => {
    const user = userEvent.setup();

    render(<LoginButton provider="github" />);

    await user.click(screen.getByRole("button", { name: /github/i }));

    expect(mockSignInWithGitHub).toHaveBeenCalledWith(undefined);
  });

  it("Google ボタンをクリックすると signInWithGoogle が呼ばれる", async () => {
    const user = userEvent.setup();

    render(<LoginButton provider="google" />);

    await user.click(screen.getByRole("button", { name: /google/i }));

    expect(mockSignInWithGoogle).toHaveBeenCalledWith(undefined);
  });

  it("redirectTo が指定されている場合、signInWithGitHub に渡される", async () => {
    const user = userEvent.setup();

    render(<LoginButton provider="github" redirectTo="/plots/new" />);

    await user.click(screen.getByRole("button", { name: /github/i }));

    expect(mockSignInWithGitHub).toHaveBeenCalledWith("/plots/new");
  });

  it("redirectTo が指定されている場合、signInWithGoogle に渡される", async () => {
    const user = userEvent.setup();

    render(<LoginButton provider="google" redirectTo="/dashboard" />);

    await user.click(screen.getByRole("button", { name: /google/i }));

    expect(mockSignInWithGoogle).toHaveBeenCalledWith("/dashboard");
  });

  it("GitHub ボタンのテキストが正しい", () => {
    render(<LoginButton provider="github" />);

    expect(screen.getByRole("button", { name: /github でログイン/i })).toBeInTheDocument();
  });

  it("Google ボタンのテキストが正しい", () => {
    render(<LoginButton provider="google" />);

    expect(screen.getByRole("button", { name: /google でログイン/i })).toBeInTheDocument();
  });
});
