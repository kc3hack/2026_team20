import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlotListResponse, UserProfileResponse } from "@/lib/api/types";

const mockGetUserProfile = vi.fn();
const mockGetUserPlots = vi.fn();
const mockGetUserContributions = vi.fn();

vi.mock("@/lib/api/repositories", () => ({
  authRepository: {
    getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
    getUserPlots: (...args: unknown[]) => mockGetUserPlots(...args),
    getUserContributions: (...args: unknown[]) => mockGetUserContributions(...args),
  },
}));

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    session: null,
    user: null,
    isLoading: false,
    isAuthenticated: false,
    signInWithGitHub: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    handleUnauthorized: vi.fn(),
  }),
}));

import { useUserProfile, useUserPlots, useUserContributions } from "../useUser";

const mockProfileResponse: UserProfileResponse = {
  id: "user-001",
  displayName: "田中太郎",
  avatarUrl: "https://example.com/avatar.png",
  plotCount: 10,
  contributionCount: 50,
  createdAt: "2026-01-15T09:00:00Z",
};

const mockPlotListResponse: PlotListResponse = {
  items: [
    {
      id: "plot-1",
      title: "Test Plot",
      description: null,
      tags: ["test"],
      ownerId: "user-001",
      starCount: 10,
      isStarred: false,
      isPaused: false,
      thumbnailUrl: null,
      version: 1,
      createdAt: "2026-02-20T00:00:00Z",
      updatedAt: "2026-02-20T00:00:00Z",
    },
  ],
  total: 1,
  limit: 20,
  offset: 0,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useUser hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserProfile.mockResolvedValue(mockProfileResponse);
    mockGetUserPlots.mockResolvedValue(mockPlotListResponse);
    mockGetUserContributions.mockResolvedValue(mockPlotListResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useUserProfile", () => {
    it("username を渡してリポジトリを呼び出す", async () => {
      const { result } = renderHook(() => useUserProfile("tanaka"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetUserProfile).toHaveBeenCalledWith("tanaka", undefined);
      expect(result.current.data).toEqual(mockProfileResponse);
    });

    it("空文字 username ではクエリが無効化される", () => {
      const { result } = renderHook(() => useUserProfile(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetUserProfile).not.toHaveBeenCalled();
    });
  });

  describe("useUserPlots", () => {
    it("username を渡してリポジトリを呼び出す", async () => {
      const { result } = renderHook(() => useUserPlots("tanaka"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetUserPlots).toHaveBeenCalledWith("tanaka", undefined, undefined);
      expect(result.current.data).toEqual(mockPlotListResponse);
    });

    it("空文字 username ではクエリが無効化される", () => {
      const { result } = renderHook(() => useUserPlots(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetUserPlots).not.toHaveBeenCalled();
    });
  });

  describe("useUserContributions", () => {
    it("username を渡してリポジトリを呼び出す", async () => {
      const { result } = renderHook(() => useUserContributions("tanaka"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetUserContributions).toHaveBeenCalledWith("tanaka", undefined, undefined);
      expect(result.current.data).toEqual(mockPlotListResponse);
    });

    it("空文字 username ではクエリが無効化される", () => {
      const { result } = renderHook(() => useUserContributions(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetUserContributions).not.toHaveBeenCalled();
    });
  });
});
