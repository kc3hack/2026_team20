import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSections } from "@/mocks/data/sections";
import * as sectionRepository from "../repositories/sectionRepository";

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("sectionRepository", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  describe("listByPlot", () => {
    it("should call GET /plots/{plotId}/sections", async () => {
      const mockResponse = { items: mockSections.slice(0, 3), total: 3 };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await sectionRepository.listByPlot("plot-001");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/plots/plot-001/sections"),
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should throw ApiError(404) for plot-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Plot not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(sectionRepository.listByPlot("plot-404")).rejects.toMatchObject({
        status: 404,
        detail: "Plot not found",
      });
    });
  });

  describe("get", () => {
    it("should call GET /sections/{sectionId}", async () => {
      const mockResponse = mockSections[0];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await sectionRepository.get("section-001");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/sections/section-001"),
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should throw ApiError(404) for section-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Section not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(sectionRepository.get("section-404")).rejects.toMatchObject({
        status: 404,
        detail: "Section not found",
      });
    });
  });

  describe("create", () => {
    it("should call POST /plots/{plotId}/sections with body", async () => {
      const mockResponse = mockSections[0];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { title: "New Section" };
      const result = await sectionRepository.create("plot-001", body, "test-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/plots/plot-001/sections");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("POST");
      expect(JSON.parse(request.body as string)).toEqual(body);
      expect(result).toEqual(mockResponse);
    });

    it("should include orderIndex in body when provided", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockSections[0],
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { title: "Ordered Section", orderIndex: 2 };
      await sectionRepository.create("plot-001", body, "test-token");

      const request = fetchMock.mock.calls[0][1];
      expect(JSON.parse(request.body as string)).toEqual(body);
    });

    it("should throw ApiError(403) when plot is paused (section-403)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: "This plot is paused" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        sectionRepository.create("section-403", { title: "x" }, "test-token"),
      ).rejects.toMatchObject({
        status: 403,
        detail: "This plot is paused",
      });
    });
  });

  describe("update", () => {
    it("should call PUT /sections/{sectionId} with body", async () => {
      const mockResponse = mockSections[0];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { title: "Updated Section" };
      const result = await sectionRepository.update("section-001", body, "test-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/sections/section-001");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("PUT");
      expect(result).toEqual(mockResponse);
    });

    it("should throw ApiError(403) when plot is paused (section-403)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: "This plot is paused" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        sectionRepository.update("section-403", { title: "x" }, "test-token"),
      ).rejects.toMatchObject({
        status: 403,
        detail: "This plot is paused",
      });
    });
  });

  describe("remove", () => {
    it("should call DELETE /sections/{sectionId}", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      const result = await sectionRepository.remove("section-001", "test-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/sections/section-001");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("DELETE");
      expect(result).toBeUndefined();
    });

    it("should throw ApiError(403) when plot is paused (section-403)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: "This plot is paused" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        sectionRepository.remove("section-403", "test-token"),
      ).rejects.toMatchObject({
        status: 403,
        detail: "This plot is paused",
      });
    });
  });

  describe("reorder", () => {
    it("should call POST /sections/{sectionId}/reorder with newOrder", async () => {
      const mockResponse = mockSections[0];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { newOrder: 2 };
      const result = await sectionRepository.reorder("section-001", body, "test-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/sections/section-001/reorder");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("POST");
      expect(JSON.parse(request.body as string)).toEqual(body);
      expect(result).toEqual(mockResponse);
    });

    it("should throw ApiError(403) when plot is paused (section-403)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: "This plot is paused" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        sectionRepository.reorder("section-403", { newOrder: 1 }, "test-token"),
      ).rejects.toMatchObject({
        status: 403,
        detail: "This plot is paused",
      });
    });
  });
});
