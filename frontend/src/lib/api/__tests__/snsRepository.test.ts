import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPlots } from "@/mocks/data/plots";
import { mockCommentList, mockComments, mockStarList, mockThread } from "@/mocks/data/sns";
import * as snsRepository from "../repositories/snsRepository";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("snsRepository", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("getStars", () => {
    it("should call GET /plots/{plotId}/stars", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStarList,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await snsRepository.getStars("plot-001");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/plots/plot-001/stars"),
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result).toEqual(mockStarList);
    });

    it("should throw ApiError(404) for plot-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Plot not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(snsRepository.getStars("plot-404")).rejects.toMatchObject({
        status: 404,
        detail: "Plot not found",
      });
    });
  });

  describe("addStar", () => {
    it("should call POST /plots/{plotId}/stars", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({}),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await snsRepository.addStar("plot-001", "test-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/plots/plot-001/stars");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("POST");
    });

    it("should throw ApiError(409) for plot-409 (already starred)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ detail: "Already starred" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(snsRepository.addStar("plot-409", "token")).rejects.toMatchObject({
        status: 409,
        detail: "Already starred",
      });
    });
  });

  describe("removeStar", () => {
    it("should call DELETE /plots/{plotId}/stars", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      const result = await snsRepository.removeStar("plot-001", "test-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/plots/plot-001/stars");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("DELETE");
      expect(result).toBeUndefined();
    });

    it("should throw ApiError(404) for star-404 (not starred)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Not starred" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(snsRepository.removeStar("star-404", "token")).rejects.toMatchObject({
        status: 404,
        detail: "Not starred",
      });
    });
  });

  describe("fork", () => {
    it("should call POST /plots/{plotId}/fork with body", async () => {
      const mockResponse = mockPlots[0];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { title: "Forked Plot" };
      const result = await snsRepository.fork("plot-001", body, "test-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/plots/plot-001/fork");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("POST");
      expect(JSON.parse(request.body as string)).toEqual(body);
      expect(result).toEqual(mockResponse);
    });

    it("should work with empty body", async () => {
      const mockResponse = mockPlots[0];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      await snsRepository.fork("plot-001", undefined, "test-token");

      const request = fetchMock.mock.calls[0][1];
      expect(request.body).toBe("{}");
    });

    it("should throw ApiError(404) for plot-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Plot not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(snsRepository.fork("plot-404", undefined, "token")).rejects.toMatchObject({
        status: 404,
        detail: "Plot not found",
      });
    });
  });

  describe("createThread", () => {
    it("should call POST /threads with body", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockThread,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { plotId: "plot-001" };
      const result = await snsRepository.createThread(body, "test-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/threads");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("POST");
      expect(JSON.parse(request.body as string)).toEqual(body);
      expect(result).toEqual(mockThread);
    });

    it("should include sectionId when provided", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockThread,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { plotId: "plot-001", sectionId: "section-001" };
      await snsRepository.createThread(body, "test-token");

      const request = fetchMock.mock.calls[0][1];
      expect(JSON.parse(request.body as string)).toEqual(body);
    });
  });

  describe("getComments", () => {
    it("should call GET /threads/{threadId}/comments", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCommentList,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await snsRepository.getComments("thread-001");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/threads/thread-001/comments"),
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result).toEqual(mockCommentList);
    });

    it("should pass limit and offset as query params", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCommentList,
        headers: new Headers({ "content-type": "application/json" }),
      });

      await snsRepository.getComments("thread-001", { limit: 10, offset: 5 });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("limit=10");
      expect(calledUrl).toContain("offset=5");
    });

    it("should throw ApiError(404) for thread-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Thread not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(snsRepository.getComments("thread-404")).rejects.toMatchObject({
        status: 404,
        detail: "Thread not found",
      });
    });
  });

  describe("addComment", () => {
    it("should call POST /threads/{threadId}/comments with body", async () => {
      const mockResponse = mockComments[0];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { content: "新しいコメント" };
      const result = await snsRepository.addComment("thread-001", body, "test-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/threads/thread-001/comments");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("POST");
      expect(JSON.parse(request.body as string)).toEqual(body);
      expect(result).toEqual(mockResponse);
    });

    it("should include parentCommentId when provided", async () => {
      const mockResponse = mockComments[1];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { content: "返信コメント", parentCommentId: "comment-001" };
      await snsRepository.addComment("thread-001", body, "test-token");

      const request = fetchMock.mock.calls[0][1];
      expect(JSON.parse(request.body as string)).toEqual(body);
    });

    it("should throw ApiError(400) for comment-400 (content too long)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: "Content exceeds 5000 characters" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        snsRepository.addComment("thread-001", { content: "x".repeat(5001) }, "token"),
      ).rejects.toMatchObject({
        status: 400,
        detail: "Content exceeds 5000 characters",
      });
    });
  });
});
