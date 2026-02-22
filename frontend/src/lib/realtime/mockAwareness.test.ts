import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockAwareness } from "./mockAwareness";

describe("createMockAwareness", () => {
  it("clientID がランダムに生成される", () => {
    const a1 = createMockAwareness("plot-1");
    const a2 = createMockAwareness("plot-1");

    expect(a1.clientID).not.toBe(a2.clientID);

    a1.destroy();
    a2.destroy();
  });

  it("初期状態で getLocalState が null を返す", () => {
    const awareness = createMockAwareness("plot-1");

    expect(awareness.getLocalState()).toBeNull();

    awareness.destroy();
  });

  it("setLocalState で状態を設定し getLocalState で取得できる", () => {
    const awareness = createMockAwareness("plot-1");
    const state = {
      editingSectionId: "section-1",
      user: { id: "user-1", displayName: "太郎", avatarUrl: null },
    };

    awareness.setLocalState(state);

    expect(awareness.getLocalState()).toEqual(state);

    awareness.destroy();
  });

  it("setLocalState(null) で状態がクリアされる", () => {
    const awareness = createMockAwareness("plot-1");
    awareness.setLocalState({
      editingSectionId: "section-1",
      user: { id: "user-1", displayName: "太郎", avatarUrl: null },
    });

    awareness.setLocalState(null);

    expect(awareness.getLocalState()).toBeNull();

    awareness.destroy();
  });

  it("getStates で全クライアントの状態を取得できる", () => {
    const awareness = createMockAwareness("plot-1");
    const state = {
      editingSectionId: "section-1",
      user: { id: "user-1", displayName: "太郎", avatarUrl: null },
    };

    awareness.setLocalState(state);

    const states = awareness.getStates();
    expect(states.size).toBe(1);
    expect(states.get(awareness.clientID)).toEqual(state);

    awareness.destroy();
  });

  it("on/off で update イベントリスナーの登録・解除ができる", () => {
    const awareness = createMockAwareness("plot-1");
    const listener = vi.fn();

    awareness.on("update", listener);
    awareness.setLocalState({
      editingSectionId: "section-1",
      user: { id: "user-1", displayName: "太郎", avatarUrl: null },
    });

    expect(listener).toHaveBeenCalledTimes(1);

    awareness.off("update", listener);
    awareness.setLocalState(null);

    expect(listener).toHaveBeenCalledTimes(1);

    awareness.destroy();
  });

  it("update イベントに updated/removed の情報が含まれる", () => {
    const awareness = createMockAwareness("plot-1");
    const listener = vi.fn();
    awareness.on("update", listener);

    awareness.setLocalState({
      editingSectionId: "section-1",
      user: { id: "user-1", displayName: "太郎", avatarUrl: null },
    });

    expect(listener).toHaveBeenCalledWith({
      added: [],
      updated: [awareness.clientID],
      removed: [],
    });

    awareness.setLocalState(null);

    expect(listener).toHaveBeenCalledWith({
      added: [],
      updated: [],
      removed: [awareness.clientID],
    });

    awareness.destroy();
  });

  it("destroy 後は状態がクリアされる", () => {
    const awareness = createMockAwareness("plot-1");
    awareness.setLocalState({
      editingSectionId: "section-1",
      user: { id: "user-1", displayName: "太郎", avatarUrl: null },
    });

    awareness.destroy();

    expect(awareness.getStates().size).toBe(0);
  });
});
