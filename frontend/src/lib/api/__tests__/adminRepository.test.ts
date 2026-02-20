import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_FORBIDDEN_MESSAGE } from "@/mocks/data/admin";
import * as adminRepository from "../repositories/adminRepository";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("adminRepository", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("banUser", () => {
    it("should call POST /admin/bans with body", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({}),
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { plotId: "plot-001", userId: "user-001", reason: "荒らし行為" };
      const result = await adminRepository.banUser(body, "admin-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/admin/bans");
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

      await adminRepository.banUser({ plotId: "plot-001", userId: "user-001" }, "admin-token");

      const headers = fetchMock.mock.calls[0][1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer admin-token");
    });

    it("should throw ApiError(403) when not admin", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: ADMIN_FORBIDDEN_MESSAGE }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        adminRepository.banUser({ plotId: "plot-001", userId: "user-001" }, "user-token"),
      ).rejects.toMatchObject({
        status: 403,
        detail: ADMIN_FORBIDDEN_MESSAGE,
      });
    });
  });

  describe("unbanUser", () => {
    it("should call DELETE /admin/bans with body", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      const body = { plotId: "plot-001", userId: "user-001" };
      const result = await adminRepository.unbanUser(body, "admin-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/admin/bans");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("DELETE");
      expect(JSON.parse(request.body as string)).toEqual(body);
      expect(result).toBeUndefined();
    });

    it("should throw ApiError(403) when not admin", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: ADMIN_FORBIDDEN_MESSAGE }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        adminRepository.unbanUser({ plotId: "plot-001", userId: "user-001" }, "user-token"),
      ).rejects.toMatchObject({
        status: 403,
        detail: ADMIN_FORBIDDEN_MESSAGE,
      });
    });
  });

  describe("pausePlot", () => {
    it("should call POST /plots/{plotId}/pause with body", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { reason: "不適切なコンテンツ" };
      const result = await adminRepository.pausePlot("plot-001", body, "admin-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/plots/plot-001/pause");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("POST");
      expect(JSON.parse(request.body as string)).toEqual(body);
      expect(result).toEqual({});
    });

    it("should work with empty body (no reason)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await adminRepository.pausePlot("plot-001", undefined, "admin-token");

      const request = fetchMock.mock.calls[0][1];
      expect(request.body).toBeUndefined();
    });

    it("should throw ApiError(403) when not admin", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: ADMIN_FORBIDDEN_MESSAGE }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        adminRepository.pausePlot("plot-001", undefined, "user-token"),
      ).rejects.toMatchObject({
        status: 403,
        detail: ADMIN_FORBIDDEN_MESSAGE,
      });
    });
  });

  describe("resumePlot", () => {
    it("should call DELETE /plots/{plotId}/pause", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await adminRepository.resumePlot("plot-001", "admin-token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/plots/plot-001/pause");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("DELETE");
      expect(result).toEqual({});
    });

    it("should throw ApiError(403) when not admin", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: ADMIN_FORBIDDEN_MESSAGE }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(adminRepository.resumePlot("plot-001", "user-token")).rejects.toMatchObject({
        status: 403,
        detail: ADMIN_FORBIDDEN_MESSAGE,
      });
    });
  });
});
