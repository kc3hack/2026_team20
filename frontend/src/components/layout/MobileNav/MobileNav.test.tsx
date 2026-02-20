import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { MobileNav } from "./MobileNav";

async function openMenu() {
  const user = userEvent.setup();
  const menuButton = screen.getByRole("button", { name: "メニューを開く" });
  await user.click(menuButton);
}

describe("MobileNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("マイページリンク", () => {
    it("ログイン時にマイページリンクが表示される", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "test@example.com",
          displayName: "testuser",
          avatarUrl: null,
          createdAt: "2026-01-01T00:00:00Z",
        },
        signOut: vi.fn(),
      });

      render(<MobileNav />);
      await openMenu();

      const mypageLink = screen.getByRole("link", { name: /マイページ/ });
      expect(mypageLink).toBeInTheDocument();
      expect(mypageLink).toHaveAttribute("href", "/profile/user-1");
    });

    it("未ログイン時にマイページリンクが表示されない", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        signOut: vi.fn(),
      });

      render(<MobileNav />);
      await openMenu();

      expect(screen.queryByRole("link", { name: /マイページ/ })).not.toBeInTheDocument();
    });

    it("isAuthenticated=true でも user.id が undefined の場合マイページリンクが表示されない", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: undefined,
          email: "test@example.com",
          displayName: "testuser",
          avatarUrl: null,
          createdAt: "2026-01-01T00:00:00Z",
        },
        signOut: vi.fn(),
      });

      render(<MobileNav />);
      await openMenu();

      expect(screen.queryByRole("link", { name: /マイページ/ })).not.toBeInTheDocument();
    });
  });

  describe("作成ボタン", () => {
    it("ログイン時に作成リンクが /plots/new を指す", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "test@example.com",
          displayName: "testuser",
          avatarUrl: null,
          createdAt: "2026-01-01T00:00:00Z",
        },
        signOut: vi.fn(),
      });

      render(<MobileNav />);
      await openMenu();

      const createLink = screen.getByRole("link", { name: /作成/ });
      expect(createLink).toBeInTheDocument();
      expect(createLink).toHaveAttribute("href", "/plots/new");
    });

    it("未ログイン時でも作成リンクが表示される", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        signOut: vi.fn(),
      });

      render(<MobileNav />);
      await openMenu();

      const createLink = screen.getByRole("link", { name: /作成/ });
      expect(createLink).toBeInTheDocument();
    });

    it("未ログイン時の作成リンク先が /auth/login?redirectTo=/plots/new", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        signOut: vi.fn(),
      });

      render(<MobileNav />);
      await openMenu();

      const createLink = screen.getByRole("link", { name: /作成/ });
      expect(createLink).toHaveAttribute("href", "/auth/login?redirectTo=/plots/new");
    });
  });

  describe("既存のナビゲーション", () => {
    it("ホームリンクが表示される", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        signOut: vi.fn(),
      });

      render(<MobileNav />);
      await openMenu();

      const homeLink = screen.getByRole("link", { name: /ホーム/ });
      expect(homeLink).toHaveAttribute("href", "/");
    });

    it("検索リンクが表示される", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        signOut: vi.fn(),
      });

      render(<MobileNav />);
      await openMenu();

      const searchLink = screen.getByRole("link", { name: /検索/ });
      expect(searchLink).toHaveAttribute("href", "/search");
    });
  });
});
