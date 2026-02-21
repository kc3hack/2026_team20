import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { UserProfileResponse } from "@/lib/api/types";
import { UserProfile } from "../UserProfile";

const mockProfile: UserProfileResponse = {
  id: "user-001",
  displayName: "田中太郎",
  avatarUrl: "https://example.com/avatar.png",
  plotCount: 10,
  contributionCount: 50,
  createdAt: "2026-01-15T09:00:00Z",
};

describe("UserProfile", () => {
  it("表示名が正しく表示される", () => {
    render(<UserProfile profile={mockProfile} />);
    expect(screen.getByText("田中太郎")).toBeInTheDocument();
  });

  it("表示名がh1見出しとしてレンダリングされる", () => {
    render(<UserProfile profile={mockProfile} />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("田中太郎");
  });

  it("加入日が「YYYY年MM月DD日 に参加」形式で表示される", () => {
    render(<UserProfile profile={mockProfile} />);
    expect(screen.getByText("2026年01月15日 に参加")).toBeInTheDocument();
  });

  it("Plot 数が正しく表示される", () => {
    render(<UserProfile profile={mockProfile} />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Plot")).toBeInTheDocument();
  });

  it("コントリビューション数が正しく表示される", () => {
    render(<UserProfile profile={mockProfile} />);
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("コントリビューション")).toBeInTheDocument();
  });

  it("アバターコンポーネントが表示される", () => {
    const { container } = render(<UserProfile profile={mockProfile} />);
    const avatar = container.querySelector("[data-slot='avatar']");
    expect(avatar).toBeTruthy();
  });

  it("アバターがnullの場合はイニシャルが表示される", () => {
    const profileWithoutAvatar: UserProfileResponse = {
      ...mockProfile,
      avatarUrl: null,
    };
    render(<UserProfile profile={profileWithoutAvatar} />);
    expect(screen.getByText("田中")).toBeInTheDocument();
  });

  it("不正な日付の場合は「日時不明」と表示される", () => {
    const profileWithInvalidDate: UserProfileResponse = {
      ...mockProfile,
      createdAt: "invalid-date",
    };
    render(<UserProfile profile={profileWithInvalidDate} />);
    expect(screen.getByText("日時不明 に参加")).toBeInTheDocument();
  });
});
