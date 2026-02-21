import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserCard } from "../UserCard";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockUser = {
  id: "user-001",
  displayName: "田中太郎",
  avatarUrl: "https://example.com/avatar.png",
};

describe("UserCard", () => {
  it("表示名が正しく表示される", () => {
    render(<UserCard user={mockUser} />);
    expect(screen.getByText("田中太郎")).toBeInTheDocument();
  });

  it("クリックで正しいプロフィールページへのリンクが設定される", () => {
    render(<UserCard user={mockUser} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/profile/user-001");
  });

  it("アバターコンポーネントが表示される", () => {
    const { container } = render(<UserCard user={mockUser} />);
    const avatar = container.querySelector("[data-slot='avatar']");
    expect(avatar).toBeTruthy();
  });

  it("アバターがnullの場合はイニシャルが表示される", () => {
    const userWithoutAvatar = {
      ...mockUser,
      avatarUrl: null,
    };
    render(<UserCard user={userWithoutAvatar} />);
    expect(screen.getByText("田中")).toBeInTheDocument();
  });
});
