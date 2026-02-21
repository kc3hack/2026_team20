import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserAvatarLink } from "../UserAvatarLink";

describe("UserAvatarLink", () => {
  const mockUser = {
    displayName: "テストユーザー",
    avatarUrl: "https://example.com/avatar.png",
  };

  it("リンクが正しく生成される", () => {
    render(<UserAvatarLink user={mockUser} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/profile/テストユーザー");
  });

  it("disableLink=true の場合はリンクが生成されない", () => {
    render(<UserAvatarLink user={mockUser} disableLink />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("avatarUrl がない場合はフォールバックが表示される", () => {
    const userWithoutAvatar = { displayName: "田中", avatarUrl: null };
    render(<UserAvatarLink user={userWithoutAvatar} />);

    expect(screen.getByText("田中")).toBeInTheDocument();
  });

  it("className が Avatar に適用される", () => {
    render(<UserAvatarLink user={mockUser} className="custom-class" />);

    const link = screen.getByRole("link");
    // Avatar が className を受け取ることを確認
    expect(link.firstChild).toHaveClass("custom-class");
  });
});
