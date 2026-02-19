import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDiffResponse, mockHistoryList } from "@/mocks/data/history";
import * as historyRepository from "../repositories/historyRepository";

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("historyRepository", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  describe("saveOperation", () => {
    it("should call POST /sections/{sectionId}/operations with body", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({}),
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { operationType: "insert" as const, position: 0, content: "text", length: 4 };
      const result = await historyRepository.saveOperation("section-001", body, "test-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/sections/section-001/operations");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("POST");
      expect(JSON.parse(request.body as string)).toEqual(body);
      expect(result).toEqual({});
    });

    it("should include Authorization header", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({}),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await historyRepository.saveOperation("section-001", { operationType: "update" }, "my-token");

      const headers = fetchMock.mock.calls[0][1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer my-token");
    });

    it("should throw ApiError(404) for section-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Section not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        historyRepository.saveOperation("section-404", { operationType: "insert" }, "token"),
      ).rejects.toMatchObject({
        status: 404,
        detail: "Section not found",
      });
    });
  });

  describe("getHistory", () => {
    it("should call GET /sections/{sectionId}/history", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockHistoryList,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await historyRepository.getHistory("section-001");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/sections/section-001/history"),
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result).toEqual(mockHistoryList);
    });

    it("should pass limit and offset as query params", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockHistoryList,
        headers: new Headers({ "content-type": "application/json" }),
      });

      await historyRepository.getHistory("section-001", { limit: 10, offset: 5 });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("limit=10");
      expect(calledUrl).toContain("offset=5");
    });

    it("should throw ApiError(404) for section-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Section not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(historyRepository.getHistory("section-404")).rejects.toMatchObject({
        status: 404,
        detail: "Section not found",
      });
    });
  });

  describe("getDiff", () => {
    it("should call GET /sections/{sectionId}/diff/{from}/{to}", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockDiffResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await historyRepository.getDiff("section-001", 1, 3);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/sections/section-001/diff/1/3"),
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result).toEqual(mockDiffResponse);
    });

    it("should throw ApiError(404) for section-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Section not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(historyRepository.getDiff("section-404", 1, 3)).rejects.toMatchObject({
        status: 404,
        detail: "Section not found",
      });
    });
  });
});
