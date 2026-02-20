import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPlots } from "@/mocks/data/plots";
import * as plotRepository from "../repositories/plotRepository";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("plotRepository", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("list", () => {
    it("should call GET /plots with default params", async () => {
      const mockResponse = { items: [], total: 0, limit: 20, offset: 0 };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await plotRepository.list();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/plots"),
        expect.objectContaining({
          headers: expect.any(Headers),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should pass tag, limit, offset as query params", async () => {
      const mockResponse = { items: [], total: 0, limit: 10, offset: 5 };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      await plotRepository.list({ tag: "SF", limit: 10, offset: 5 });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("tag=SF");
      expect(calledUrl).toContain("limit=10");
      expect(calledUrl).toContain("offset=5");
    });

    it("should include Authorization header when token provided", async () => {
      const mockResponse = { items: [], total: 0, limit: 20, offset: 0 };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      await plotRepository.list(undefined, "test-token");

      const headers = fetchMock.mock.calls[0][1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-token");
    });
  });

  describe("get", () => {
    it("should call GET /plots/{plotId}", async () => {
      const mockDetail = {
        ...mockPlots[0],
        sections: [],
        owner: { id: "user-001", displayName: "Test", avatarUrl: null },
      };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockDetail,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await plotRepository.get("plot-001");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/plots/plot-001"),
        expect.objectContaining({
          headers: expect.any(Headers),
        }),
      );
      expect(result).toEqual(mockDetail);
    });

    it("should throw ApiError(404) for plot-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Plot not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(plotRepository.get("plot-404")).rejects.toMatchObject({
        status: 404,
        detail: "Plot not found",
      });
    });
  });

  describe("create", () => {
    it("should call POST /plots with body", async () => {
      const mockResponse = mockPlots[0];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { title: "New Plot", tags: ["SF"] };
      const result = await plotRepository.create(body, "test-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/plots");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("POST");
      expect(JSON.parse(request.body as string)).toEqual(body);
      expect(result).toEqual(mockResponse);
    });

    it("should include Authorization header", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockPlots[0],
        headers: new Headers({ "content-type": "application/json" }),
      });

      await plotRepository.create({ title: "Test" }, "my-token");

      const headers = fetchMock.mock.calls[0][1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer my-token");
    });
  });

  describe("update", () => {
    it("should call PUT /plots/{plotId} with body", async () => {
      const mockResponse = mockPlots[0];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { title: "Updated Plot" };
      const result = await plotRepository.update("plot-001", body, "test-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/plots/plot-001");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("PUT");
      expect(JSON.parse(request.body as string)).toEqual(body);
      expect(result).toEqual(mockResponse);
    });

    it("should throw ApiError(404) for plot-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Plot not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        plotRepository.update("plot-404", { title: "x" }, "test-token"),
      ).rejects.toMatchObject({
        status: 404,
        detail: "Plot not found",
      });
    });
  });

  describe("remove", () => {
    it("should call DELETE /plots/{plotId}", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      const result = await plotRepository.remove("plot-001", "test-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/plots/plot-001");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("DELETE");
      expect(result).toBeUndefined();
    });

    it("should return undefined on 204", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      const result = await plotRepository.remove("plot-001", "test-token");
      expect(result).toBeUndefined();
    });

    it("should throw ApiError(404) for plot-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Plot not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(plotRepository.remove("plot-404", "test-token")).rejects.toMatchObject({
        status: 404,
        detail: "Plot not found",
      });
    });
  });

  describe("trending", () => {
    it("should call GET /plots/trending with limit param", async () => {
      const mockResponse = { items: [], total: 0, limit: 5, offset: 0 };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await plotRepository.trending({ limit: 5 });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/plots/trending");
      expect(calledUrl).toContain("limit=5");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("popular", () => {
    it("should call GET /plots/popular with limit param", async () => {
      const mockResponse = { items: [], total: 0, limit: 10, offset: 0 };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await plotRepository.popular({ limit: 10 });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/plots/popular");
      expect(calledUrl).toContain("limit=10");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("latest", () => {
    it("should call GET /plots/new with limit param", async () => {
      const mockResponse = { items: [], total: 0, limit: 5, offset: 0 };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await plotRepository.latest({ limit: 5 });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/plots/new");
      expect(calledUrl).toContain("limit=5");
      expect(result).toEqual(mockResponse);
    });
  });
});

/**
 * Mock モード (NEXT_PUBLIC_USE_MOCK=true) のテスト。
 *
 * USE_MOCK はモジュール読み込み時に評価されるため、
 * vi.resetModules() + dynamic import で再読み込みし、
 * 環境変数が "true" の状態でモジュールを初期化する。
 */
describe("plotRepository (mock mode)", () => {
  const originalEnv = process.env.NEXT_PUBLIC_USE_MOCK;

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_USE_MOCK = "true";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_USE_MOCK = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_USE_MOCK;
    }
  });

  describe("get", () => {
    it("should return PlotDetailResponse for valid ID", async () => {
      const mod = await import("../repositories/plotRepository");
      const result = await mod.get("plot-001");

      expect(result.id).toBe("plot-001");
      expect(result.title).toBe(mockPlots[0].title);
      expect(result.sections).toBeDefined();
      expect(result.owner).toBeDefined();
    });

    it("should throw Error for unknown ID", async () => {
      const mod = await import("../repositories/plotRepository");

      await expect(mod.get("nonexistent-id")).rejects.toThrow("Plot not found: nonexistent-id");
    });
  });

  describe("list", () => {
    it("should return PlotListResponse with default params", async () => {
      const mod = await import("../repositories/plotRepository");
      const result = await mod.list();

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("should filter by tag", async () => {
      const mod = await import("../repositories/plotRepository");
      const result = await mod.list({ tag: "テクノロジー" });

      for (const plot of result.items) {
        expect(plot.tags).toContain("テクノロジー");
      }
    });

    it("should respect limit and offset", async () => {
      const mod = await import("../repositories/plotRepository");
      const result = await mod.list({ limit: 2, offset: 1 });

      expect(result.items.length).toBeLessThanOrEqual(2);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(1);
    });
  });

  describe("create", () => {
    it("should return PlotResponse with generated ID", async () => {
      const mod = await import("../repositories/plotRepository");
      const result = await mod.create({ title: "テスト Plot", tags: ["テスト"] });

      expect(result.id).toMatch(/^mock-/);
      expect(result.title).toBe("テスト Plot");
      expect(result.tags).toEqual(["テスト"]);
      expect(result.starCount).toBe(0);
    });
  });

  describe("update", () => {
    it("should return updated PlotResponse", async () => {
      const mod = await import("../repositories/plotRepository");
      const result = await mod.update("plot-001", { title: "更新後タイトル" });

      expect(result.title).toBe("更新後タイトル");
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe("remove", () => {
    it("should return undefined", async () => {
      const mod = await import("../repositories/plotRepository");
      const result = await mod.remove("plot-001");

      expect(result).toBeUndefined();
    });
  });

  describe("trending", () => {
    it("should return plots sorted by starCount", async () => {
      const mod = await import("../repositories/plotRepository");
      const result = await mod.trending({ limit: 3 });

      expect(result.items.length).toBeLessThanOrEqual(3);
      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i - 1].starCount).toBeGreaterThanOrEqual(result.items[i].starCount);
      }
    });
  });

  describe("popular", () => {
    it("should return plots sorted by starCount", async () => {
      const mod = await import("../repositories/plotRepository");
      const result = await mod.popular({ limit: 3 });

      expect(result.items.length).toBeLessThanOrEqual(3);
      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i - 1].starCount).toBeGreaterThanOrEqual(result.items[i].starCount);
      }
    });
  });

  describe("latest", () => {
    it("should return plots sorted by createdAt descending", async () => {
      const mod = await import("../repositories/plotRepository");
      const result = await mod.latest({ limit: 3 });

      expect(result.items.length).toBeLessThanOrEqual(3);
      for (let i = 1; i < result.items.length; i++) {
        const prev = new Date(result.items[i - 1].createdAt).getTime();
        const curr = new Date(result.items[i].createdAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });
});
