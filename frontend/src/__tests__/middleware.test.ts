import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateSession = vi.fn();

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}));

import { middleware } from "../middleware";

function createMockRequest(pathname: string): NextRequest {
  const url = `http://localhost:3000${pathname}`;
  return {
    nextUrl: {
      pathname,
    },
    url,
  } as unknown as NextRequest;
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users from protected routes", async () => {
    const mockResponse = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: mockResponse, user: null });

    const request = createMockRequest("/plots/new");
    const result = await middleware(request);

    expect(result.status).toBe(307);
    const location = result.headers.get("location");
    expect(location).toContain("/auth/login");
    expect(location).toContain("next=%2Fplots%2Fnew");
  });

  it("allows authenticated users to access protected routes", async () => {
    const mockResponse = NextResponse.next();
    mockUpdateSession.mockResolvedValue({
      response: mockResponse,
      user: { id: "user-1", email: "test@example.com" },
    });

    const request = createMockRequest("/plots/new");
    const result = await middleware(request);

    expect(result.status).not.toBe(307);
  });

  it("redirect URL includes the original path for /plots/new", async () => {
    const mockResponse = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: mockResponse, user: null });

    const request = createMockRequest("/plots/new");
    const result = await middleware(request);

    expect(result.status).toBe(307);
    const location = result.headers.get("location");
    expect(location).toContain("next=%2Fplots%2Fnew");
  });

  it("non-protected routes pass through regardless of auth status", async () => {
    const mockResponse = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: mockResponse, user: null });

    const request = createMockRequest("/");
    const result = await middleware(request);

    expect(result).toBe(mockResponse);
  });

  it("non-protected route /plots passes through", async () => {
    const mockResponse = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: mockResponse, user: null });

    const request = createMockRequest("/plots");
    const result = await middleware(request);

    expect(result).toBe(mockResponse);
  });

  it("/auth/callback passes through for unauthenticated users (OAuth callback)", async () => {
    const mockResponse = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: mockResponse, user: null });

    const request = createMockRequest("/auth/callback");
    const result = await middleware(request);

    expect(result).toBe(mockResponse);
  });
});
