import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Mock mode: all repositories return mock data", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_USE_MOCK = "true";
  });

  // ==========================================================================
  // plotRepository
  // ==========================================================================
  describe("plotRepository", () => {
    it("list({}) returns plots with data", async () => {
      const { plotRepository } = await import("./plots");
      const result = await plotRepository.list({});

      expect(result).toHaveProperty("plots");
      expect(result).toHaveProperty("total");
      expect(result.plots.length).toBeGreaterThan(0);
      expect(result.plots[0]).toHaveProperty("id");
      expect(result.plots[0]).toHaveProperty("title");
    });

    it("get(plotId) returns a PlotDetailResponse with sections", async () => {
      const { plotRepository } = await import("./plots");
      const listResult = await plotRepository.list({});
      const plotId = listResult.plots[0].id;

      const detail = await plotRepository.get(plotId);

      expect(detail).toHaveProperty("id", plotId);
      expect(detail).toHaveProperty("title");
      expect(detail).toHaveProperty("content");
      expect(detail).toHaveProperty("sections");
      expect(detail.sections.length).toBeGreaterThan(0);
    });

    it("trending({}) returns plots", async () => {
      const { plotRepository } = await import("./plots");
      const result = await plotRepository.trending({});

      expect(result).toHaveProperty("plots");
      expect(result).toHaveProperty("total");
      expect(result.plots.length).toBeGreaterThan(0);
    });

    it("create returns a PlotResponse", async () => {
      const { plotRepository } = await import("./plots");
      const result = await plotRepository.create({
        title: "Test",
        tags: [],
        is_public: true,
      });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("title", "Test");
      expect(result).toHaveProperty("created_at");
    });
  });

  // ==========================================================================
  // sectionRepository
  // ==========================================================================
  describe("sectionRepository", () => {
    it("list({plotId}) returns items and total", async () => {
      const { sectionRepository } = await import("./sections");
      const result = await sectionRepository.list({ plotId: "plot-1" });

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty("id");
      expect(result.items[0]).toHaveProperty("title");
    });
  });

  // ==========================================================================
  // snsRepository
  // ==========================================================================
  describe("snsRepository", () => {
    it("listStars({plotId}) returns stars and total", async () => {
      const { snsRepository } = await import("./sns");
      const result = await snsRepository.listStars({ plotId: "plot-1" });

      expect(result).toHaveProperty("stars");
      expect(result).toHaveProperty("total");
      expect(result.stars.length).toBeGreaterThan(0);
    });

    it("listThreads({plotId}) returns threads and total", async () => {
      const { snsRepository } = await import("./sns");
      const result = await snsRepository.listThreads({ plotId: "plot-1" });

      expect(result).toHaveProperty("threads");
      expect(result).toHaveProperty("total");
      expect(result.threads.length).toBeGreaterThan(0);
    });

    it("listComments({threadId}) returns items and total", async () => {
      const { snsRepository } = await import("./sns");
      // First get a real thread ID from mock data
      const threadsResult = await snsRepository.listThreads({ plotId: "plot-1" });
      const threadId = threadsResult.threads[0].id;

      const result = await snsRepository.listComments({ threadId });

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(result.items.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // searchRepository
  // ==========================================================================
  describe("searchRepository", () => {
    it("search({query:'test'}) returns plots, total, query", async () => {
      const { searchRepository } = await import("./search");
      const result = await searchRepository.search({ query: "test" });

      expect(result).toHaveProperty("plots");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("query");
    });
  });

  // ==========================================================================
  // imageRepository
  // ==========================================================================
  describe("imageRepository", () => {
    it("upload({file}) returns url, filename, width, height", async () => {
      const { imageRepository } = await import("./images");
      const file = new File(["test"], "test.png", { type: "image/png" });
      const result = await imageRepository.upload({ file });

      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("filename");
      expect(result).toHaveProperty("width");
      expect(result).toHaveProperty("height");
    });
  });

  // ==========================================================================
  // historyRepository
  // ==========================================================================
  describe("historyRepository", () => {
    it("list({plot_id}) returns items and total", async () => {
      const { historyRepository } = await import("./history");
      const result = await historyRepository.list({ plot_id: "plot-1" });

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });
  });
});
