import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFork = vi.fn();

vi.mock("@/lib/api/repositories", () => ({
  snsRepository: {
    fork: (...args: unknown[]) => mockFork(...args),
  },
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

let mockIsAuthenticated = true;
const mockAccessToken = "test-token";

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    session: mockIsAuthenticated ? { access_token: mockAccessToken } : null,
    user: mockIsAuthenticated ? { id: "user-1", displayName: "Test" } : null,
    isLoading: false,
    isAuthenticated: mockIsAuthenticated,
    signInWithGitHub: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    handleUnauthorized: vi.fn(),
  }),
}));

import { ForkButton } from "../ForkButton";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("ForkButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = true;
    mockFork.mockResolvedValue({ id: "new-plot-id" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ボタンクリックで確認ダイアログが表示される", async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <ForkButton plotId="plot-001" />
      </Wrapper>,
    );

    await user.click(screen.getByRole("button", { name: /フォーク/ }));

    expect(screen.getByText("このPlotをフォークしますか？")).toBeInTheDocument();
  });

  it("ダイアログで「フォーク」押下で API 呼出", async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <ForkButton plotId="plot-001" />
      </Wrapper>,
    );

    await user.click(screen.getByRole("button", { name: /フォーク/ }));
    const forkButtons = screen.getAllByRole("button", { name: /フォーク/ });
    const dialogForkButton = forkButtons.find((btn) => btn.closest("[data-slot='dialog-content']"));
    expect(dialogForkButton).toBeTruthy();
    await user.click(dialogForkButton as HTMLElement);

    await waitFor(() => {
      expect(mockFork).toHaveBeenCalledWith("plot-001", undefined, mockAccessToken);
    });
  });

  it("成功時に toast と遷移", async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <ForkButton plotId="plot-001" />
      </Wrapper>,
    );

    await user.click(screen.getByRole("button", { name: /フォーク/ }));
    const forkButtons = screen.getAllByRole("button", { name: /フォーク/ });
    const dialogForkButton = forkButtons.find((btn) => btn.closest("[data-slot='dialog-content']"));
    expect(dialogForkButton).toBeTruthy();
    await user.click(dialogForkButton as HTMLElement);

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("フォークしました");
    });

    expect(mockPush).toHaveBeenCalledWith("/plots/new-plot-id");
  });

  it("「キャンセル」でダイアログが閉じる", async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <ForkButton plotId="plot-001" />
      </Wrapper>,
    );

    await user.click(screen.getByRole("button", { name: /フォーク/ }));
    expect(screen.getByText("このPlotをフォークしますか？")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /キャンセル/ }));

    await waitFor(() => {
      expect(screen.queryByText("このPlotをフォークしますか？")).not.toBeInTheDocument();
    });

    expect(mockFork).not.toHaveBeenCalled();
  });

  it("未ログインでボタンクリック → ログインページへリダイレクト", async () => {
    mockIsAuthenticated = false;
    const user = userEvent.setup();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <ForkButton plotId="plot-001" />
      </Wrapper>,
    );

    await user.click(screen.getByRole("button", { name: /フォーク/ }));

    expect(mockPush).toHaveBeenCalledWith("/auth/login?redirectTo=/plots/plot-001");
    expect(screen.queryByText("このPlotをフォークしますか？")).not.toBeInTheDocument();
  });
});
