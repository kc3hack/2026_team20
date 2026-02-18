import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("plotRepository.list query parameter generation", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    process.env.NEXT_PUBLIC_USE_MOCK = "false";
    delete process.env.NEXT_PUBLIC_API_URL;

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ plots: [], total: 0 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("default params (empty object) → URL has no query params", async () => {
    const { plotRepository } = await import("./plots");
    await plotRepository.list({});

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe("/api/v1/plots");
  });

  it("all params provided → all appear in URL", async () => {
    const { plotRepository } = await import("./plots");
    await plotRepository.list({
      limit: 10,
      offset: 20,
      sort: "created_at",
      order: "desc",
      author: "testuser",
      tag: "react",
      search: "hello",
      starred: true,
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("limit=10");
    expect(calledUrl).toContain("offset=20");
    expect(calledUrl).toContain("sort=created_at");
    expect(calledUrl).toContain("order=desc");
    expect(calledUrl).toContain("author=testuser");
    expect(calledUrl).toContain("tag=react");
    expect(calledUrl).toContain("search=hello");
    expect(calledUrl).toContain("starred=true");
  });

  it("only some params → only those appear", async () => {
    const { plotRepository } = await import("./plots");
    await plotRepository.list({
      limit: 5,
      tag: "typescript",
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("limit=5");
    expect(calledUrl).toContain("tag=typescript");
    expect(calledUrl).not.toContain("offset");
    expect(calledUrl).not.toContain("sort");
    expect(calledUrl).not.toContain("order");
    expect(calledUrl).not.toContain("author");
    expect(calledUrl).not.toContain("search");
    expect(calledUrl).not.toContain("starred");
  });

  it("starred: true → starred=true in URL", async () => {
    const { plotRepository } = await import("./plots");
    await plotRepository.list({ starred: true });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("starred=true");
  });

  it("starred: false → starred=false in URL", async () => {
    const { plotRepository } = await import("./plots");
    await plotRepository.list({ starred: false });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("starred=false");
  });

  it("limit and offset as numbers → converted to strings in URL", async () => {
    const { plotRepository } = await import("./plots");
    await plotRepository.list({ limit: 50, offset: 100 });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("limit=50");
    expect(calledUrl).toContain("offset=100");
  });

  it("undefined params are excluded from URL", async () => {
    const { plotRepository } = await import("./plots");
    await plotRepository.list({
      limit: 10,
      offset: undefined,
      sort: undefined,
      order: undefined,
      author: undefined,
      tag: undefined,
      search: undefined,
      starred: undefined,
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("limit=10");
    expect(calledUrl).not.toContain("offset");
    expect(calledUrl).not.toContain("sort");
    expect(calledUrl).not.toContain("order");
    expect(calledUrl).not.toContain("author");
    expect(calledUrl).not.toContain("tag");
    expect(calledUrl).not.toContain("search");
    expect(calledUrl).not.toContain("starred");
  });
});
