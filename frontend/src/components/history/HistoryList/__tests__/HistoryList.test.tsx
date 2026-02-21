import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HistoryListResponse } from "@/lib/api/types";
import { mockHistoryEntries } from "@/mocks/data/history";

vi.mock("@/lib/api/repositories/historyRepository", () => ({
  getHistory: vi.fn(),
}));

import { getHistory } from "@/lib/api/repositories/historyRepository";
import { HistoryList } from "../HistoryList";

const mockGetHistory = vi.mocked(getHistory);

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const sectionEntries = mockHistoryEntries.filter(
  (h) => h.sectionId === "section-001",
);

const mockResponse: HistoryListResponse = {
  items: sectionEntries,
  total: sectionEntries.length,
};

describe("HistoryList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中はスケルトンを表示する", () => {
    mockGetHistory.mockReturnValue(new Promise(() => {}));

    renderWithQuery(<HistoryList sectionId="section-001" />);

    expect(screen.getByTestId("history-list-loading")).toBeInTheDocument();
  });

  it("データが空の場合は「履歴がありません」を表示する", async () => {
    mockGetHistory.mockResolvedValue({ items: [], total: 0 });

    renderWithQuery(<HistoryList sectionId="section-001" />);

    await waitFor(() => {
      expect(screen.getByText("履歴がありません")).toBeInTheDocument();
    });
  });

  it("履歴項目がバージョン番号付きで表示される", async () => {
    mockGetHistory.mockResolvedValue(mockResponse);

    renderWithQuery(<HistoryList sectionId="section-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("history-list")).toBeInTheDocument();
    });

    for (const entry of sectionEntries) {
      expect(screen.getByText(`v${entry.version}`)).toBeInTheDocument();
    }
  });

  it("操作種別に応じたBadgeが表示される", async () => {
    mockGetHistory.mockResolvedValue(mockResponse);

    renderWithQuery(<HistoryList sectionId="section-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("history-list")).toBeInTheDocument();
    });

    expect(screen.getByText("追加")).toBeInTheDocument();
    expect(screen.getByText("削除")).toBeInTheDocument();
    expect(screen.getByText("更新")).toBeInTheDocument();
  });

  it("ユーザー名が表示される", async () => {
    mockGetHistory.mockResolvedValue(mockResponse);

    renderWithQuery(<HistoryList sectionId="section-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("history-list")).toBeInTheDocument();
    });

    for (const entry of sectionEntries) {
      expect(
        screen.getAllByText(entry.user.displayName).length,
      ).toBeGreaterThan(0);
    }
  });

  it("payloadが存在する場合、詳細トグルで展開表示される", async () => {
    mockGetHistory.mockResolvedValue(mockResponse);

    renderWithQuery(<HistoryList sectionId="section-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("history-list")).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByText("詳細");
    expect(toggleButtons.length).toBeGreaterThan(0);

    fireEvent.click(toggleButtons[0]);

    const sortedEntries = [...sectionEntries].sort(
      (a, b) => b.version - a.version,
    );
    const firstEntryWithPayload = sortedEntries.find(
      (e) => e.payload != null,
    );
    if (firstEntryWithPayload?.payload) {
      const preElement = screen.getByText((_content, element) => {
        return (
          element?.tagName === "PRE" &&
          element.textContent ===
            JSON.stringify(firstEntryWithPayload.payload, null, 2)
        );
      });
      expect(preElement).toBeInTheDocument();
    }
  });

  it("payloadがnullの場合は詳細トグルが表示されない", async () => {
    const entryWithNullPayload = {
      ...sectionEntries[0],
      id: "history-null-payload",
      payload: null,
    };

    mockGetHistory.mockResolvedValue({
      items: [entryWithNullPayload],
      total: 1,
    });

    renderWithQuery(<HistoryList sectionId="section-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("history-list")).toBeInTheDocument();
    });

    expect(screen.queryByText("詳細")).not.toBeInTheDocument();
  });

  it("全データを一度に取得する（もっと読み込むボタンが表示されない）", async () => {
    mockGetHistory.mockResolvedValue(mockResponse);

    renderWithQuery(<HistoryList sectionId="section-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("history-list")).toBeInTheDocument();
    });

    expect(screen.queryByText("もっと読み込む")).not.toBeInTheDocument();
  });

  it("getHistoryがlimit=1000で呼び出される", async () => {
    mockGetHistory.mockResolvedValue(mockResponse);

    renderWithQuery(<HistoryList sectionId="section-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("history-list")).toBeInTheDocument();
    });

    expect(mockGetHistory).toHaveBeenCalledWith("section-001", {
      limit: 1000,
    });
  });

  it("詳細トグルが展開/閉じできる", async () => {
    mockGetHistory.mockResolvedValue(mockResponse);

    renderWithQuery(<HistoryList sectionId="section-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("history-list")).toBeInTheDocument();
    });

    const toggleButton = screen.getAllByText("詳細")[0];

    fireEvent.click(toggleButton);
    expect(toggleButton.closest("button")).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    fireEvent.click(toggleButton);
    expect(toggleButton.closest("button")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
