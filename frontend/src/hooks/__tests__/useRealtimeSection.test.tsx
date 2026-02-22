"use client";

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock: AuthProvider ──────────────────────────────────────────
const mockUser = {
  id: "user-1",
  email: "taro@example.com",
  displayName: "太郎",
  avatarUrl: null,
  createdAt: "2026-02-20T00:00:00Z",
};

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: mockUser,
    session: { access_token: "mock-token" },
    isLoading: false,
    isAuthenticated: true,
    signInWithGitHub: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    handleUnauthorized: vi.fn(),
  }),
}));

// テスト対象の遅延インポート（mock設定後にインポートする）
import { useRealtimeSection } from "../useRealtimeSection";

describe("useRealtimeSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "true");
  });

  describe("Mock モード", () => {
    it("liveContent が null を返す", () => {
      const { result } = renderHook(() =>
        useRealtimeSection("plot-1", "section-1", true),
      );

      expect(result.current.liveContent).toBeNull();
    });

    it("connectionStatus が disconnected を返す", () => {
      const { result } = renderHook(() =>
        useRealtimeSection("plot-1", "section-1", true),
      );

      expect(result.current.connectionStatus).toBe("disconnected");
    });

    it("enabled=false のとき liveContent は null、connectionStatus は disconnected", () => {
      const { result } = renderHook(() =>
        useRealtimeSection("plot-1", "section-1", false),
      );

      expect(result.current.liveContent).toBeNull();
      expect(result.current.connectionStatus).toBe("disconnected");
    });
  });

  describe("Realtime モード", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    });

    it("enabled=false のとき no-op を返す", () => {
      const { result } = renderHook(() =>
        useRealtimeSection("plot-1", "section-1", false),
      );

      expect(result.current.liveContent).toBeNull();
      expect(result.current.connectionStatus).toBe("disconnected");
    });

    it("ydoc なしの場合は disconnected を返す", () => {
      const { result } = renderHook(() =>
        useRealtimeSection("plot-1", "section-1", true),
      );

      expect(result.current.liveContent).toBeNull();
      expect(result.current.connectionStatus).toBe("disconnected");
    });

    it("ydoc ありの場合 connecting 状態で初期化される", () => {
      const mockDoc: { on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn> } = {
        on: vi.fn(),
        off: vi.fn(),
      };

      const { result } = renderHook(() =>
        useRealtimeSection("plot-1", "section-1", true, { ydoc: mockDoc }),
      );

      expect(result.current.connectionStatus).toBe("connecting");
    });
  });
});
