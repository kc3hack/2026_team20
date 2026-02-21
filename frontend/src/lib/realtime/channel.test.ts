import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectionStatus } from "./types";
import {
  type ChannelCallbacks,
  type ChannelState,
  createRealtimeChannel,
  subscribeToChannel,
  unsubscribeFromChannel,
} from "./channel";

// --- Supabase RealtimeChannel のモック ---

function createMockChannel() {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>();

  const channel = {
    topic: "realtime:plot:test-plot-id",
    subscribe: vi.fn((callback?: (status: string) => void) => {
      // デフォルトで SUBSCRIBED を返す
      if (callback) {
        setTimeout(() => callback("SUBSCRIBED"), 0);
      }
      return channel;
    }),
    unsubscribe: vi.fn(() => {
      return Promise.resolve("ok");
    }),
    on: vi.fn(
      (
        event: string,
        _filter: Record<string, unknown>,
        callback: (...args: unknown[]) => void,
      ) => {
        const key = `${event}`;
        if (!listeners.has(key)) {
          listeners.set(key, []);
        }
        listeners.get(key)!.push(callback);
        return channel;
      },
    ),
    send: vi.fn(() => Promise.resolve("ok")),
    // テスト用ヘルパー: イベント発火
    _emit: (event: string, payload: unknown) => {
      const callbacks = listeners.get(event) ?? [];
      for (const cb of callbacks) {
        cb(payload);
      }
    },
    _listeners: listeners,
  };

  return channel;
}

type MockChannel = ReturnType<typeof createMockChannel>;

function createMockSupabaseClient(channel: MockChannel) {
  return {
    channel: vi.fn((_name: string, _opts?: unknown) => channel),
    removeChannel: vi.fn(() => Promise.resolve("ok")),
  };
}

type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;

describe("channel", () => {
  let mockChannel: MockChannel;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockChannel = createMockChannel();
    mockClient = createMockSupabaseClient(mockChannel);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createRealtimeChannel", () => {
    it("plot:{plotId} のチャネル名でチャネルを作成する", () => {
      const state = createRealtimeChannel(mockClient, "plot-123");

      expect(mockClient.channel).toHaveBeenCalledWith("plot:plot-123", expect.any(Object));
      expect(state.channel).toBe(mockChannel);
      expect(state.plotId).toBe("plot-123");
    });

    it("初期接続状態が disconnected である", () => {
      const state = createRealtimeChannel(mockClient, "plot-456");

      expect(state.status).toBe("disconnected");
    });

    it("Broadcastの自己送信を無効にするオプションを設定する", () => {
      createRealtimeChannel(mockClient, "plot-789");

      expect(mockClient.channel).toHaveBeenCalledWith(
        "plot:plot-789",
        expect.objectContaining({ config: expect.objectContaining({ broadcast: { self: false } }) }),
      );
    });
  });

  describe("subscribeToChannel", () => {
    it("チャネルを購読し接続状態を connecting に更新する", async () => {
      const state = createRealtimeChannel(mockClient, "test-plot");
      const callbacks: ChannelCallbacks = {};

      subscribeToChannel(state, callbacks);

      // subscribe呼び出し直後は connecting
      expect(state.status).toBe("connecting");
    });

    it("SUBSCRIBED コールバックで connected に遷移する", async () => {
      const state = createRealtimeChannel(mockClient, "test-plot");
      const onStatusChange = vi.fn();
      const callbacks: ChannelCallbacks = { onStatusChange };

      subscribeToChannel(state, callbacks);

      // SUBSCRIBED コールバックを発火
      await vi.advanceTimersByTimeAsync(10);

      expect(state.status).toBe("connected");
      expect(onStatusChange).toHaveBeenCalledWith("connected");
    });

    it("Broadcastイベントのコールバックを登録する", () => {
      const state = createRealtimeChannel(mockClient, "test-plot");
      const onMessage = vi.fn();
      const callbacks: ChannelCallbacks = { onMessage };

      subscribeToChannel(state, callbacks);

      expect(mockChannel.on).toHaveBeenCalledWith(
        "broadcast",
        expect.objectContaining({ event: "yjs-update" }),
        expect.any(Function),
      );
    });

    it("Broadcastメッセージ受信時にコールバックが呼ばれる", () => {
      const state = createRealtimeChannel(mockClient, "test-plot");
      const onMessage = vi.fn();
      const callbacks: ChannelCallbacks = { onMessage };

      subscribeToChannel(state, callbacks);

      // メッセージ受信をシミュレート
      const payload = {
        type: "yjs-update",
        update: "base64data==",
        senderId: "user-1",
      };
      mockChannel._emit("broadcast", { payload });

      expect(onMessage).toHaveBeenCalledWith(payload);
    });

    it("エラー時に disconnected に遷移し再接続を試みる", async () => {
      // subscribe がエラーを返すよう設定
      mockChannel.subscribe = vi.fn((callback?: (status: string) => void) => {
        if (callback) {
          setTimeout(() => callback("CHANNEL_ERROR"), 0);
        }
        return mockChannel;
      });

      const state = createRealtimeChannel(mockClient, "test-plot");
      const onStatusChange = vi.fn();
      const callbacks: ChannelCallbacks = { onStatusChange };

      subscribeToChannel(state, callbacks);
      await vi.advanceTimersByTimeAsync(10);

      expect(state.status).toBe("disconnected");
      expect(onStatusChange).toHaveBeenCalledWith("disconnected");
    });
  });

  describe("unsubscribeFromChannel", () => {
    it("チャネルの購読を解除する", async () => {
      const state = createRealtimeChannel(mockClient, "test-plot");

      await unsubscribeFromChannel(mockClient, state);

      expect(mockClient.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    it("切断後のステータスが disconnected になる", async () => {
      const state = createRealtimeChannel(mockClient, "test-plot");
      state.status = "connected";

      await unsubscribeFromChannel(mockClient, state);

      expect(state.status).toBe("disconnected");
    });
  });

  describe("再接続（指数バックオフ）", () => {
    it("TIMED_OUT 時に再接続を試みる", async () => {
      let callCount = 0;
      mockChannel.subscribe = vi.fn((callback?: (status: string) => void) => {
        callCount++;
        if (callback) {
          setTimeout(
            () => callback(callCount <= 1 ? "TIMED_OUT" : "SUBSCRIBED"),
            0,
          );
        }
        return mockChannel;
      });

      const state = createRealtimeChannel(mockClient, "test-plot");
      subscribeToChannel(state, {});

      // 最初のタイムアウト
      await vi.advanceTimersByTimeAsync(10);
      expect(state.status).toBe("disconnected");

      // 指数バックオフ待機（初回は1000ms）
      await vi.advanceTimersByTimeAsync(1000);
      // 2回目の購読完了を待つ
      await vi.advanceTimersByTimeAsync(10);

      expect(state.status).toBe("connected");
      expect(callCount).toBe(2);
    });

    it("最大リトライ回数を超えると再接続を停止する", async () => {
      // 常に TIMED_OUT を返す
      mockChannel.subscribe = vi.fn((callback?: (status: string) => void) => {
        if (callback) {
          setTimeout(() => callback("TIMED_OUT"), 0);
        }
        return mockChannel;
      });

      const state = createRealtimeChannel(mockClient, "test-plot");
      const onError = vi.fn();
      subscribeToChannel(state, { onError, maxRetries: 3 });

      // 3回のリトライ + バックオフ時間を進める
      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(10);
        // バックオフ: 1000, 2000, 4000
        await vi.advanceTimersByTimeAsync(10_000);
      }

      // 最大リトライ後にエラーコールバック
      expect(onError).toHaveBeenCalled();
      expect(state.status).toBe("disconnected");
    });
  });
});
