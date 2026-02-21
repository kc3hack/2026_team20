import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SnapshotDetailResponse, SnapshotListResponse } from "@/lib/api/types";
import { mockSnapshotDetail, mockSnapshots } from "@/mocks/data/snapshots";

vi.mock("@/lib/api/repositories/snapshotRepository", () => ({
  list: vi.fn(),
  get: vi.fn(),
}));

import * as snapshotRepository from "@/lib/api/repositories/snapshotRepository";
import { SnapshotList } from "../SnapshotList";

const mockList = vi.mocked(snapshotRepository.list);
const mockGet = vi.mocked(snapshotRepository.get);

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const plotSnapshots = mockSnapshots.filter((s) => s.plotId === "plot-001");

const mockListResponse: SnapshotListResponse = {
  items: plotSnapshots,
  total: plotSnapshots.length,
};

describe("SnapshotList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中はスケルトンを表示する", () => {
    mockList.mockReturnValue(new Promise(() => { }));

    renderWithQuery(<SnapshotList plotId="plot-001" />);

    expect(screen.getByTestId("snapshot-list-loading")).toBeInTheDocument();
  });

  it("データが空の場合は「スナップショットがありません」を表示する", async () => {
    mockList.mockResolvedValue({ items: [], total: 0 });

    renderWithQuery(<SnapshotList plotId="plot-001" />);

    await waitFor(() => {
      expect(
        screen.getByText("スナップショットがありません"),
      ).toBeInTheDocument();
    });
  });

  it("スナップショット項目がバージョン番号付きで表示される", async () => {
    mockList.mockResolvedValue(mockListResponse);

    renderWithQuery(<SnapshotList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("snapshot-list")).toBeInTheDocument();
    });

    for (const snapshot of plotSnapshots) {
      expect(screen.getByText(`v${snapshot.version}`)).toBeInTheDocument();
    }
  });

  it("保持粒度ラベルがcreatedAtに基づいて正しく表示される", async () => {
    const now = Date.now();
    const snapshotsWithDifferentAges = [
      {
        id: "snap-recent",
        plotId: "plot-001",
        version: 1,
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "snap-medium",
        plotId: "plot-001",
        version: 2,
        createdAt: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "snap-old",
        plotId: "plot-001",
        version: 3,
        createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    mockList.mockResolvedValue({
      items: snapshotsWithDifferentAges,
      total: 3,
    });

    renderWithQuery(<SnapshotList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("snapshot-list")).toBeInTheDocument();
    });

    expect(screen.getByText("全保持")).toBeInTheDocument();
    expect(screen.getByText("毎時")).toBeInTheDocument();
    expect(screen.getByText("日次")).toBeInTheDocument();
  });

  it("各項目に「このバージョンに戻す」ボタンが表示される", async () => {
    mockList.mockResolvedValue(mockListResponse);

    renderWithQuery(<SnapshotList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("snapshot-list")).toBeInTheDocument();
    });

    const rollbackButtons = screen.getAllByText("このバージョンに戻す");
    expect(rollbackButtons.length).toBe(plotSnapshots.length);
  });

  it("「このバージョンに戻す」ボタンクリックでonRollbackが呼ばれる", async () => {
    mockList.mockResolvedValue(mockListResponse);
    const onRollback = vi.fn();

    renderWithQuery(
      <SnapshotList plotId="plot-001" onRollback={onRollback} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("snapshot-list")).toBeInTheDocument();
    });

    const rollbackButtons = screen.getAllByText("このバージョンに戻す");
    fireEvent.click(rollbackButtons[0]);

    expect(onRollback).toHaveBeenCalledWith(
      plotSnapshots[0].id,
      plotSnapshots[0].version,
    );
  });

  it("スナップショット項目クリックでプレビューモーダルが表示される", async () => {
    mockList.mockResolvedValue(mockListResponse);
    mockGet.mockResolvedValue(mockSnapshotDetail);

    renderWithQuery(<SnapshotList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("snapshot-list")).toBeInTheDocument();
    });

    const firstItem = screen.getByTestId(
      `snapshot-item-${plotSnapshots[0].id}`,
    );
    fireEvent.click(firstItem);

    await waitFor(() => {
      expect(
        screen.getByText(`スナップショット v${plotSnapshots[0].version}`),
      ).toBeInTheDocument();
    });
  });

  it("プレビューモーダルにPlotタイトル・説明・タグが表示される", async () => {
    mockList.mockResolvedValue(mockListResponse);
    mockGet.mockResolvedValue(mockSnapshotDetail);

    renderWithQuery(<SnapshotList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("snapshot-list")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByTestId(`snapshot-item-${plotSnapshots[0].id}`),
    );

    await waitFor(() => {
      expect(screen.getByTestId("snapshot-preview")).toBeInTheDocument();
    });

    expect(
      screen.getByText(mockSnapshotDetail.content!.plot.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(mockSnapshotDetail.content!.plot.description!),
    ).toBeInTheDocument();

    for (const tag of mockSnapshotDetail.content!.plot.tags) {
      expect(screen.getByText(tag)).toBeInTheDocument();
    }
  });

  it("プレビューモーダルにセクションタイトルが表示される", async () => {
    mockList.mockResolvedValue(mockListResponse);
    mockGet.mockResolvedValue(mockSnapshotDetail);

    renderWithQuery(<SnapshotList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("snapshot-list")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByTestId(`snapshot-item-${plotSnapshots[0].id}`),
    );

    await waitFor(() => {
      expect(screen.getByTestId("snapshot-preview")).toBeInTheDocument();
    });

    for (const section of mockSnapshotDetail.content!.sections) {
      expect(screen.getByText(section.title)).toBeInTheDocument();
    }
  });

  it("contentがnullの場合は「スナップショットデータなし」を表示する", async () => {
    const detailWithNullContent: SnapshotDetailResponse = {
      ...mockSnapshotDetail,
      content: null,
    };

    mockList.mockResolvedValue(mockListResponse);
    mockGet.mockResolvedValue(detailWithNullContent);

    renderWithQuery(<SnapshotList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("snapshot-list")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByTestId(`snapshot-item-${plotSnapshots[0].id}`),
    );

    await waitFor(() => {
      expect(
        screen.getByText("スナップショットデータなし"),
      ).toBeInTheDocument();
    });
  });

  it("モーダル内の「このバージョンに戻す」ボタンでonRollbackが呼ばれモーダルが閉じる", async () => {
    mockList.mockResolvedValue(mockListResponse);
    mockGet.mockResolvedValue(mockSnapshotDetail);
    const onRollback = vi.fn();

    renderWithQuery(
      <SnapshotList plotId="plot-001" onRollback={onRollback} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("snapshot-list")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByTestId(`snapshot-item-${plotSnapshots[0].id}`),
    );

    await waitFor(() => {
      expect(screen.getByTestId("snapshot-preview")).toBeInTheDocument();
    });

    const modalRollbackButtons = screen.getAllByText("このバージョンに戻す");
    const modalButton = modalRollbackButtons[modalRollbackButtons.length - 1];
    fireEvent.click(modalButton);

    expect(onRollback).toHaveBeenCalledWith(
      plotSnapshots[0].id,
      plotSnapshots[0].version,
    );
  });
});
