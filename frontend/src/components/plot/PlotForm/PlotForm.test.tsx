import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlotForm } from "./PlotForm";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("PlotForm", () => {
  it("空タイトルでバリデーションエラーが表示される", async () => {
    const onSubmit = vi.fn();
    render(<PlotForm mode="create" onSubmit={onSubmit} />);

    const submitButton = screen.getByRole("button", { name: "Plotを作成" });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("タイトルは必須です")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("200文字超えでバリデーションエラーが表示される", async () => {
    const onSubmit = vi.fn();
    const longTitle = "あ".repeat(201);
    render(
      <PlotForm
        mode="create"
        defaultValues={{ title: longTitle, description: "", tags: [] }}
        onSubmit={onSubmit}
      />,
    );

    const submitButton = screen.getByRole("button", { name: "Plotを作成" });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("200文字以内")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("正常入力でonSubmitが呼ばれる", async () => {
    const onSubmit = vi.fn();
    render(<PlotForm mode="create" onSubmit={onSubmit} />);

    const titleInput = screen.getByPlaceholderText("Plotのタイトルを入力");
    await userEvent.type(titleInput, "テストPlot");

    const submitButton = screen.getByRole("button", { name: "Plotを作成" });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ title: "テストPlot" });
    });
  });

  it("editモードでdefaultValuesが反映される", () => {
    const onSubmit = vi.fn();
    render(
      <PlotForm
        mode="edit"
        defaultValues={{
          title: "既存タイトル",
          description: "既存の説明",
          tags: ["React", "TypeScript"],
        }}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByDisplayValue("既存タイトル")).toBeInTheDocument();
    expect(screen.getByDisplayValue("既存の説明")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("editモードでは送信ボタンが「Plotを更新」になる", () => {
    const onSubmit = vi.fn();
    render(<PlotForm mode="edit" onSubmit={onSubmit} />);

    expect(screen.getByRole("button", { name: "Plotを更新" })).toBeInTheDocument();
  });

  it("isSubmitting中はボタンが無効化される", () => {
    const onSubmit = vi.fn();
    render(<PlotForm mode="create" onSubmit={onSubmit} isSubmitting />);

    const submitButton = screen.getByRole("button", { name: "作成中..." });
    expect(submitButton).toBeDisabled();
  });
});
