import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockExchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    }),
}));

import { GET } from "../route";

function buildRequest(url: string): Request {
  return new Request(url, { method: "GET" });
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exchanges code for session and redirects to / on success", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const request = buildRequest("http://localhost:3000/auth/callback?code=test-code");
    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects to custom next path when provided", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const request = buildRequest(
      "http://localhost:3000/auth/callback?code=test-code&redirectTo=/dashboard",
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("redirects to login with error when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: "Invalid code" },
    });

    const request = buildRequest("http://localhost:3000/auth/callback?code=bad-code");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/login?error=auth_callback_error",
    );
  });

  it("preserves redirectTo parameter on error redirect", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: "Invalid code" },
    });

    const request = buildRequest(
      "http://localhost:3000/auth/callback?code=bad-code&redirectTo=/plots/new",
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("error=auth_callback_error");
    expect(location).toContain("redirectTo=%2Fplots%2Fnew");
  });

  it("redirects to login with error when no code is provided", async () => {
    const request = buildRequest("http://localhost:3000/auth/callback");
    const response = await GET(request);

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/login?error=auth_callback_error",
    );
  });

  it("ignores protocol-relative redirectTo param to prevent open redirect", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const request = buildRequest(
      "http://localhost:3000/auth/callback?code=test-code&redirectTo=//evil.com",
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("ignores absolute URL redirectTo param to prevent open redirect", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const request = buildRequest(
      "http://localhost:3000/auth/callback?code=test-code&redirectTo=https://evil.com",
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("ignores backslash redirectTo param to prevent open redirect", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const request = buildRequest(
      "http://localhost:3000/auth/callback?code=test-code&redirectTo=/\\evil.com",
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
