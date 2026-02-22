import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UnsavedChangesDialog } from "../UnsavedChangesDialog";

describe("UnsavedChangesDialog", () => {
  const defaultProps = {
    open: true,
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    onCancel: vi.fn(),
    isSaving: false,
  };

  it("open=true のとき、ダイアログが表示される", () => {
    render(<UnsavedChangesDialog {...defaultProps} />);

    expect(screen.getByText("未保存の変更があります")).toBeInTheDocument();
    expect(
      screen.getByText("変更を保存せずに移動しますか？"),
    ).toBeInTheDocument();
  });

  it("open=false のとき、ダイアログが非表示", () => {
    render(<UnsavedChangesDialog {...defaultProps} open={false} />);

    expect(
      screen.queryByText("未保存の変更があります"),
    ).not.toBeInTheDocument();
  });

  it("「保存」ボタンをクリックすると onSave が呼ばれる", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(<UnsavedChangesDialog {...defaultProps} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("「破棄」ボタンをクリックすると onDiscard が呼ばれる", async () => {
    const onDiscard = vi.fn();
    const user = userEvent.setup();

    render(<UnsavedChangesDialog {...defaultProps} onDiscard={onDiscard} />);
    await user.click(screen.getByRole("button", { name: "破棄する" }));

    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("「キャンセル」ボタンをクリックすると onCancel が呼ばれる", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(<UnsavedChangesDialog {...defaultProps} onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("isSaving=true のとき、「保存」ボタンが無効化される", () => {
    render(<UnsavedChangesDialog {...defaultProps} isSaving={true} />);

    const saveButton = screen.getByRole("button", { name: "保存中..." });
    expect(saveButton).toBeDisabled();
  });

  it("isSaving=true のとき、「破棄」ボタンも無効化される", () => {
    render(<UnsavedChangesDialog {...defaultProps} isSaving={true} />);

    const discardButton = screen.getByRole("button", { name: "破棄する" });
    expect(discardButton).toBeDisabled();
  });
});
