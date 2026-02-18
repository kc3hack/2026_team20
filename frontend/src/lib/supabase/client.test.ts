import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateBrowserClient = vi.fn().mockReturnValue({ auth: {} });

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (...args: unknown[]) => mockCreateBrowserClient(...args),
}));

import { createClient } from "./client";

describe("Supabase Browser Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates browser client with correct env vars", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-anon-key";

    createClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
    );
  });

  it("returns a supabase client instance", () => {
    const client = createClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});
