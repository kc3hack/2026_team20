"use client";

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SectionAwarenessState } from "@/lib/realtime/types";

type AwarenessModule = typeof import("@/lib/realtime/awareness");

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

const mockGetLockState = vi.fn<AwarenessModule["getLockState"]>(() => "unlocked");
const mockGetLockedBy = vi.fn<AwarenessModule["getLockedBy"]>(() => null);
const mockSetEditingSection = vi.fn<AwarenessModule["setEditingSection"]>();
const mockClearEditingSection = vi.fn<AwarenessModule["clearEditingSection"]>();
const mockOnAwarenessChange = vi.fn<AwarenessModule["onAwarenessChange"]>(
  () => vi.fn(),
);

vi.mock("@/lib/realtime/awareness", () => ({
  getLockState: (
    awareness: Parameters<AwarenessModule["getLockState"]>[0],
    sectionId: Parameters<AwarenessModule["getLockState"]>[1],
    currentUserId: Parameters<AwarenessModule["getLockState"]>[2],
  ) => mockGetLockState(awareness, sectionId, currentUserId),
  getLockedBy: (
    awareness: Parameters<AwarenessModule["getLockedBy"]>[0],
    sectionId: Parameters<AwarenessModule["getLockedBy"]>[1],
  ) => mockGetLockedBy(awareness, sectionId),
  setEditingSection: (
    awareness: Parameters<AwarenessModule["setEditingSection"]>[0],
    sectionId: Parameters<AwarenessModule["setEditingSection"]>[1],
    user: Parameters<AwarenessModule["setEditingSection"]>[2],
  ) => mockSetEditingSection(awareness, sectionId, user),
  clearEditingSection: (
    awareness: Parameters<AwarenessModule["clearEditingSection"]>[0],
    user: Parameters<AwarenessModule["clearEditingSection"]>[1],
  ) => mockClearEditingSection(awareness, user),
  onAwarenessChange: (
    awareness: Parameters<AwarenessModule["onAwarenessChange"]>[0],
    callback: Parameters<AwarenessModule["onAwarenessChange"]>[1],
  ) => mockOnAwarenessChange(awareness, callback),
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

  const providerHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  const mockProvider = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!providerHandlers[event]) providerHandlers[event] = [];
      providerHandlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      const handlers = providerHandlers[event] ?? [];
      providerHandlers[event] = handlers.filter((h) => h !== handler);
    }),
    broadcastLock: vi.fn(),
    broadcastUnlock: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(providerHandlers).forEach((key) => {
      delete providerHandlers[key];
    });
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
      mockOnAwarenessChange.mockImplementation((_awareness, cb) => {
        capturedCallback = () => cb({ added: [], updated: [], removed: [] });
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

    it("section-lock イベント受信時に locked-by-other へ遷移する", async () => {
      const { result } = renderHook(() =>
        useSectionLock("plot-1", "section-1", {
          awareness: mockAwareness,
          provider: mockProvider as never,
        }),
      );

      const locker = { id: "user-2", displayName: "花子", avatarUrl: null };
      act(() => {
        providerHandlers["section-lock"]?.forEach((handler) =>
          handler("section-1", locker),
        );
      });

      expect(result.current.lockState).toBe("locked-by-other");
      expect(result.current.lockedBy).toEqual(locker);

      let acquired: boolean | undefined;
      await act(async () => {
        acquired = await result.current.acquireLock();
      });

      expect(acquired).toBe(false);
      expect(mockSetEditingSection).not.toHaveBeenCalled();
    });

    it("acquireLock()/releaseLock() で lock/unlock broadcast を送る", async () => {
      const { result } = renderHook(() =>
        useSectionLock("plot-1", "section-1", {
          awareness: mockAwareness,
          provider: mockProvider as never,
        }),
      );

      await act(async () => {
        await result.current.acquireLock();
      });

      expect(mockProvider.broadcastLock).toHaveBeenCalledWith("section-1", {
        id: "user-1",
        displayName: "太郎",
        avatarUrl: null,
      });

      act(() => {
        result.current.releaseLock();
      });

      expect(mockProvider.broadcastUnlock).toHaveBeenCalledWith("section-1");
    });
  });

  describe("統合テスト: 実際の y-protocols Awareness", () => {
    beforeEach(() => {
      const actual = vi.importActual<typeof import("@/lib/realtime/awareness")>(
        "@/lib/realtime/awareness",
      );
      actual.then((mod) => {
        mockGetLockState.mockImplementation(mod.getLockState);
        mockGetLockedBy.mockImplementation(mod.getLockedBy);
        mockOnAwarenessChange.mockImplementation(mod.onAwarenessChange);
        mockSetEditingSection.mockImplementation(mod.setEditingSection);
      });
    });

    it("他ユーザーがロック中に acquireLock() が false を返す", async () => {
      const { Doc } = require("yjs");
      const { Awareness } = require("y-protocols/awareness");
      const actualMod = await vi.importActual<typeof import("@/lib/realtime/awareness")>(
        "@/lib/realtime/awareness",
      );
      mockGetLockState.mockImplementation(actualMod.getLockState);
      mockGetLockedBy.mockImplementation(actualMod.getLockedBy);
      mockOnAwarenessChange.mockImplementation(actualMod.onAwarenessChange);

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
      mockGetLockState.mockImplementation(actualMod.getLockState);
      mockGetLockedBy.mockImplementation(actualMod.getLockedBy);
      mockOnAwarenessChange.mockImplementation(actualMod.onAwarenessChange);

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
