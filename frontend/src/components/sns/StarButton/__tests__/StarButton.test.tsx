import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockToggleStar = vi.fn();
let mockUseStar = {
  count: 42,
  isStarred: false,
  isPending: false,
  toggleStar: mockToggleStar,
};

vi.mock("@/hooks/useStar", () => ({
  useStar: () => mockUseStar,
}));

import { StarButton } from "../StarButton";

describe("StarButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStar = {
      count: 42,
      isStarred: false,
      isPending: false,
      toggleStar: mockToggleStar,
    };
  });

  it("初期表示でカウントとアイコンが正しい", () => {
    render(<StarButton plotId="plot-001" initialCount={42} initialIsStarred={false} />);

    expect(screen.getByText("42")).toBeInTheDocument();
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("isStarred=true の時にアイコンが塗りつぶされる", () => {
    mockUseStar = {
      count: 10,
      isStarred: true,
      isPending: false,
      toggleStar: mockToggleStar,
    };

    render(<StarButton plotId="plot-001" initialCount={10} initialIsStarred={true} />);

    expect(screen.getByText("10")).toBeInTheDocument();
    const svg = document.querySelector("svg");
    expect(svg).toHaveAttribute("fill", "currentColor");
  });

  it("クリックで toggleStar が呼ばれる", async () => {
    const user = userEvent.setup();

    render(<StarButton plotId="plot-001" initialCount={42} initialIsStarred={false} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockToggleStar).toHaveBeenCalledTimes(1);
  });

  it("isPending 中はボタンが disabled", () => {
    mockUseStar = {
      count: 42,
      isStarred: false,
      isPending: true,
      toggleStar: mockToggleStar,
    };

    render(<StarButton plotId="plot-001" initialCount={42} initialIsStarred={false} />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });
});
