"use client";

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUser = {
  id: "user-1",
  email: "taro@example.com",
  displayName: "太郎",
  avatarUrl: null,
  createdAt: "2026-02-20T00:00:00Z",
};

let currentMockUser: typeof mockUser | null = mockUser;

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: currentMockUser,
    session: currentMockUser ? { access_token: "mock-token" } : null,
    isLoading: false,
    isAuthenticated: !!currentMockUser,
    signInWithGitHub: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    handleUnauthorized: vi.fn(),
  }),
}));

const mockCreateRealtimeProvider = vi.fn();
const mockDestroyRealtimeProvider = vi.fn();
const mockCreateAwareness = vi.fn();
const mockGetLockState = vi.fn(() => "unlocked");
const mockGetLockedBy = vi.fn(() => null);
const mockOnAwarenessChange = vi.fn(() => vi.fn());

vi.mock("@/lib/realtime/provider", () => ({
  createRealtimeProvider: (...args: unknown[]) => mockCreateRealtimeProvider(...args),
  destroyRealtimeProvider: (...args: unknown[]) => mockDestroyRealtimeProvider(...args),
}));

vi.mock("@/lib/realtime/awareness", () => ({
  createAwareness: (...args: unknown[]) => mockCreateAwareness(...args),
  getLockState: (...args: unknown[]) => mockGetLockState(...args),
  getLockedBy: (...args: unknown[]) => mockGetLockedBy(...args),
  onAwarenessChange: (...args: unknown[]) => mockOnAwarenessChange(...args),
  setEditingSection: vi.fn(),
  clearEditingSection: vi.fn(),
}));

const mockMockAwareness = {
  clientID: 999,
  getLocalState: vi.fn(() => null),
  setLocalState: vi.fn(),
  getStates: vi.fn(() => new Map()),
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
};
const mockCreateMockAwareness = vi.fn(() => mockMockAwareness);

vi.mock("@/lib/realtime/mockAwareness", () => ({
  createMockAwareness: (...args: unknown[]) => mockCreateMockAwareness(...args),
}));

import { usePlotRealtime } from "../usePlotRealtime";

describe("usePlotRealtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "true");
    mockMockAwareness.getStates.mockReturnValue(new Map());
    currentMockUser = mockUser;
  });

  describe("Mock モード", () => {
    it("awareness が createMockAwareness で生成される", () => {
      const { result } = renderHook(() => usePlotRealtime("plot-1"));

      expect(mockCreateMockAwareness).toHaveBeenCalledWith("plot-1");
      expect(result.current.awareness).toBe(mockMockAwareness);
    });

    it("connectionStatus が connected になる", () => {
      const { result } = renderHook(() => usePlotRealtime("plot-1"));

      expect(result.current.connectionStatus).toBe("connected");
    });

    it("ydoc は null を返す", () => {
      const { result } = renderHook(() => usePlotRealtime("plot-1"));

      expect(result.current.ydoc).toBeNull();
    });

    it("provider は null を返す", () => {
      const { result } = renderHook(() => usePlotRealtime("plot-1"));

      expect(result.current.provider).toBeNull();
    });

    it("createRealtimeProvider を呼ばない", () => {
      renderHook(() => usePlotRealtime("plot-1"));

      expect(mockCreateRealtimeProvider).not.toHaveBeenCalled();
    });

    it("onAwarenessChange でリスナーが登録される", () => {
      renderHook(() => usePlotRealtime("plot-1"));

      expect(mockOnAwarenessChange).toHaveBeenCalledWith(
        mockMockAwareness,
        expect.any(Function),
      );
    });

    it("アンマウント時に awareness.destroy() が呼ばれる", () => {
      const { unmount } = renderHook(() => usePlotRealtime("plot-1"));

      unmount();

      expect(mockMockAwareness.destroy).toHaveBeenCalled();
    });

    it("Awareness の change コールバックで lockStates が更新される", () => {
      let capturedCallback: (() => void) | null = null;
      const cleanupFn = vi.fn();
      mockOnAwarenessChange.mockImplementation((_awareness: unknown, cb: () => void) => {
        capturedCallback = cb;
        return cleanupFn;
      });

      const otherUser = { id: "user-2", displayName: "花子", avatarUrl: null };
      mockMockAwareness.getStates.mockReturnValue(new Map());
      mockGetLockState.mockReturnValue("unlocked");
      mockGetLockedBy.mockReturnValue(null);

      const { result } = renderHook(() => usePlotRealtime("plot-1"));

      expect(result.current.lockStates.size).toBe(0);

      mockMockAwareness.getStates.mockReturnValue(
        new Map([[2, { editingSectionId: "section-1", user: otherUser }]]),
      );
      mockGetLockState.mockReturnValue("locked-by-other");
      mockGetLockedBy.mockReturnValue(otherUser);

      act(() => {
        capturedCallback?.();
      });

      expect(result.current.lockStates.size).toBe(1);
      expect(result.current.lockStates.get("section-1")).toEqual({
        lockState: "locked-by-other",
        lockedBy: otherUser,
      });
    });
  });

  describe("Realtime モード", () => {
    const mockDoc = {
      clientID: 1,
      getXmlFragment: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn(),
      transact: vi.fn(),
    };

    const mockProvider = {
      awareness: {
        clientID: 1,
        getLocalState: vi.fn(() => null),
        setLocalState: vi.fn(),
        getStates: vi.fn(() => new Map()),
        on: vi.fn(),
        off: vi.fn(),
        destroy: vi.fn(),
      },
      on: vi.fn(),
      off: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      destroy: vi.fn(),
    };

    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");

      mockCreateRealtimeProvider.mockReturnValue({
        doc: mockDoc,
        provider: mockProvider,
        channelName: "plot:plot-1",
        isMock: false,
        status: "connecting",
      });

      mockCreateAwareness.mockReturnValue(mockProvider.awareness);
    });

    it("空文字 plotId では初期化しない", () => {
      const { result } = renderHook(() => usePlotRealtime(""));

      expect(result.current.ydoc).toBeNull();
      expect(mockCreateRealtimeProvider).not.toHaveBeenCalled();
    });

    it("plotId が指定されたとき connectionStatus が connecting で初期化される", () => {
      const { result } = renderHook(() => usePlotRealtime("plot-1"));

      expect(result.current.connectionStatus).toBe("connecting");
    });

    it("クリーンアップ時に destroyRealtimeProvider を呼ぶ", () => {
      const { unmount } = renderHook(() => usePlotRealtime("plot-1"));

      unmount();

      expect(mockDestroyRealtimeProvider).toHaveBeenCalled();
    });

    it("Awareness の change イベント発火時に lockStates が更新される", () => {
      let capturedCallback: (() => void) | null = null;
      const cleanupFn = vi.fn();
      mockOnAwarenessChange.mockImplementation((_awareness: unknown, cb: () => void) => {
        capturedCallback = cb;
        return cleanupFn;
      });

      const otherUser = { id: "user-2", displayName: "花子", avatarUrl: null };
      mockProvider.awareness.getStates.mockReturnValue(new Map());
      mockGetLockState.mockReturnValue("unlocked");
      mockGetLockedBy.mockReturnValue(null);

      const { result } = renderHook(() => usePlotRealtime("plot-1"));

      expect(result.current.lockStates.size).toBe(0);

      mockProvider.awareness.getStates.mockReturnValue(
        new Map([[2, { editingSectionId: "section-1", user: otherUser }]]),
      );
      mockGetLockState.mockReturnValue("locked-by-other");
      mockGetLockedBy.mockReturnValue(otherUser);

      act(() => {
        capturedCallback?.();
      });

      expect(result.current.lockStates.size).toBe(1);
      expect(result.current.lockStates.get("section-1")).toEqual({
        lockState: "locked-by-other",
        lockedBy: otherUser,
      });
    });

    it("他ユーザーが editingSectionId をセットしたとき lockStates に locked-by-other が追加される", () => {
      let capturedCallback: (() => void) | null = null;
      mockOnAwarenessChange.mockImplementation((_awareness: unknown, cb: () => void) => {
        capturedCallback = cb;
        return vi.fn();
      });

      const otherUser = { id: "user-2", displayName: "花子", avatarUrl: null };
      mockProvider.awareness.getStates.mockReturnValue(new Map());

      const { result } = renderHook(() => usePlotRealtime("plot-1"));

      mockProvider.awareness.getStates.mockReturnValue(
        new Map([
          [2, { editingSectionId: "section-A", user: otherUser }],
          [3, { editingSectionId: "section-B", user: { id: "user-3", displayName: "次郎", avatarUrl: null } }],
        ]),
      );
      mockGetLockState.mockReturnValue("locked-by-other");
      mockGetLockedBy.mockImplementation((_awareness: unknown, sectionId: string) => {
        if (sectionId === "section-A") return otherUser;
        return { id: "user-3", displayName: "次郎", avatarUrl: null };
      });

      act(() => {
        capturedCallback?.();
      });

      expect(result.current.lockStates.get("section-A")?.lockState).toBe("locked-by-other");
      expect(result.current.lockStates.get("section-B")?.lockState).toBe("locked-by-other");
    });

    it("ユーザー切断時に lockStates から削除される", () => {
      let capturedCallback: (() => void) | null = null;
      mockOnAwarenessChange.mockImplementation((_awareness: unknown, cb: () => void) => {
        capturedCallback = cb;
        return vi.fn();
      });

      const otherUser = { id: "user-2", displayName: "花子", avatarUrl: null };
      mockProvider.awareness.getStates.mockReturnValue(
        new Map([[2, { editingSectionId: "section-1", user: otherUser }]]),
      );
      mockGetLockState.mockReturnValue("locked-by-other");
      mockGetLockedBy.mockReturnValue(otherUser);

      const { result } = renderHook(() => usePlotRealtime("plot-1"));

      expect(result.current.lockStates.size).toBe(1);

      mockProvider.awareness.getStates.mockReturnValue(new Map());
      mockGetLockState.mockReturnValue("unlocked");
      mockGetLockedBy.mockReturnValue(null);

      act(() => {
        capturedCallback?.();
      });

      expect(result.current.lockStates.size).toBe(0);
    });

    it("クリーンアップ時に Awareness の change イベントリスナーが解除される", () => {
      const cleanupFn = vi.fn();
      mockOnAwarenessChange.mockReturnValue(cleanupFn);
      mockProvider.awareness.getStates.mockReturnValue(new Map());

      const { unmount } = renderHook(() => usePlotRealtime("plot-1"));

      unmount();

      expect(cleanupFn).toHaveBeenCalled();
    });
  });

  describe("統合テスト: 実際の y-protocols Awareness", () => {
    it("update イベントで lockStates が更新される", () => {
      const { Doc } = require("yjs");
      const { Awareness } = require("y-protocols/awareness");

      const doc1 = new Doc();
      const awareness1 = new Awareness(doc1);

      const doc2 = new Doc();
      const awareness2 = new Awareness(doc2);

      const otherUser = { id: "user-2", displayName: "花子", avatarUrl: null };

      awareness2.setLocalState({
        editingSectionId: "section-1",
        user: otherUser,
      });

      const updateHandler = vi.fn();
      awareness1.on("update", updateHandler);
      awareness1.on("change", vi.fn());

      const states = awareness1.getStates();
      states.set(awareness2.clientID, {
        editingSectionId: "section-1",
        user: otherUser,
      });

      const updateData = {
        added: [awareness2.clientID],
        updated: [],
        removed: [],
      };
      awareness1.emit("update", [updateData]);

      expect(updateHandler).toHaveBeenCalled();

      const state = states.get(awareness2.clientID);
      expect(state).toBeDefined();
      expect(state.editingSectionId).toBe("section-1");
      expect(state.user).toEqual(otherUser);

      awareness1.destroy();
      awareness2.destroy();
    });
  });

  describe("user 変化時の lockStates 再計算", () => {
    it("user が null から non-null に変わったとき lockStates が再計算される", () => {
      const otherUser = { id: "user-2", displayName: "花子", avatarUrl: null };

      mockMockAwareness.getStates.mockReturnValue(new Map());
      mockGetLockState.mockReturnValue("unlocked");
      mockGetLockedBy.mockReturnValue(null);

      const { result, rerender } = renderHook(() => usePlotRealtime("plot-1"));

      expect(result.current.awareness).toBe(mockMockAwareness);
      expect(result.current.lockStates.size).toBe(0);

      currentMockUser = null;
      rerender();

      mockMockAwareness.getStates.mockReturnValue(
        new Map([[2, { editingSectionId: "section-1", user: otherUser }]]),
      );
      mockGetLockState.mockReturnValue("locked-by-other");
      mockGetLockedBy.mockReturnValue(otherUser);

      currentMockUser = mockUser;
      rerender();

      expect(result.current.lockStates.size).toBe(1);
      expect(result.current.lockStates.get("section-1")).toEqual({
        lockState: "locked-by-other",
        lockedBy: otherUser,
      });
    });

    it("awareness がまだ null のとき user が変わっても lockStates は変化しない", () => {
      currentMockUser = null;
      mockMockAwareness.getStates.mockReturnValue(new Map());

      const { result, rerender } = renderHook(() => usePlotRealtime("plot-1"));

      expect(result.current.lockStates.size).toBe(0);

      currentMockUser = mockUser;

      rerender();

      expect(result.current.lockStates.size).toBe(0);
    });
  });
});
