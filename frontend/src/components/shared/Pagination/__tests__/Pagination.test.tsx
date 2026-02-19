import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "../Pagination";

describe("Pagination", () => {
  it("total=100, limit=20 で 5 ページ表示される", () => {
    const handlePageChange = vi.fn();
    render(<Pagination total={100} limit={20} offset={0} onPageChange={handlePageChange} />);

    for (let page = 1; page <= 5; page++) {
      expect(screen.getByRole("button", { name: String(page) })).toBeInTheDocument();
    }
  });

  it("現在のページがハイライトされる（disabled）", () => {
    const handlePageChange = vi.fn();
    render(<Pagination total={100} limit={20} offset={0} onPageChange={handlePageChange} />);

    const currentPageButton = screen.getByRole("button", { name: "1" });
    expect(currentPageButton).toBeDisabled();
  });

  it("total=0 の時は null を返す", () => {
    const handlePageChange = vi.fn();
    const { container } = render(
      <Pagination total={0} limit={20} offset={0} onPageChange={handlePageChange} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("onPageChange が正しい offset で呼ばれる", async () => {
    const handlePageChange = vi.fn();
    const user = userEvent.setup();

    render(<Pagination total={100} limit={20} offset={0} onPageChange={handlePageChange} />);

    await user.click(screen.getByRole("button", { name: "3" }));
    expect(handlePageChange).toHaveBeenCalledWith(40);
  });

  it("5ページ超過時に省略記号が表示される", () => {
    const handlePageChange = vi.fn();
    render(<Pagination total={200} limit={20} offset={0} onPageChange={handlePageChange} />);

    expect(screen.getByText("...")).toBeInTheDocument();
  });
});
