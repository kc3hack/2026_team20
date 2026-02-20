import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionLockBadge } from "../SectionLockBadge";

const mockLockedBy = {
  id: "user-001",
  displayName: "テストユーザー",
  avatarUrl: "https://example.com/avatar.png",
};

describe("SectionLockBadge", () => {
  it("lockedBy が存在する場合、バッジが表示される", () => {
    render(<SectionLockBadge lockedBy={mockLockedBy} />);

    expect(screen.getByText("テストユーザー が編集中")).toBeInTheDocument();
  });

  it("lockedBy が null の場合、何も表示されない", () => {
    const { container } = render(<SectionLockBadge lockedBy={null} />);

    expect(container.firstChild).toBeNull();
  });

  it("Avatar が正しく表示される", () => {
    const { container } = render(<SectionLockBadge lockedBy={mockLockedBy} />);

    const avatar = container.querySelector("[data-slot='avatar']");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("data-size", "sm");
  });

  it("avatarUrl が null の場合、フォールバックが表示される", () => {
    render(<SectionLockBadge lockedBy={{ ...mockLockedBy, avatarUrl: null }} />);

    expect(screen.getByText("テス")).toBeInTheDocument();
  });
});
