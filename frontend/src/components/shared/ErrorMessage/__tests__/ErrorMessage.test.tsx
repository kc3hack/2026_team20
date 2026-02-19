import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorMessage } from "../ErrorMessage";

describe("ErrorMessage", () => {
  it("エラーメッセージが表示される", () => {
    render(<ErrorMessage message="接続に失敗しました" />);
    expect(screen.getByText("接続に失敗しました")).toBeInTheDocument();
  });

  it("再試行ボタンクリックで onRetry が呼ばれる", async () => {
    const handleRetry = vi.fn();
    const user = userEvent.setup();

    render(<ErrorMessage message="エラー" onRetry={handleRetry} />);

    await user.click(screen.getByRole("button", { name: "再試行" }));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("空文字でデフォルトメッセージが表示される", () => {
    render(<ErrorMessage message="" />);
    expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();
  });

  it("onRetry なしで再試行ボタンが非表示", () => {
    render(<ErrorMessage message="エラー" />);
    expect(screen.queryByRole("button", { name: "再試行" })).not.toBeInTheDocument();
  });
});
