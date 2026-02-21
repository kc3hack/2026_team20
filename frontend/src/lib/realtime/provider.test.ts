import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type RealtimeProviderOptions,
  type RealtimeProviderState,
  createRealtimeProvider,
  destroyRealtimeProvider,
} from "./provider";

/**
 * SupabaseBroadcastProvider が内部で channel() → .on() → .subscribe() を呼ぶため、
 * チェーン可能なモック Supabase クライアントを作る。
 */
function createMockSupabaseClient() {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    send: vi.fn().mockResolvedValue("ok"),
    unsubscribe: vi.fn().mockResolvedValue("ok"),
  };
  return {
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn().mockResolvedValue("ok"),
    _mockChannel: mockChannel,
  };
}

describe("provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createRealtimeProvider (Mock モード)", () => {
    it("NEXT_PUBLIC_USE_MOCK=true の場合は Mock プロバイダーを返す", () => {
      const options: RealtimeProviderOptions = {
        plotId: "plot-1",
        supabaseClient: {},
        useMock: true,
      };

      const state = createRealtimeProvider(options);

      expect(state.isMock).toBe(true);
      expect(state.doc).toBeDefined();
      expect(state.provider).toBeNull();
      expect(state.status).toBe("disconnected");
    });

    it("Mock モードでは Y.js Doc のみ作成し、プロバイダーは作成しない", () => {
      const state = createRealtimeProvider({
        plotId: "plot-1",
        supabaseClient: {},
        useMock: true,
      });

      expect(state.provider).toBeNull();
      expect(state.doc).toBeDefined();
    });
  });

  describe("createRealtimeProvider (Realtime モード)", () => {
    it("useMock=false の場合は SupabaseBroadcastProvider を作成する", () => {
      const mockClient = createMockSupabaseClient();

      const state = createRealtimeProvider({
        plotId: "plot-2",
        supabaseClient: mockClient,
        useMock: false,
      });

      expect(state.isMock).toBe(false);
      expect(state.doc).toBeDefined();
      expect(state.provider).toBeDefined();
      expect(state.provider).not.toBeNull();

      // channel() が plot:plot-2 で呼ばれる
      expect(mockClient.channel).toHaveBeenCalledWith(
        "plot:plot-2",
        expect.objectContaining({ config: { broadcast: { self: false } } }),
      );

      // cleanup
      state.provider?.destroy();
    });

    it("プロバイダーのチャネル名が plot:{plotId} 形式である", () => {
      const mockClient = createMockSupabaseClient();

      const state = createRealtimeProvider({
        plotId: "plot-abc",
        supabaseClient: mockClient,
        useMock: false,
      });

      expect(state.channelName).toBe("plot:plot-abc");

      state.provider?.destroy();
    });
  });

  describe("destroyRealtimeProvider", () => {
    it("Mock モードのプロバイダーを破棄できる", () => {
      const state = createRealtimeProvider({
        plotId: "plot-1",
        supabaseClient: {},
        useMock: true,
      });

      destroyRealtimeProvider(state);

      expect(state.status).toBe("disconnected");
    });

    it("Realtime モードのプロバイダーを破棄する", () => {
      const mockClient = createMockSupabaseClient();

      const state = createRealtimeProvider({
        plotId: "plot-1",
        supabaseClient: mockClient,
        useMock: false,
      });

      destroyRealtimeProvider(state);

      expect(mockClient.removeChannel).toHaveBeenCalled();
      expect(state.status).toBe("disconnected");
    });
  });

  describe("エラーハンドリング", () => {
    it("plotId が空文字の場合にエラーをスローする", () => {
      expect(() =>
        createRealtimeProvider({
          plotId: "",
          supabaseClient: {},
          useMock: false,
        }),
      ).toThrow("plotId is required");
    });
  });
});
