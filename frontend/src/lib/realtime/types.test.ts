import { describe, expect, it } from "vitest";
import type {
  ConnectionStatus,
  LockState,
  RealtimeChannelConfig,
  SectionAwarenessState,
  YjsSyncMessage,
} from "./types";

describe("realtime types", () => {
  describe("SectionAwarenessState", () => {
    it("編集中のセクションIDとユーザー情報を保持できる", () => {
      const state: SectionAwarenessState = {
        editingSectionId: "section-1",
        user: {
          id: "user-1",
          displayName: "太郎",
          avatarUrl: null,
        },
      };

      expect(state.editingSectionId).toBe("section-1");
      expect(state.user.id).toBe("user-1");
      expect(state.user.displayName).toBe("太郎");
      expect(state.user.avatarUrl).toBeNull();
    });

    it("閲覧のみの場合はeditingSectionIdがnull", () => {
      const state: SectionAwarenessState = {
        editingSectionId: null,
        user: {
          id: "user-2",
          displayName: "花子",
          avatarUrl: "https://example.com/avatar.png",
        },
      };

      expect(state.editingSectionId).toBeNull();
      expect(state.user.avatarUrl).toBe("https://example.com/avatar.png");
    });
  });

  describe("YjsSyncMessage", () => {
    it("Y.js更新メッセージを構成できる", () => {
      const message: YjsSyncMessage = {
        type: "yjs-update",
        update: "base64encodedstring==",
        senderId: "user-1",
      };

      expect(message.type).toBe("yjs-update");
      expect(message.update).toBe("base64encodedstring==");
      expect(message.senderId).toBe("user-1");
    });
  });

  describe("LockState", () => {
    it("4つのロック状態を表現できる", () => {
      const states: LockState[] = [
        "unknown",
        "unlocked",
        "locked-by-me",
        "locked-by-other",
      ];

      expect(states).toHaveLength(4);
      expect(states).toContain("unknown");
      expect(states).toContain("unlocked");
      expect(states).toContain("locked-by-me");
      expect(states).toContain("locked-by-other");
    });
  });

  describe("ConnectionStatus", () => {
    it("3つの接続状態を表現できる", () => {
      const statuses: ConnectionStatus[] = [
        "connecting",
        "connected",
        "disconnected",
      ];

      expect(statuses).toHaveLength(3);
      expect(statuses).toContain("connecting");
      expect(statuses).toContain("connected");
      expect(statuses).toContain("disconnected");
    });
  });

  describe("RealtimeChannelConfig", () => {
    it("チャネル設定を構成できる", () => {
      const config: RealtimeChannelConfig = {
        channelName: "plot:plot-123",
        plotId: "plot-123",
      };

      expect(config.channelName).toBe("plot:plot-123");
      expect(config.plotId).toBe("plot-123");
    });
  });
});
