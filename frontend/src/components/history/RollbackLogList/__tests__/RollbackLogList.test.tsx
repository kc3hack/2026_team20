import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RollbackLogListResponse } from "@/lib/api/types";
import { mockRollbackLogs } from "@/mocks/data/snapshots";

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ session: { access_token: "test-token" } }),
}));

vi.mock("@/lib/api/repositories/snapshotRepository", () => ({
  getRollbackLogs: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    detail: string;
    constructor(status: number, detail: string) {
      super(detail);
      this.status = status;
      this.detail = detail;
      this.name = "ApiError";
    }
  },
}));

import * as snapshotRepository from "@/lib/api/repositories/snapshotRepository";
import { ApiError } from "@/lib/api/client";
import { RollbackLogList } from "../RollbackLogList";

const mockGetRollbackLogs = vi.mocked(snapshotRepository.getRollbackLogs);

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const plotLogs = mockRollbackLogs.filter((l) => l.plotId === "plot-001");

const mockListResponse: RollbackLogListResponse = {
  items: plotLogs,
  total: plotLogs.length,
};

describe("RollbackLogList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中はスケルトンを表示する", () => {
    mockGetRollbackLogs.mockReturnValue(new Promise(() => {}));

    renderWithQuery(<RollbackLogList plotId="plot-001" />);

    expect(screen.getByTestId("rollback-log-list-loading")).toBeInTheDocument();
  });

  it("データが空の場合は「ロールバック履歴がありません」を表示する", async () => {
    mockGetRollbackLogs.mockResolvedValue({ items: [], total: 0 });

    renderWithQuery(<RollbackLogList plotId="plot-001" />);

    await waitFor(() => {
      expect(
        screen.getByText("ロールバック履歴がありません"),
      ).toBeInTheDocument();
    });
  });

  it("監査ログ項目がスナップショットバージョン付きで表示される", async () => {
    mockGetRollbackLogs.mockResolvedValue(mockListResponse);

    renderWithQuery(<RollbackLogList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("rollback-log-list")).toBeInTheDocument();
    });

    for (const log of plotLogs) {
      expect(screen.getByText(`v${log.snapshotVersion}`)).toBeInTheDocument();
    }
  });

  it("ユーザー名が表示される", async () => {
    mockGetRollbackLogs.mockResolvedValue(mockListResponse);

    renderWithQuery(<RollbackLogList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("rollback-log-list")).toBeInTheDocument();
    });

    for (const log of plotLogs) {
      expect(
        screen.getAllByText(log.user.displayName).length,
      ).toBeGreaterThan(0);
    }
  });

  it("reasonがnullの場合は「理由なし」を表示する", async () => {
    mockGetRollbackLogs.mockResolvedValue(mockListResponse);

    renderWithQuery(<RollbackLogList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("rollback-log-list")).toBeInTheDocument();
    });

    const logWithNullReason = plotLogs.find((l) => l.reason === null);
    expect(logWithNullReason).toBeDefined();
    expect(screen.getByText("理由なし")).toBeInTheDocument();
  });

  it("reasonが存在する場合はその内容を表示する", async () => {
    mockGetRollbackLogs.mockResolvedValue(mockListResponse);

    renderWithQuery(<RollbackLogList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("rollback-log-list")).toBeInTheDocument();
    });

    const logWithReason = plotLogs.find((l) => l.reason !== null);
    expect(logWithReason).toBeDefined();
    expect(screen.getByText(logWithReason!.reason!)).toBeInTheDocument();
  });

  it("監査ログが実行日時の降順で表示される（API順序を維持）", async () => {
    mockGetRollbackLogs.mockResolvedValue(mockListResponse);

    renderWithQuery(<RollbackLogList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("rollback-log-list")).toBeInTheDocument();
    });

    const items = screen.getAllByTestId(/^rollback-log-item-/);
    expect(items.length).toBe(plotLogs.length);

    plotLogs.forEach((log, index) => {
      expect(items[index]).toHaveAttribute(
        "data-testid",
        `rollback-log-item-${log.id}`,
      );
    });
  });

  it("403エラー時はコンポーネントが非表示になる", async () => {
    mockGetRollbackLogs.mockRejectedValue(new ApiError(403, "Forbidden"));

    const { container } = renderWithQuery(
      <RollbackLogList plotId="plot-403" />,
    );

    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("403エラー時にonErrorコールバックが呼ばれる", async () => {
    const onError = vi.fn();
    mockGetRollbackLogs.mockRejectedValue(new ApiError(403, "Forbidden"));

    renderWithQuery(
      <RollbackLogList plotId="plot-403" onError={onError} />,
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it("totalがLIMIT以下の場合は「もっと読み込む」ボタンが表示されない", async () => {
    mockGetRollbackLogs.mockResolvedValue(mockListResponse);

    renderWithQuery(<RollbackLogList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("rollback-log-list")).toBeInTheDocument();
    });

    expect(screen.queryByText("もっと読み込む")).not.toBeInTheDocument();
  });

  it("totalがLIMITを超える場合は「もっと読み込む」ボタンが表示される", async () => {
    mockGetRollbackLogs.mockResolvedValue({
      items: plotLogs,
      total: 50,
    });

    renderWithQuery(<RollbackLogList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("rollback-log-list")).toBeInTheDocument();
    });

    expect(screen.getByText("もっと読み込む")).toBeInTheDocument();
  });

  it("「もっと読み込む」クリックでoffsetを加算してgetRollbackLogsを再呼び出しする", async () => {
    mockGetRollbackLogs.mockResolvedValue({
      items: plotLogs,
      total: 50,
    });

    renderWithQuery(<RollbackLogList plotId="plot-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("rollback-log-list")).toBeInTheDocument();
    });

    expect(mockGetRollbackLogs).toHaveBeenCalledWith("plot-001", {
      limit: 20,
      offset: 0,
    }, "test-token");

    fireEvent.click(screen.getByText("もっと読み込む"));

    await waitFor(() => {
      expect(mockGetRollbackLogs).toHaveBeenCalledWith("plot-001", {
        limit: 20,
        offset: 20,
      }, "test-token");
    });
  });
});
