import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string; [key: string]: unknown }) => (
    // biome-ignore lint/performance/noImgElement: next/image mock for testing
    <img alt={props.alt} src={props.src as string} />
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import { Header } from "./Header";

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("作成ボタンの表示", () => {
    it("ローディング中でも作成ボタンが表示される", () => {
      mockUseAuth.mockReturnValue({
        isLoading: true,
        isAuthenticated: false,
        user: null,
      });

      render(<Header />);

      const createLink = screen.getByRole("link", { name: /作成/ });
      expect(createLink).toBeInTheDocument();
    });

    it("未ログイン時に作成ボタンが表示される", () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });

      render(<Header />);

      const createLink = screen.getByRole("link", { name: /作成/ });
      expect(createLink).toBeInTheDocument();
    });

    it("ログイン時に作成ボタンが表示される", () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "test@example.com",
          displayName: "TestUser",
          avatarUrl: null,
          createdAt: "2026-01-01T00:00:00Z",
        },
      });

      render(<Header />);

      const createLink = screen.getByRole("link", { name: /作成/ });
      expect(createLink).toBeInTheDocument();
    });
  });

  describe("作成ボタンのリンク先", () => {
    it("未ログイン時はログインページへのリンク（returnTo付き）", () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });

      render(<Header />);

      const createLink = screen.getByRole("link", { name: /作成/ });
      expect(createLink).toHaveAttribute("href", "/auth/login?redirectTo=/plots/new");
    });

    it("ログイン時は作成ページへのリンク", () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "test@example.com",
          displayName: "TestUser",
          avatarUrl: null,
          createdAt: "2026-01-01T00:00:00Z",
        },
      });

      render(<Header />);

      const createLink = screen.getByRole("link", { name: /作成/ });
      expect(createLink).toHaveAttribute("href", "/plots/new");
    });
  });

  describe("既存のHeader機能", () => {
    it("ロゴが表示される", () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });

      render(<Header />);

      expect(screen.getByAltText("Plot Platform")).toBeInTheDocument();
    });

    it("未ログイン時にログインボタンが表示される", () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });

      render(<Header />);

      const loginLink = screen.getByRole("link", { name: "ログイン" });
      expect(loginLink).toHaveAttribute("href", "/auth/login?redirectTo=%2F");
    });
  });
});
