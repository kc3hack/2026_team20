import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type RealtimeProviderOptions,
  type RealtimeProviderState,
  createRealtimeProvider,
  destroyRealtimeProvider,
} from "./provider";

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
    it("useMock=false の場合は y-supabase プロバイダーを作成する", () => {
      const mockClient = {
        supabaseClient: { channel: vi.fn() },
      };

      const state = createRealtimeProvider({
        plotId: "plot-2",
        supabaseClient: mockClient.supabaseClient,
        useMock: false,
      });

      expect(state.isMock).toBe(false);
      expect(state.doc).toBeDefined();
      expect(state.provider).toBeDefined();
      expect(state.provider).not.toBeNull();
    });

    it("プロバイダーのチャネル名が plot:{plotId} 形式である", () => {
      const state = createRealtimeProvider({
        plotId: "plot-abc",
        supabaseClient: {},
        useMock: false,
      });

      expect(state.channelName).toBe("plot:plot-abc");
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

      expect(state.doc.destroy).toHaveBeenCalled();
      expect(state.status).toBe("disconnected");
    });

    it("Realtime モードのプロバイダーを破棄する", () => {
      const state = createRealtimeProvider({
        plotId: "plot-1",
        supabaseClient: {},
        useMock: false,
      });

      destroyRealtimeProvider(state);

      expect(state.provider?.destroy).toHaveBeenCalled();
      expect(state.doc.destroy).toHaveBeenCalled();
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
