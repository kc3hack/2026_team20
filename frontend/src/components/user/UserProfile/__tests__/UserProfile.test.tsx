import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfileResponse } from "@/lib/api/types";

const mockMutate = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    session: null,
    isLoading: false,
    isAuthenticated: false,
    signInWithGitHub: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    handleUnauthorized: vi.fn(),
  })),
}));

vi.mock("@/hooks/useUser", () => ({
  useUpdateAvatar: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

import { useAuth } from "@/hooks/useAuth";
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

  it("他人のプロフィールにはアバター編集ボタンが表示されない", () => {
    render(<UserProfile profile={mockProfile} />);
    expect(screen.queryByLabelText("アバター画像を変更")).not.toBeInTheDocument();
  });
});

describe("UserProfile（本人表示）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "user-001",
        email: "test@example.com",
        displayName: "田中太郎",
        avatarUrl: null,
        createdAt: "2026-01-15T09:00:00Z",
      },
      session: { access_token: "token" } as ReturnType<typeof useAuth>["session"],
      isLoading: false,
      isAuthenticated: true,
      signInWithGitHub: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      handleUnauthorized: vi.fn(),
    });
  });

  it("本人のプロフィールにはアバター編集ボタンが表示される", () => {
    render(<UserProfile profile={mockProfile} />);
    expect(screen.getByLabelText("アバター画像を変更")).toBeInTheDocument();
  });

  it("ファイル選択時にupdateAvatarが呼び出される", () => {
    render(<UserProfile profile={mockProfile} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(["test"], "test.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [testFile] } });
    expect(mockMutate).toHaveBeenCalledWith(testFile);
  });
});
