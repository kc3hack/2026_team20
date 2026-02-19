import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPlots } from "@/mocks/data/plots";
import { mockRollbackLogList, mockSnapshotDetail, mockSnapshotList } from "@/mocks/data/snapshots";
import * as snapshotRepository from "../repositories/snapshotRepository";

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("snapshotRepository", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  describe("list", () => {
    it("should call GET /plots/{plotId}/snapshots", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSnapshotList,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await snapshotRepository.list("plot-001");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/plots/plot-001/snapshots"),
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result).toEqual(mockSnapshotList);
    });

    it("should pass limit and offset as query params", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSnapshotList,
        headers: new Headers({ "content-type": "application/json" }),
      });

      await snapshotRepository.list("plot-001", { limit: 10, offset: 5 });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("limit=10");
      expect(calledUrl).toContain("offset=5");
    });

    it("should throw ApiError(404) for plot-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Plot not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(snapshotRepository.list("plot-404")).rejects.toMatchObject({
        status: 404,
        detail: "Plot not found",
      });
    });
  });

  describe("get", () => {
    it("should call GET /plots/{plotId}/snapshots/{snapshotId}", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSnapshotDetail,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await snapshotRepository.get("plot-001", "snapshot-003");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/plots/plot-001/snapshots/snapshot-003"),
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result).toEqual(mockSnapshotDetail);
    });

    it("should throw ApiError(404) for snapshot-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Snapshot not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(snapshotRepository.get("plot-001", "snapshot-404")).rejects.toMatchObject({
        status: 404,
        detail: "Snapshot not found",
      });
    });
  });

  describe("rollback", () => {
    it("should call POST /plots/{plotId}/rollback/{snapshotId}", async () => {
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

      const result = await snapshotRepository.rollback(
        "plot-001",
        "snapshot-003",
        undefined,
        "test-token",
      );

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/v1/plots/plot-001/rollback/snapshot-003");
      const request = fetchMock.mock.calls[0][1];
      expect(request.method).toBe("POST");
      expect(result).toEqual(mockDetail);
    });

    it("should send body with expectedVersion and reason", async () => {
      const mockDetail = {
        ...mockPlots[0],
        sections: [],
        owner: null,
      };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockDetail,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const body = { expectedVersion: 3, reason: "荒らし行為の復旧" };
      await snapshotRepository.rollback("plot-001", "snapshot-003", body, "test-token");

      const request = fetchMock.mock.calls[0][1];
      expect(JSON.parse(request.body as string)).toEqual(body);
    });

    it("should work with empty body", async () => {
      const mockDetail = {
        ...mockPlots[0],
        sections: [],
        owner: null,
      };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockDetail,
        headers: new Headers({ "content-type": "application/json" }),
      });

      await snapshotRepository.rollback("plot-001", "snapshot-003", undefined, "test-token");

      const request = fetchMock.mock.calls[0][1];
      expect(request.body).toBeUndefined();
    });

    it("should throw ApiError(404) for snapshot-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Snapshot not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        snapshotRepository.rollback("plot-001", "snapshot-404", undefined, "token"),
      ).rejects.toMatchObject({
        status: 404,
        detail: "Snapshot not found",
      });
    });

    it("should throw ApiError(403) for plot-403 (paused)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: "This plot is paused" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        snapshotRepository.rollback("plot-403", "snapshot-001", undefined, "token"),
      ).rejects.toMatchObject({
        status: 403,
        detail: "This plot is paused",
      });
    });

    it("should throw ApiError(409) for snapshot-409 (version conflict)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ detail: "Version conflict" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        snapshotRepository.rollback("plot-001", "snapshot-409", undefined, "token"),
      ).rejects.toMatchObject({
        status: 409,
        detail: "Version conflict",
      });
    });
  });

  describe("getRollbackLogs", () => {
    it("should call GET /plots/{plotId}/rollback-logs", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRollbackLogList,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await snapshotRepository.getRollbackLogs("plot-001", undefined, "test-token");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/plots/plot-001/rollback-logs"),
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result).toEqual(mockRollbackLogList);
    });

    it("should pass limit and offset as query params", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRollbackLogList,
        headers: new Headers({ "content-type": "application/json" }),
      });

      await snapshotRepository.getRollbackLogs("plot-001", { limit: 5, offset: 0 }, "token");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("limit=5");
      expect(calledUrl).toContain("offset=0");
    });

    it("should throw ApiError(403) for plot-403 (not owner)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: "This plot is paused" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        snapshotRepository.getRollbackLogs("plot-403", undefined, "token"),
      ).rejects.toMatchObject({
        status: 403,
        detail: "This plot is paused",
      });
    });

    it("should throw ApiError(404) for plot-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Plot not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(
        snapshotRepository.getRollbackLogs("plot-404", undefined, "token"),
      ).rejects.toMatchObject({
        status: 404,
        detail: "Plot not found",
      });
    });
  });
});
