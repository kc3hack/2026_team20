import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "../loading";

describe("Loading", () => {
  it("renders loading message", () => {
    render(<Loading />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });
});
