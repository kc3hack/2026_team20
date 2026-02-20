import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TagBadge } from "../TagBadge";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("TagBadge", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

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
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("onClickが未指定の場合、クリックで正しいURLに遷移する", async () => {
    const user = userEvent.setup();

    render(<TagBadge tag="Next.js" />);
    await user.click(screen.getByRole("button"));

    expect(mockPush).toHaveBeenCalledWith("/plots?tag=Next.js");
  });

  it("特殊文字を含むタグ名が正しくエンコードされる", async () => {
    const user = userEvent.setup();

    render(<TagBadge tag="C++" />);
    await user.click(screen.getByRole("button"));

    expect(mockPush).toHaveBeenCalledWith("/plots?tag=C%2B%2B");
  });
});
