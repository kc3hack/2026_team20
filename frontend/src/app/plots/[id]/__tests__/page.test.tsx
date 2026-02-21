import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { PlotDetailResponse } from "@/lib/api/types";

vi.mock("@/lib/api/repositories/plotRepository", () => ({
  get: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: false })),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

import { notFound } from "next/navigation";
import * as plotRepository from "@/lib/api/repositories/plotRepository";
import PlotDetailPage from "../page";

const mockPlot: PlotDetailResponse = {
  id: "plot-001",
  title: "テスト Plot",
  description: "テスト用の説明",
  tags: ["テスト"],
  ownerId: "user-001",
  starCount: 10,
  isStarred: false,
  isPaused: false,
  thumbnailUrl: null,
  version: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  sections: [],
  owner: {
    id: "user-001",
    displayName: "テストオーナー",
    avatarUrl: null,
  },
};

describe("PlotDetailPage", () => {
  it("正常なIDでPlotDetailが表示される", async () => {
    vi.mocked(plotRepository.get).mockResolvedValue(mockPlot);

    const page = await PlotDetailPage({
      params: Promise.resolve({ id: "plot-001" }),
    });
    render(page);

    expect(screen.getByText("テスト Plot")).toBeInTheDocument();
    expect(plotRepository.get).toHaveBeenCalledWith("plot-001");
  });

  it("404エラーの場合 notFound() が呼ばれる", async () => {
    vi.mocked(plotRepository.get).mockRejectedValue(new ApiError(404, "Not Found"));

    await PlotDetailPage({
      params: Promise.resolve({ id: "non-existent" }),
    });

    expect(notFound).toHaveBeenCalled();
  });

  it("404以外のエラーの場合はエラーが再スローされる", async () => {
    vi.mocked(plotRepository.get).mockRejectedValue(new ApiError(500, "Server Error"));

    await expect(
      PlotDetailPage({
        params: Promise.resolve({ id: "error" }),
      }),
    ).rejects.toThrow("Server Error");
  });

  it("params の id が正しく取得される", async () => {
    vi.mocked(plotRepository.get).mockResolvedValue(mockPlot);

    await PlotDetailPage({
      params: Promise.resolve({ id: "plot-002" }),
    });

    expect(plotRepository.get).toHaveBeenCalledWith("plot-002");
  });
});
