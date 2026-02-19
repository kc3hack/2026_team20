import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSearchResults } from "@/mocks/data/search";
import * as searchRepository from "../repositories/searchRepository";

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("searchRepository", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  describe("search", () => {
    it("should call GET /search with q param", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSearchResults,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await searchRepository.search({ q: "架空" });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/search");
      expect(calledUrl).toContain("q=");
      expect(result).toEqual(mockSearchResults);
    });

    it("should pass limit and offset as query params", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSearchResults,
        headers: new Headers({ "content-type": "application/json" }),
      });

      await searchRepository.search({ q: "テスト", limit: 10, offset: 5 });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("limit=10");
      expect(calledUrl).toContain("offset=5");
    });

    it("should include all params in the URL", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSearchResults,
        headers: new Headers({ "content-type": "application/json" }),
      });

      await searchRepository.search({ q: "ドローン", limit: 20, offset: 0 });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("q=");
      expect(calledUrl).toContain("limit=20");
      expect(calledUrl).toContain("offset=0");
    });

    it("should handle empty results", async () => {
      const emptyResults = { items: [], total: 0, query: "存在しない" };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => emptyResults,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await searchRepository.search({ q: "存在しない" });

      expect(result).toEqual(emptyResults);
      expect(result.items).toHaveLength(0);
    });
  });
});
