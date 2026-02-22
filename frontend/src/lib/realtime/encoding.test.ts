import { describe, expect, it } from "vitest";
import { decodeYjsUpdate, encodeYjsUpdate } from "./encoding";

describe("encoding", () => {
  describe("encodeYjsUpdate", () => {
    it("Uint8ArrayをBase64文字列にエンコードできる", () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const encoded = encodeYjsUpdate(data);

      expect(typeof encoded).toBe("string");
      // Base64("Hello") = "SGVsbG8="
      expect(encoded).toBe("SGVsbG8=");
    });

    it("空のUint8Arrayをエンコードできる", () => {
      const data = new Uint8Array([]);
      const encoded = encodeYjsUpdate(data);

      expect(encoded).toBe("");
    });

    it("大きなデータ（32KB超）でもエンコードできる", () => {
      // 40KB のデータ — チャンキング対応の検証
      const size = 40 * 1024;
      const data = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        data[i] = i % 256;
      }

      const encoded = encodeYjsUpdate(data);
      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);
    });

    it("バイナリデータ（0x00〜0xFF）を正しくエンコードできる", () => {
      const data = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        data[i] = i;
      }

      const encoded = encodeYjsUpdate(data);
      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);
    });
  });

  describe("decodeYjsUpdate", () => {
    it("Base64文字列をUint8Arrayにデコードできる", () => {
      const decoded = decodeYjsUpdate("SGVsbG8=");

      expect(decoded).toBeInstanceOf(Uint8Array);
      expect(Array.from(decoded)).toEqual([72, 101, 108, 108, 111]);
    });

    it("空文字列をデコードすると空のUint8Arrayになる", () => {
      const decoded = decodeYjsUpdate("");

      expect(decoded).toBeInstanceOf(Uint8Array);
      expect(decoded.length).toBe(0);
    });
  });

  describe("ラウンドトリップ（エンコード→デコード）", () => {
    it("小さなデータのラウンドトリップが一致する", () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128]);
      const encoded = encodeYjsUpdate(original);
      const decoded = decodeYjsUpdate(encoded);

      expect(Array.from(decoded)).toEqual(Array.from(original));
    });

    it("大きなデータ（32KB超）のラウンドトリップが一致する", () => {
      const size = 40 * 1024;
      const original = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        original[i] = i % 256;
      }

      const encoded = encodeYjsUpdate(original);
      const decoded = decodeYjsUpdate(encoded);

      expect(decoded.length).toBe(original.length);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });

    it("Y.jsの典型的な更新バイナリをラウンドトリップできる", () => {
      // Y.js の更新メッセージに含まれる典型的なバイトパターン
      const yjsLikeUpdate = new Uint8Array([
        1, 1, 0, 4, 1, 0, 0, 0, 1, 0, 4, 0, 72, 101, 108, 108, 111,
      ]);

      const encoded = encodeYjsUpdate(yjsLikeUpdate);
      const decoded = decodeYjsUpdate(encoded);

      expect(Array.from(decoded)).toEqual(Array.from(yjsLikeUpdate));
    });
  });
});
