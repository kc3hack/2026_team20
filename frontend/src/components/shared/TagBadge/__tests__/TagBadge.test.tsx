import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TagBadge } from "../TagBadge";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

describe("TagBadge", () => {
  it("タグ名が正しく表示される", () => {
    render(<TagBadge tag="TypeScript" />);
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("onClick が呼ばれる", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<TagBadge tag="React" onClick={handleClick} />);
    await user.click(screen.getByText("React"));

    expect(handleClick).toHaveBeenCalledWith("React");
  });

  it("リンクが正しい href を持つ", () => {
    render(<TagBadge tag="Next.js" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/plots?tag=Next.js");
  });

  it("特殊文字を含むタグ名が正しくエンコードされる", () => {
    render(<TagBadge tag="C++" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/plots?tag=C%2B%2B");
  });
});
