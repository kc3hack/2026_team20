import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mockImageUploadResponse } from "@/mocks/data/images";
import * as imageRepository from "../repositories/imageRepository";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("imageRepository", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("upload", () => {
    it("should call apiUpload with correct endpoint and file", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockImageUploadResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      const result = await imageRepository.upload(file);

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/images");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("POST");
      expect(result).toEqual(mockImageUploadResponse);
    });

    it("should pass token to apiUpload", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockImageUploadResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const file = new File(["test"], "test.png", { type: "image/png" });
      await imageRepository.upload(file, "my-token");

      const headers = fetchMock.mock.calls[0][1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer my-token");
    });

    it("should return ImageUploadResponse", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockImageUploadResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const file = new File(["test"], "test.gif", { type: "image/gif" });
      const result = await imageRepository.upload(file);

      expect(result).toEqual(mockImageUploadResponse);
      expect(result.url).toBe("/api/v1/images/mock-image-001.jpg");
      expect(result.filename).toBe("mock-image-001.jpg");
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });
  });

  describe("getUrl", () => {
    it("should return correct URL for given filename", () => {
      const url = imageRepository.getUrl("my-image.jpg");
      expect(url).toBe("/api/v1/images/my-image.jpg");
    });

    it("should handle filenames with special characters", () => {
      const url = imageRepository.getUrl("スクリーンショット 2026.png");
      expect(url).toBe(`/api/v1/images/${encodeURIComponent("スクリーンショット 2026.png")}`);
    });
  });
});
