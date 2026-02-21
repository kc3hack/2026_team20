import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchBar } from "../SearchBar";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("SearchBar", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("Inputが表示される", () => {
    render(<SearchBar />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it('placeholderが "Plotを検索..." である', () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText("Plotを検索...")).toBeInTheDocument();
  });

  it("Enterキーで検索が実行される", () => {
    render(<SearchBar />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "テスト" } });
    fireEvent.submit(input.closest("form")!);
    expect(pushMock).toHaveBeenCalledWith(`/search?q=${encodeURIComponent("テスト")}`);
  });

  it("検索ボタンクリックで検索が実行される", () => {
    render(<SearchBar />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "React" } });
    const button = screen.getByRole("button", { name: "検索" });
    fireEvent.click(button);
    expect(pushMock).toHaveBeenCalledWith(`/search?q=${encodeURIComponent("React")}`);
  });

  it("空文字では検索が実行されない", () => {
    render(<SearchBar />);
    const button = screen.getByRole("button", { name: "検索" });
    fireEvent.click(button);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("スペースのみでは検索が実行されない", () => {
    render(<SearchBar />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(input.closest("form")!);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
