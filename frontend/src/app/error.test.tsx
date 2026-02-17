import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";

describe("ErrorPage", () => {
  it("renders error heading and message", () => {
    const testError = Object.assign(new Error("テストエラー"), { digest: "test-digest" });
    const resetMock = vi.fn();
    render(<ErrorPage error={testError} reset={resetMock} />);
    expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();
    expect(screen.getByText("テストエラー")).toBeInTheDocument();
  });

  it("calls reset when retry button is clicked", () => {
    const testError = Object.assign(new Error("テストエラー"), { digest: "test-digest" });
    const resetMock = vi.fn();
    render(<ErrorPage error={testError} reset={resetMock} />);

    const button = screen.getByRole("button", { name: "再試行" });
    fireEvent.click(button);
    expect(resetMock).toHaveBeenCalled();
  });
});
