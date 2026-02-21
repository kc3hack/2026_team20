import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAddStar = vi.fn();
const mockRemoveStar = vi.fn();

vi.mock("@/lib/api/repositories", () => ({
  snsRepository: {
    addStar: (...args: unknown[]) => mockAddStar(...args),
    removeStar: (...args: unknown[]) => mockRemoveStar(...args),
  },
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
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

import { useStar } from "../useStar";

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

describe("useStar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = true;
    mockAddStar.mockResolvedValue(undefined);
    mockRemoveStar.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態で count と isStarred が props と一致する", () => {
    const { result } = renderHook(() => useStar("plot-1", 10, false), {
      wrapper: createWrapper(),
    });

    expect(result.current.count).toBe(10);
    expect(result.current.isStarred).toBe(false);
    expect(result.current.isPending).toBe(false);
  });

  it("isStarred=false で toggleStar() → addStar が呼ばれ count が +1", async () => {
    const { result } = renderHook(() => useStar("plot-1", 10, false), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleStar();
    });

    await waitFor(() => {
      expect(result.current.count).toBe(11);
      expect(result.current.isStarred).toBe(true);
    });

    expect(mockAddStar).toHaveBeenCalledWith("plot-1", mockAccessToken);
  });

  it("isStarred=true で toggleStar() → removeStar が呼ばれ count が -1", async () => {
    const { result } = renderHook(() => useStar("plot-1", 10, true), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleStar();
    });

    await waitFor(() => {
      expect(result.current.count).toBe(9);
      expect(result.current.isStarred).toBe(false);
    });

    expect(mockRemoveStar).toHaveBeenCalledWith("plot-1", mockAccessToken);
  });

  it("API 失敗時にロールバックする", async () => {
    mockAddStar.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useStar("plot-1", 10, false), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleStar();
    });

    // 楽観的更新で一旦 +1
    await waitFor(() => {
      expect(result.current.count).toBe(11);
    });

    // API 失敗後にロールバック
    await waitFor(() => {
      expect(result.current.count).toBe(10);
      expect(result.current.isStarred).toBe(false);
    });

    expect(mockToastError).toHaveBeenCalledWith("スターの更新に失敗しました");
  });

  it("未ログインで toggleStar() → API は呼ばれずログインページへリダイレクト", () => {
    mockIsAuthenticated = false;

    const { result } = renderHook(() => useStar("plot-1", 10, false), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleStar();
    });

    expect(mockAddStar).not.toHaveBeenCalled();
    expect(mockRemoveStar).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/auth/login?redirectTo=/plots/plot-1");
  });
});
