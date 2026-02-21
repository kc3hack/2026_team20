import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSignOut = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "taro@example.com",
      displayName: "田中 太郎",
      avatarUrl: "https://example.com/avatar.png",
      createdAt: "2026-01-01T00:00:00Z",
    },
    signOut: mockSignOut,
  }),
}));

import { UserMenu } from "../UserMenu";

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("アバターのフォールバック（イニシャル）が表示される", () => {
    render(<UserMenu />);

    // jsdom では画像ロードが発生しないため AvatarFallback が表示される
    expect(screen.getByText("田太")).toBeInTheDocument();
  });

  it("トリガーをクリックするとメニューが開く", async () => {
    const user = userEvent.setup();

    render(<UserMenu />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("田中 太郎")).toBeInTheDocument();
    expect(screen.getByText("taro@example.com")).toBeInTheDocument();
  });

  it("ログアウトをクリックすると signOut が呼ばれる", async () => {
    const user = userEvent.setup();

    render(<UserMenu />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("ログアウト"));

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("マイページリンクが正しい href で表示される", async () => {
    const user = userEvent.setup();

    render(<UserMenu />);

    await user.click(screen.getByRole("button"));

    const profileLink = screen.getByRole("menuitem", { name: "マイページ" });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute("href", "/profile/user-1");
  });
});
