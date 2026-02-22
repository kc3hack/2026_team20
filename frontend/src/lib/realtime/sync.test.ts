import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { encodeYjsUpdate } from "./encoding";
import {
  broadcastUpdate,
  receiveUpdate,
  requestInitialState,
  sendStateVector,
  syncYjsUpdate,
} from "./sync";

const ORIGIN_REMOTE = "remote";
const ORIGIN_LOCAL = "local";

function createMockChannel() {
  return {
    send: vi.fn(() => Promise.resolve("ok")),
  };
}

type MockChannel = ReturnType<typeof createMockChannel>;

describe("sync", () => {
  let mockChannel: MockChannel;

  beforeEach(() => {
    mockChannel = createMockChannel();
    vi.clearAllMocks();
  });

  describe("syncYjsUpdate", () => {
    it("Y.js Doc に更新を適用する", () => {
      const doc = new Y.Doc();
      const update = new Uint8Array([1, 2, 3]);

      syncYjsUpdate(doc, update, ORIGIN_REMOTE);

      expect(Y.applyUpdate).toHaveBeenCalledWith(doc, update, ORIGIN_REMOTE);
    });

    it("ローカルオリジンで更新を適用できる", () => {
      const doc = new Y.Doc();
      const update = new Uint8Array([4, 5, 6]);

      syncYjsUpdate(doc, update, ORIGIN_LOCAL);

      expect(Y.applyUpdate).toHaveBeenCalledWith(doc, update, ORIGIN_LOCAL);
    });
  });

  describe("broadcastUpdate", () => {
    it("Base64エンコードした更新をチャネルに送信する", () => {
      const update = new Uint8Array([72, 101, 108, 108, 111]);

      broadcastUpdate(mockChannel as never, update, "user-1");

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: "broadcast",
        event: "yjs-update",
        payload: {
          type: "yjs-update",
          update: encodeYjsUpdate(update),
          senderId: "user-1",
        },
      });
    });

    it("空の更新は送信しない", () => {
      const update = new Uint8Array([]);

      broadcastUpdate(mockChannel as never, update, "user-1");

      expect(mockChannel.send).not.toHaveBeenCalled();
    });
  });

  describe("receiveUpdate", () => {
    it("エンコード済み更新をデコードしてDocに適用する", () => {
      const doc = new Y.Doc();
      const original = new Uint8Array([1, 2, 3, 4, 5]);
      const encoded = encodeYjsUpdate(original);

      receiveUpdate(doc, encoded);

      expect(Y.applyUpdate).toHaveBeenCalledWith(
        doc,
        expect.any(Uint8Array),
        ORIGIN_REMOTE,
      );
    });

    it("空のエンコード文字列は適用しない", () => {
      const doc = new Y.Doc();

      receiveUpdate(doc, "");

      expect(Y.applyUpdate).not.toHaveBeenCalled();
    });
  });

  describe("requestInitialState", () => {
    it("state-vector-request イベントを送信する", () => {
      const doc = new Y.Doc();

      requestInitialState(mockChannel as never, doc, "user-1");

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: "broadcast",
        event: "state-vector-request",
        payload: {
          type: "state-vector-request",
          stateVector: expect.any(String),
          senderId: "user-1",
        },
      });
    });

    it("現在のState Vectorをエンコードして送信する", () => {
      const doc = new Y.Doc();

      requestInitialState(mockChannel as never, doc, "user-1");

      const payload = (mockChannel.send as ReturnType<typeof vi.fn>).mock.calls[0][0].payload;
      expect(typeof payload.stateVector).toBe("string");
    });
  });

  describe("sendStateVector", () => {
    it("state-vector-response イベントを送信する", () => {
      const doc = new Y.Doc();

      sendStateVector(mockChannel as never, doc, "user-2");

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: "broadcast",
        event: "state-vector-response",
        payload: {
          type: "state-vector-response",
          update: expect.any(String),
          senderId: "user-2",
        },
      });
    });
  });

  describe("オリジントラッキング", () => {
    it("remote 更新は broadcastUpdate で再送信されない設計", () => {
      const doc = new Y.Doc();
      const update = new Uint8Array([1, 2, 3]);

      syncYjsUpdate(doc, update, ORIGIN_REMOTE);

      expect(Y.applyUpdate).toHaveBeenCalledWith(doc, update, ORIGIN_REMOTE);
    });

    it("local 更新と remote 更新を区別できる", () => {
      const doc = new Y.Doc();
      const localUpdate = new Uint8Array([1]);
      const remoteUpdate = new Uint8Array([2]);

      syncYjsUpdate(doc, localUpdate, ORIGIN_LOCAL);
      syncYjsUpdate(doc, remoteUpdate, ORIGIN_REMOTE);

      const calls = (Y.applyUpdate as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][2]).toBe(ORIGIN_LOCAL);
      expect(calls[1][2]).toBe(ORIGIN_REMOTE);
    });
  });
});
