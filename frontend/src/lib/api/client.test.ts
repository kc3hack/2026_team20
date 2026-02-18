import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiClient, apiUpload } from "./client";

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("apiClient", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    fetchMock.mockClear();
  });

  afterEach(() => {
    if (originalApiUrl !== undefined) {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }
  });

  it("should make a GET request and return JSON", async () => {
    const mockData = { id: "1", title: "Test Plot" };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
      headers: new Headers({ "content-type": "application/json" }),
    });

    const result = await apiClient("/plots/1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/plots/1",
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    expect(result).toEqual(mockData);
  });

  it("should handle 204 No Content", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    const result = await apiClient("/plots/1", { method: "DELETE" });
    expect(result).toBeUndefined();
  });

  it("should throw ApiError on 4xx response with JSON detail", async () => {
    const errorData = { detail: "Not Found" };
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => errorData,
      headers: new Headers({ "content-type": "application/json" }),
    });

    await expect(apiClient("/plots/999")).rejects.toThrow(ApiError);
    await expect(apiClient("/plots/999")).rejects.toThrow("Not Found");
  });

  it("should throw ApiError on 5xx response with text body", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
      headers: new Headers({ "content-type": "text/plain" }),
    });

    await expect(apiClient("/plots/500")).rejects.toThrow(ApiError);
    await expect(apiClient("/plots/500")).rejects.toThrow("Internal Server Error");
  });

  it("should include Authorization header if token is provided", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
      headers: new Headers({ "content-type": "application/json" }),
    });

    await apiClient("/secure", { token: "secret-token" });

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer secret-token");
  });

  it("should append query parameters correctly", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    await apiClient("/plots", {
      params: { limit: 20, offset: 0, tag: "SF" },
    });

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain("/api/v1/plots?");
    expect(calledUrl).toContain("limit=20");
    expect(calledUrl).toContain("offset=0");
    expect(calledUrl).toContain("tag=SF");
  });

  it("should ignore undefined parameters", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    await apiClient("/plots", {
      params: { limit: 20, tag: undefined },
    });

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain("limit=20");
    expect(calledUrl).not.toContain("tag");
  });

  it("should handle absolute URL in BASE_URL", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/api/v1";

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    await apiClient("/plots", {
      params: { limit: 10 },
    });

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toBe("https://api.example.com/api/v1/plots?limit=10");
  });

  it("should automatically stringify JSON body", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: "123" }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    await apiClient("/plots", {
      method: "POST",
      body: JSON.stringify({
        title: "New Plot",
        tags: ["SF", "Fantasy"],
      }),
    });

    const request = fetchMock.mock.calls[0][1];
    expect(request.body).toBe('{"title":"New Plot","tags":["SF","Fantasy"]}');
    expect((request.headers as Headers).get("Content-Type")).toBe("application/json");
  });

  it("should not stringify if body is already a string", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
      headers: new Headers({ "content-type": "application/json" }),
    });

    const bodyString = '{"already":"stringified"}';
    await apiClient("/plots", {
      method: "POST",
      body: bodyString,
    });

    const request = fetchMock.mock.calls[0][1];
    expect(request.body).toBe(bodyString);
  });

  it("should abort request when timeout is reached", async () => {
    // Mock a slow response that respects abort signal
    fetchMock.mockImplementationOnce((_url, options) => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ data: "slow" }),
            headers: new Headers({ "content-type": "application/json" }),
          });
        }, 1000); // 1 second delay

        // Listen for abort event
        options?.signal?.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    // Request with 100ms timeout should fail
    await expect(apiClient("/slow", { timeout: 100 })).rejects.toThrow();
  });

  it("should not abort request when no timeout is specified", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: "success" }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    const result = await apiClient("/fast");
    expect(result).toEqual({ data: "success" });
  });
});

describe("apiUpload", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  it("should accept supported image types", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://example.com/image.jpg" }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    const file = new File([""], "test.jpg", { type: "image/jpeg" });
    await apiUpload("/images", file);

    expect(fetchMock).toHaveBeenCalled();
  });

  it("should reject unsupported file types", async () => {
    const file = new File([""], "test.pdf", { type: "application/pdf" });

    await expect(apiUpload("/images", file)).rejects.toThrow(
      "Unsupported file type: application/pdf",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should accept all supported image formats", async () => {
    const supportedTypes = [
      { type: "image/jpeg", ext: "jpg" },
      { type: "image/png", ext: "png" },
      { type: "image/gif", ext: "gif" },
      { type: "image/webp", ext: "webp" },
    ];

    for (const { type, ext } of supportedTypes) {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: `https://example.com/image.${ext}` }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      const file = new File([""], `test.${ext}`, { type });
      await expect(apiUpload("/images", file)).resolves.toBeDefined();
    }
  });
});
