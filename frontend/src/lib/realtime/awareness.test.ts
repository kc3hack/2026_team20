import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearEditingSection,
  createAwareness,
  getLockedBy,
  getLockState,
  onAwarenessChange,
  setEditingSection,
} from "./awareness";
import type { LockState, SectionAwarenessState } from "./types";

function createMockAwareness() {
  const states = new Map<number, SectionAwarenessState>();
  const changeListeners: ((changes: { added: number[]; updated: number[]; removed: number[] }) => void)[] = [];

  return {
    clientID: 1,
    getLocalState: vi.fn(() => states.get(1) ?? null),
    setLocalState: vi.fn((state: SectionAwarenessState | null) => {
      if (state === null) {
        states.delete(1);
      } else {
        states.set(1, state);
      }
    }),
    getStates: vi.fn(() => states),
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (event === "update") {
        changeListeners.push(cb as (changes: { added: number[]; updated: number[]; removed: number[] }) => void);
      }
    }),
    off: vi.fn(),
    destroy: vi.fn(),

    _states: states,
    _changeListeners: changeListeners,
    _setRemoteState: (clientId: number, state: SectionAwarenessState) => {
      states.set(clientId, state);
    },
    _emitChange: (changes: { added: number[]; updated: number[]; removed: number[] }) => {
      for (const listener of changeListeners) {
        listener(changes);
      }
    },
  };
}

type MockAwareness = ReturnType<typeof createMockAwareness>;

const testUser = {
  id: "user-1",
  displayName: "太郎",
  avatarUrl: null,
};

const otherUser = {
  id: "user-2",
  displayName: "花子",
  avatarUrl: "https://example.com/avatar.png",
};

describe("awareness", () => {
  let mockAwareness: MockAwareness;

  beforeEach(() => {
    mockAwareness = createMockAwareness();
  });

  describe("createAwareness", () => {
    it("Y.js Doc から Awareness インスタンスを作成する", () => {
      const { Doc } = require("yjs");
      const mockDoc = new Doc();
      const awareness = createAwareness(mockDoc as never);

      expect(awareness).toBeDefined();
      expect(awareness.clientID).toBeDefined();
    });
  });

  describe("setEditingSection", () => {
    it("ローカル状態に editingSectionId とユーザー情報をセットする", () => {
      setEditingSection(mockAwareness as never, "section-1", testUser);

      expect(mockAwareness.setLocalState).toHaveBeenCalledWith({
        editingSectionId: "section-1",
        user: testUser,
      });
    });

    it("セクションIDを変更できる", () => {
      setEditingSection(mockAwareness as never, "section-1", testUser);
      setEditingSection(mockAwareness as never, "section-2", testUser);

      expect(mockAwareness.setLocalState).toHaveBeenLastCalledWith({
        editingSectionId: "section-2",
        user: testUser,
      });
    });
  });

  describe("clearEditingSection", () => {
    it("editingSectionId を null にクリアする", () => {
      setEditingSection(mockAwareness as never, "section-1", testUser);
      clearEditingSection(mockAwareness as never, testUser);

      expect(mockAwareness.setLocalState).toHaveBeenLastCalledWith({
        editingSectionId: null,
        user: testUser,
      });
    });
  });

  describe("getLockState", () => {
    it("誰も編集していないセクションは unlocked", () => {
      const state = getLockState(mockAwareness as never, "section-1", "user-1");

      expect(state).toBe("unlocked");
    });

    it("自分が編集中のセクションは locked-by-me", () => {
      mockAwareness._setRemoteState(1, {
        editingSectionId: "section-1",
        user: testUser,
      });

      const state = getLockState(mockAwareness as never, "section-1", "user-1");

      expect(state).toBe("locked-by-me");
    });

    it("他ユーザーが編集中のセクションは locked-by-other", () => {
      mockAwareness._setRemoteState(2, {
        editingSectionId: "section-1",
        user: otherUser,
      });

      const state = getLockState(mockAwareness as never, "section-1", "user-1");

      expect(state).toBe("locked-by-other");
    });

    it("他のセクションが編集中でも対象セクションは unlocked", () => {
      mockAwareness._setRemoteState(2, {
        editingSectionId: "section-2",
        user: otherUser,
      });

      const state = getLockState(mockAwareness as never, "section-1", "user-1");

      expect(state).toBe("unlocked");
    });

    it("editingSectionId が null の場合は unlocked", () => {
      mockAwareness._setRemoteState(2, {
        editingSectionId: null,
        user: otherUser,
      });

      const state = getLockState(mockAwareness as never, "section-1", "user-1");

      expect(state).toBe("unlocked");
    });
  });

  describe("getLockedBy", () => {
    it("誰もロックしていない場合は null", () => {
      const lockedBy = getLockedBy(mockAwareness as never, "section-1");

      expect(lockedBy).toBeNull();
    });

    it("ロック保持者のユーザー情報を返す", () => {
      mockAwareness._setRemoteState(2, {
        editingSectionId: "section-1",
        user: otherUser,
      });

      const lockedBy = getLockedBy(mockAwareness as never, "section-1");

      expect(lockedBy).toEqual(otherUser);
    });

    it("複数ユーザーが異なるセクションを編集中でも正しいロック保持者を返す", () => {
      mockAwareness._setRemoteState(1, {
        editingSectionId: "section-1",
        user: testUser,
      });
      mockAwareness._setRemoteState(2, {
        editingSectionId: "section-2",
        user: otherUser,
      });

      const lockedBy1 = getLockedBy(mockAwareness as never, "section-1");
      const lockedBy2 = getLockedBy(mockAwareness as never, "section-2");

      expect(lockedBy1).toEqual(testUser);
      expect(lockedBy2).toEqual(otherUser);
    });
  });

  describe("onAwarenessChange", () => {
    it("Awareness 変更イベントのリスナーを登録する", () => {
      const callback = vi.fn();
      onAwarenessChange(mockAwareness as never, callback);

      expect(mockAwareness.on).toHaveBeenCalledWith("update", expect.any(Function));
    });

    it("変更イベント発火時にコールバックが呼ばれる", () => {
      const callback = vi.fn();
      onAwarenessChange(mockAwareness as never, callback);

      const changes = { added: [2], updated: [], removed: [] };
      mockAwareness._emitChange(changes);

      expect(callback).toHaveBeenCalledWith(changes);
    });

    it("クリーンアップ関数を返す", () => {
      const callback = vi.fn();
      const cleanup = onAwarenessChange(mockAwareness as never, callback);

      cleanup();

      expect(mockAwareness.off).toHaveBeenCalledWith("update", expect.any(Function));
    });
  });
});
