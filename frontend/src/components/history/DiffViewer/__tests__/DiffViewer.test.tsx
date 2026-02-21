import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DiffResponse } from "@/lib/api/types";
import { mockDiffResponse } from "@/mocks/data/history";
import { DiffViewer } from "../DiffViewer";

const emptyDiff: DiffResponse = {
  fromVersion: 1,
  toVersion: 2,
  additions: [],
  deletions: [],
};

describe("DiffViewer", () => {
  it("変更がない場合は「変更はありません」メッセージを表示する", () => {
    render(<DiffViewer diff={emptyDiff} />);

    expect(screen.getByTestId("diff-viewer-empty")).toBeInTheDocument();
    expect(screen.getByText("変更はありません")).toBeInTheDocument();
  });

  it("ヘッダーにfromVersion → toVersionが表示される", () => {
    render(<DiffViewer diff={mockDiffResponse} />);

    expect(
      screen.getByText(`v${mockDiffResponse.fromVersion}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`v${mockDiffResponse.toVersion}`),
    ).toBeInTheDocument();
  });

  it("additionsが緑(+マーカー付き)で表示される", () => {
    render(<DiffViewer diff={mockDiffResponse} />);

    const additionLines = screen.getAllByTestId("diff-line-addition");
    expect(additionLines.length).toBe(mockDiffResponse.additions.length);

    for (const line of additionLines) {
      const marker = line.querySelector("[class*='marker']");
      expect(marker).toHaveTextContent("+");
    }
  });

  it("deletionsが赤(-マーカー付き)で表示される", () => {
    render(<DiffViewer diff={mockDiffResponse} />);

    const deletionLines = screen.getAllByTestId("diff-line-deletion");
    expect(deletionLines.length).toBe(mockDiffResponse.deletions.length);

    for (const line of deletionLines) {
      const marker = line.querySelector("[class*='marker']");
      expect(marker).toHaveTextContent("-");
    }
  });

  it("各行に行番号が表示される", () => {
    render(<DiffViewer diff={mockDiffResponse} />);

    const allLines = [
      ...screen.getAllByTestId("diff-line-addition"),
      ...screen.getAllByTestId("diff-line-deletion"),
    ];

    for (const line of allLines) {
      const lineNumber = line.querySelector("[class*='lineNumber']");
      expect(lineNumber).toBeInTheDocument();
      expect(lineNumber?.textContent).toMatch(/\d+/);
    }
  });

  it("変更サマリに追加・削除数が表示される", () => {
    render(<DiffViewer diff={mockDiffResponse} />);

    expect(
      screen.getByText(`+${mockDiffResponse.additions.length} 追加`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`-${mockDiffResponse.deletions.length} 削除`),
    ).toBeInTheDocument();
  });

  it("additionsのテキストが表示される", () => {
    render(<DiffViewer diff={mockDiffResponse} />);

    for (const addition of mockDiffResponse.additions) {
      expect(screen.getByText(addition.text)).toBeInTheDocument();
    }
  });

  it("deletionsのテキストが表示される", () => {
    render(<DiffViewer diff={mockDiffResponse} />);

    for (const deletion of mockDiffResponse.deletions) {
      expect(screen.getByText(deletion.text)).toBeInTheDocument();
    }
  });

  it("複数行テキストが改行で分割されて表示される", () => {
    const multiLineDiff: DiffResponse = {
      fromVersion: 1,
      toVersion: 2,
      additions: [{ start: 1, end: 3, text: "1行目\n2行目\n3行目" }],
      deletions: [],
    };

    render(<DiffViewer diff={multiLineDiff} />);

    const additionLines = screen.getAllByTestId("diff-line-addition");
    expect(additionLines.length).toBe(3);
    expect(screen.getByText("1行目")).toBeInTheDocument();
    expect(screen.getByText("2行目")).toBeInTheDocument();
    expect(screen.getByText("3行目")).toBeInTheDocument();
  });

  it("行番号順にソートされて表示される", () => {
    const unorderedDiff: DiffResponse = {
      fromVersion: 1,
      toVersion: 2,
      additions: [{ start: 10, end: 10, text: "後の行" }],
      deletions: [{ start: 1, end: 1, text: "先の行" }],
    };

    render(<DiffViewer diff={unorderedDiff} />);

    const viewer = screen.getByTestId("diff-viewer");
    const lines = viewer.querySelectorAll("[data-testid^='diff-line-']");

    expect(lines[0]).toHaveAttribute("data-testid", "diff-line-deletion");
    expect(lines[1]).toHaveAttribute("data-testid", "diff-line-addition");
  });
});
