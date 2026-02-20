import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mockCurrentUser,
  mockUserContributions,
  mockUserPlots,
  mockUserProfile,
} from "@/mocks/data/users";
import * as authRepository from "../repositories/authRepository";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("authRepository", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("getCurrentUser", () => {
    it("should call GET /auth/me", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCurrentUser,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await authRepository.getCurrentUser("test-token");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/me"),
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result).toEqual(mockCurrentUser);
    });

    it("should include Authorization header", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCurrentUser,
        headers: new Headers({ "content-type": "application/json" }),
      });

      await authRepository.getCurrentUser("my-token");

      const headers = fetchMock.mock.calls[0][1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer my-token");
    });

    it("should throw ApiError(401) when no token (unauthenticated)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: "Unauthorized" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(authRepository.getCurrentUser()).rejects.toMatchObject({
        status: 401,
        detail: "Unauthorized",
      });
    });
  });

  describe("getUserProfile", () => {
    it("should call GET /auth/users/{username}", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUserProfile,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await authRepository.getUserProfile("tanaka");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/users/tanaka"),
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result).toEqual(mockUserProfile);
    });

    it("should throw ApiError(404) for user-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "User not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(authRepository.getUserProfile("user-404")).rejects.toMatchObject({
        status: 404,
        detail: "User not found",
      });
    });
  });

  describe("getUserPlots", () => {
    it("should call GET /auth/users/{username}/plots", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUserPlots,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await authRepository.getUserPlots("tanaka");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/users/tanaka/plots"),
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result).toEqual(mockUserPlots);
    });

    it("should throw ApiError(404) for user-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "User not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(authRepository.getUserPlots("user-404")).rejects.toMatchObject({
        status: 404,
        detail: "User not found",
      });
    });
  });

  describe("getUserContributions", () => {
    it("should call GET /auth/users/{username}/contributions", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUserContributions,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await authRepository.getUserContributions("tanaka");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/users/tanaka/contributions"),
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      expect(result).toEqual(mockUserContributions);
    });

    it("should throw ApiError(404) for user-404", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "User not found" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await expect(authRepository.getUserContributions("user-404")).rejects.toMatchObject({
        status: 404,
        detail: "User not found",
      });
    });
  });
});
