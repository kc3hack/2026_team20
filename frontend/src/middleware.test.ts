import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateSession = vi.fn();

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}));

import { middleware } from "./middleware";

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
    expect(location).toContain("redirect=%2Fplots%2Fnew");
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

  it("redirect URL includes the original path", async () => {
    const mockResponse = NextResponse.next();
    mockUpdateSession.mockResolvedValue({ response: mockResponse, user: null });

    const request = createMockRequest("/plots/550e8400-e29b-41d4-a716-446655440000/edit");
    const result = await middleware(request);

    expect(result.status).toBe(307);
    const location = result.headers.get("location");
    expect(location).toContain("redirect=%2Fplots%2F550e8400-e29b-41d4-a716-446655440000%2Fedit");
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
});
