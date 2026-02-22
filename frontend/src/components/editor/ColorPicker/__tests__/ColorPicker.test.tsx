import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ColorPicker, PALETTE_COLORS } from "../ColorPicker";

describe("ColorPicker", () => {
  it("パレットの全8色が表示される", () => {
    render(<ColorPicker color={undefined} onChange={vi.fn()} />);

    const swatches = screen.getAllByRole("button", { name: /色を選択/ });
    expect(swatches).toHaveLength(PALETTE_COLORS.length);
  });

  it("色をクリックすると onChange が呼ばれる", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<ColorPicker color={undefined} onChange={handleChange} />);

    const firstSwatch = screen.getAllByRole("button", { name: /色を選択/ })[0];
    await user.click(firstSwatch);

    expect(handleChange).toHaveBeenCalledWith(PALETTE_COLORS[0].value);
  });

  it("現在選択中の色にチェックマークが表示される", () => {
    const selectedColor = PALETTE_COLORS[2].value;

    render(<ColorPicker color={selectedColor} onChange={vi.fn()} />);

    // 選択中の色のスウォッチにチェックアイコンが含まれる
    const selectedSwatch = screen.getAllByRole("button", {
      name: /色を選択/,
    })[2];
    expect(selectedSwatch.querySelector("svg")).toBeInTheDocument();
  });

  it("選択されていない色にはチェックマークが表示されない", () => {
    const selectedColor = PALETTE_COLORS[0].value;

    render(<ColorPicker color={selectedColor} onChange={vi.fn()} />);

    // 2番目の色にはチェックアイコンがない
    const unselectedSwatch = screen.getAllByRole("button", {
      name: /色を選択/,
    })[1];
    expect(unselectedSwatch.querySelector("svg")).toBeNull();
  });

  it("PALETTE_COLORS は 8 色定義されている", () => {
    expect(PALETTE_COLORS).toHaveLength(8);
  });
});
