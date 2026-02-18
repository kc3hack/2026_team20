import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateServerClient = vi.fn().mockReturnValue({ auth: {} });
const mockCookieStore = {
  getAll: vi.fn().mockReturnValue([]),
  set: vi.fn(),
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve(mockCookieStore),
}));

import { createClient } from "./server";

describe("Supabase Server Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-anon-key";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("creates server client with correct env vars and cookie handlers", async () => {
    await createClient();

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    );
  });

  it("cookie getAll delegates to cookieStore", async () => {
    mockCookieStore.getAll.mockReturnValue([{ name: "sb-token", value: "abc" }]);

    await createClient();

    const cookieOptions = mockCreateServerClient.mock.calls[0][2].cookies;
    const result = cookieOptions.getAll();
    expect(result).toEqual([{ name: "sb-token", value: "abc" }]);
  });

  it("cookie setAll delegates to cookieStore.set", async () => {
    await createClient();

    const cookieOptions = mockCreateServerClient.mock.calls[0][2].cookies;
    cookieOptions.setAll([
      { name: "sb-token", value: "xyz", options: { path: "/" } },
    ]);
    expect(mockCookieStore.set).toHaveBeenCalledWith("sb-token", "xyz", { path: "/" });
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    await expect(createClient()).rejects.toThrow("NEXT_PUBLIC_SUPABASE_URL is required");
  });

  it("throws when both key env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    await expect(createClient()).rejects.toThrow(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be set",
    );
  });
});
