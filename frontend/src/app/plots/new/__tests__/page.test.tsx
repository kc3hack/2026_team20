import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatePlotRequest, PlotResponse } from "@/lib/api/types";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/plots/new",
}));

const mockCreateFn = vi.fn<(body: CreatePlotRequest, token?: string) => Promise<PlotResponse>>();

vi.mock("@/lib/api/repositories", () => ({
  plotRepository: {
    create: (...args: Parameters<typeof mockCreateFn>) => mockCreateFn(...args),
  },
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "user-001",
      displayName: "Test User",
      email: "test@example.com",
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00Z",
    },
    session: { access_token: "mock-token" },
    isLoading: false,
    isAuthenticated: true,
    signInWithGitHub: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    handleUnauthorized: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-001",
      displayName: "Test User",
      email: "test@example.com",
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00Z",
    },
    session: { access_token: "mock-token" },
    isLoading: false,
    isAuthenticated: true,
    signInWithGitHub: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    handleUnauthorized: vi.fn(),
  }),
}));

import { createMockPlotResponse } from "@/__tests__/helpers/mockData";
import NewPlotPage from "../page";

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("NewPlotPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ページタイトルとフォームが表示される", () => {
    renderWithQueryClient(<NewPlotPage />);

    expect(screen.getByText("新しいPlotを作成")).toBeInTheDocument();
    expect(screen.getByLabelText("タイトル")).toBeInTheDocument();
    expect(screen.getByLabelText("説明（任意）")).toBeInTheDocument();
    expect(screen.getByLabelText("タグ（任意・カンマ区切り）")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plotを作成" })).toBeInTheDocument();
  });

  it("タイトルが空の場合、送信時にバリデーションエラーが表示される", async () => {
    renderWithQueryClient(<NewPlotPage />);

    const submitButton = screen.getByRole("button", { name: "Plotを作成" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("タイトルは必須です")).toBeInTheDocument();
    });
    expect(mockCreateFn).not.toHaveBeenCalled();
  });

  it("タイトルを入力すると送信ボタンが有効になる", () => {
    renderWithQueryClient(<NewPlotPage />);

    const titleInput = screen.getByLabelText("タイトル");
    fireEvent.change(titleInput, { target: { value: "新しいPlot" } });

    const submitButton = screen.getByRole("button", { name: "Plotを作成" });
    expect(submitButton).toBeEnabled();
  });

  it("フォーム送信で plotRepository.create が呼ばれ、成功後にリダイレクトする", async () => {
    const mockResponse = createMockPlotResponse({ id: "created-plot-id" });
    mockCreateFn.mockResolvedValue(mockResponse);

    renderWithQueryClient(<NewPlotPage />);

    const titleInput = screen.getByLabelText("タイトル");
    fireEvent.change(titleInput, { target: { value: "テストPlot" } });

    const submitButton = screen.getByRole("button", { name: "Plotを作成" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateFn).toHaveBeenCalledWith({ title: "テストPlot" }, "mock-token");
    });

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Plotを作成しました");
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/plots/created-plot-id");
    });
  });

  it("説明とタグを含めて送信できる", async () => {
    const mockResponse = createMockPlotResponse({ id: "plot-with-details" });
    mockCreateFn.mockResolvedValue(mockResponse);

    renderWithQueryClient(<NewPlotPage />);

    fireEvent.change(screen.getByLabelText("タイトル"), {
      target: { value: "詳細ありPlot" },
    });
    fireEvent.change(screen.getByLabelText("説明（任意）"), {
      target: { value: "これは説明文です" },
    });

    const tagInput = screen.getByLabelText("タグ（任意・カンマ区切り）");
    fireEvent.change(tagInput, {
      target: { value: "TypeScript, React" },
    });
    fireEvent.keyDown(tagInput, { key: "Enter" });

    fireEvent.click(screen.getByRole("button", { name: "Plotを作成" }));

    await waitFor(() => {
      expect(mockCreateFn).toHaveBeenCalledWith(
        {
          title: "詳細ありPlot",
          description: "これは説明文です",
          tags: ["TypeScript", "React"],
        },
        "mock-token",
      );
    });
  });

  it("作成失敗時にエラーメッセージを表示する", async () => {
    mockCreateFn.mockRejectedValue(new Error("API Error"));

    renderWithQueryClient(<NewPlotPage />);

    fireEvent.change(screen.getByLabelText("タイトル"), {
      target: { value: "失敗するPlot" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Plotを作成" }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Plotの作成に失敗しました");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("送信中はボタンテキストが「作成中...」に変わる", async () => {
    let resolveCreate: ((value: PlotResponse) => void) | undefined;
    const createPromise = new Promise<PlotResponse>((resolve) => {
      resolveCreate = resolve;
    });
    mockCreateFn.mockReturnValue(createPromise);

    renderWithQueryClient(<NewPlotPage />);

    fireEvent.change(screen.getByLabelText("タイトル"), {
      target: { value: "待機中Plot" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Plotを作成" }));

    expect(await screen.findByText("作成中...")).toBeInTheDocument();

    resolveCreate?.(createMockPlotResponse());

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Plotを作成" })).toBeInTheDocument();
    });
  });
});
