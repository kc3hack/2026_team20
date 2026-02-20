import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mockCurrentUser,
  mockUserContributions,
  mockUserPlots,
  mockUserProfile,
} from "@/mocks/data/users";
import * as authRepository from "../repositories/authRepository";

// fetch mock（getUserProfile / getUserPlots / getUserContributions で使う）
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// Supabase SDK mock（getCurrentUser で使う）
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

describe("authRepository", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    mockGetUser.mockReset();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("getCurrentUser", () => {
    it("should return user from Supabase auth.getUser()", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            id: mockCurrentUser.id,
            email: mockCurrentUser.email,
            user_metadata: {
              full_name: mockCurrentUser.displayName,
              avatar_url: mockCurrentUser.avatarUrl,
            },
            created_at: mockCurrentUser.createdAt,
          },
        },
        error: null,
      });

      const result = await authRepository.getCurrentUser();

      expect(mockGetUser).toHaveBeenCalledOnce();
      expect(result).toEqual(mockCurrentUser);
    });

    it("should throw when Supabase returns error", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "Invalid token" },
      });

      await expect(authRepository.getCurrentUser()).rejects.toThrow("Invalid token");
    });

    it("should throw when no user is returned", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await expect(authRepository.getCurrentUser()).rejects.toThrow("Not authenticated");
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
