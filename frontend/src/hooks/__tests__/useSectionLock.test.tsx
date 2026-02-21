"use client";

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LockState } from "@/lib/realtime/types";

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

const mockGetLockState = vi.fn<() => LockState>(() => "unlocked");
const mockGetLockedBy = vi.fn(() => null);
const mockSetEditingSection = vi.fn();
const mockClearEditingSection = vi.fn();
const mockOnAwarenessChange = vi.fn(() => vi.fn());

vi.mock("@/lib/realtime/awareness", () => ({
  getLockState: (...args: unknown[]) => mockGetLockState(...args),
  getLockedBy: (...args: unknown[]) => mockGetLockedBy(...args),
  setEditingSection: (...args: unknown[]) => mockSetEditingSection(...args),
  clearEditingSection: (...args: unknown[]) => mockClearEditingSection(...args),
  onAwarenessChange: (...args: unknown[]) => mockOnAwarenessChange(...args),
}));

import { useSectionLock } from "../useSectionLock";

describe("useSectionLock", () => {
  const mockAwareness = {
    clientID: 1,
    getLocalState: vi.fn(() => null),
    setLocalState: vi.fn(),
    getStates: vi.fn(() => new Map()),
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLockState.mockReturnValue("unlocked");
    mockGetLockedBy.mockReturnValue(null);
  });

  describe("awareness 未設定", () => {
    it("awareness が null の場合 lockState は unknown のまま", () => {
      const { result } = renderHook(() =>
        useSectionLock("plot-1", "section-1"),
      );

      expect(result.current.lockState).toBe("unknown");
    });

    it("awareness が null の場合 acquireLock() は false を返す", async () => {
      const { result } = renderHook(() =>
        useSectionLock("plot-1", "section-1"),
      );

      let acquired: boolean | undefined;
      await act(async () => {
        acquired = await result.current.acquireLock();
      });

      expect(acquired).toBe(false);
    });

    it("lockedBy は null を返す", () => {
      const { result } = renderHook(() =>
        useSectionLock("plot-1", "section-1"),
      );

      expect(result.current.lockedBy).toBeNull();
    });
  });

  describe("awareness 設定済み", () => {
    it("awareness を渡した時に getLockState の結果で初期化される", () => {
      mockGetLockState.mockReturnValue("unlocked");
      mockGetLockedBy.mockReturnValue(null);

      const { result } = renderHook(() =>
        useSectionLock("plot-1", "section-1", { awareness: mockAwareness }),
      );

      expect(result.current.lockState).toBe("unlocked");
      expect(mockGetLockState).toHaveBeenCalledWith(mockAwareness, "section-1", "user-1");
    });

    it("acquireLock() は setEditingSection を呼び locked-by-me に遷移する", async () => {
      mockGetLockState.mockReturnValue("unlocked");

      const { result } = renderHook(() =>
        useSectionLock("plot-1", "section-1", { awareness: mockAwareness }),
      );

      let acquired: boolean | undefined;
      await act(async () => {
        acquired = await result.current.acquireLock();
      });

      expect(acquired).toBe(true);
      expect(result.current.lockState).toBe("locked-by-me");
      expect(mockSetEditingSection).toHaveBeenCalledWith(
        mockAwareness,
        "section-1",
        { id: "user-1", displayName: "太郎", avatarUrl: null },
      );
    });

    it("releaseLock() は clearEditingSection を呼び unlocked に遷移する", async () => {
      mockGetLockState.mockReturnValue("unlocked");

      const { result } = renderHook(() =>
        useSectionLock("plot-1", "section-1", { awareness: mockAwareness }),
      );

      await act(async () => {
        await result.current.acquireLock();
      });

      act(() => {
        result.current.releaseLock();
      });

      expect(result.current.lockState).toBe("unlocked");
      expect(mockClearEditingSection).toHaveBeenCalledWith(
        mockAwareness,
        { id: "user-1", displayName: "太郎", avatarUrl: null },
      );
    });

    it("onAwarenessChange コールバック発火時に lockState が更新される", () => {
      let capturedCallback: (() => void) | null = null;
      mockOnAwarenessChange.mockImplementation((_awareness: unknown, cb: () => void) => {
        capturedCallback = cb;
        return vi.fn();
      });

      mockGetLockState.mockReturnValue("unlocked");
      mockGetLockedBy.mockReturnValue(null);

      const { result } = renderHook(() =>
        useSectionLock("plot-1", "section-1", { awareness: mockAwareness }),
      );

      expect(result.current.lockState).toBe("unlocked");

      const otherUser = { id: "user-2", displayName: "花子", avatarUrl: null };
      mockGetLockState.mockReturnValue("locked-by-other");
      mockGetLockedBy.mockReturnValue(otherUser);

      act(() => {
        capturedCallback?.();
      });

      expect(result.current.lockState).toBe("locked-by-other");
      expect(result.current.lockedBy).toEqual(otherUser);
    });

    it("他ユーザーがロック中なら acquireLock() が false を返す", async () => {
      mockGetLockState.mockReturnValue("locked-by-other");
      mockGetLockedBy.mockReturnValue({ id: "user-2", displayName: "花子", avatarUrl: null });

      const { result } = renderHook(() =>
        useSectionLock("plot-1", "section-1", { awareness: mockAwareness }),
      );

      let acquired: boolean | undefined;
      await act(async () => {
        acquired = await result.current.acquireLock();
      });

      expect(acquired).toBe(false);
      expect(mockSetEditingSection).not.toHaveBeenCalled();
    });
  });

  describe("統合テスト: 実際の y-protocols Awareness", () => {
    beforeEach(() => {
      const actual = vi.importActual<typeof import("@/lib/realtime/awareness")>(
        "@/lib/realtime/awareness",
      );
      actual.then((mod) => {
        mockGetLockState.mockImplementation(
          (...args: unknown[]) => (mod.getLockState as (...a: unknown[]) => unknown)(...args),
        );
        mockGetLockedBy.mockImplementation(
          (...args: unknown[]) => (mod.getLockedBy as (...a: unknown[]) => unknown)(...args),
        );
        mockOnAwarenessChange.mockImplementation(
          (...args: unknown[]) => (mod.onAwarenessChange as (...a: unknown[]) => unknown)(...args),
        );
        mockSetEditingSection.mockImplementation(
          (...args: unknown[]) => (mod.setEditingSection as (...a: unknown[]) => unknown)(...args),
        );
      });
    });

    it("他ユーザーがロック中に acquireLock() が false を返す", async () => {
      const { Doc } = require("yjs");
      const { Awareness } = require("y-protocols/awareness");
      const actualMod = await vi.importActual<typeof import("@/lib/realtime/awareness")>(
        "@/lib/realtime/awareness",
      );
      mockGetLockState.mockImplementation(
        (...args: unknown[]) => (actualMod.getLockState as (...a: unknown[]) => unknown)(...args),
      );
      mockGetLockedBy.mockImplementation(
        (...args: unknown[]) => (actualMod.getLockedBy as (...a: unknown[]) => unknown)(...args),
      );
      mockOnAwarenessChange.mockImplementation(
        (...args: unknown[]) => (actualMod.onAwarenessChange as (...a: unknown[]) => unknown)(...args),
      );

      const doc = new Doc();
      const awareness = new Awareness(doc);

      const otherUser = { id: "user-2", displayName: "花子", avatarUrl: null };

      awareness.getStates().set(42, {
        editingSectionId: "section-1",
        user: otherUser,
      });

      const { result } = renderHook(() =>
        useSectionLock("plot-1", "section-1", { awareness: awareness as never }),
      );

      let acquired: boolean | undefined;
      await act(async () => {
        acquired = await result.current.acquireLock();
      });

      expect(acquired).toBe(false);

      awareness.destroy();
    });

    it("update イベント経由で lockState が反映される", async () => {
      const { Doc } = require("yjs");
      const { Awareness } = require("y-protocols/awareness");
      const actualMod = await vi.importActual<typeof import("@/lib/realtime/awareness")>(
        "@/lib/realtime/awareness",
      );
      mockGetLockState.mockImplementation(
        (...args: unknown[]) => (actualMod.getLockState as (...a: unknown[]) => unknown)(...args),
      );
      mockGetLockedBy.mockImplementation(
        (...args: unknown[]) => (actualMod.getLockedBy as (...a: unknown[]) => unknown)(...args),
      );
      mockOnAwarenessChange.mockImplementation(
        (...args: unknown[]) => (actualMod.onAwarenessChange as (...a: unknown[]) => unknown)(...args),
      );

      const doc = new Doc();
      const awareness = new Awareness(doc);

      const { result } = renderHook(() =>
        useSectionLock("plot-1", "section-1", { awareness: awareness as never }),
      );

      expect(result.current.lockState).toBe("unlocked");

      const otherUser = { id: "user-2", displayName: "花子", avatarUrl: null };
      awareness.getStates().set(42, {
        editingSectionId: "section-1",
        user: otherUser,
      });

      act(() => {
        awareness.emit("update", [
          { added: [42], updated: [], removed: [] },
        ]);
      });

      expect(result.current.lockState).toBe("locked-by-other");
      expect(result.current.lockedBy).toEqual(otherUser);

      awareness.destroy();
    });
  });
});
