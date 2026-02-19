import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "../not-found";

describe("NotFound", () => {
  it("renders 404 heading and message", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("ページが見つかりません")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ホームに戻る" })).toBeInTheDocument();
  });
});
