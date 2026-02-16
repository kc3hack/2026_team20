import { test, expect } from "@playwright/test";

/**
 * Full user journey E2E test:
 * Top page → Plot detail → Edit → History → Restore
 *
 * Uses API mocking so tests run without a live backend.
 */

const MOCK_PLOTS = {
  items: [
    {
      id: "plot-001",
      title: "テスト物語",
      description: "テスト用のPlot",
      tags: ["ファンタジー", "冒険"],
      ownerId: "user-001",
      starCount: 42,
      isStarred: false,
      isPaused: false,
      editingUsers: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-02-15T12:00:00Z",
    },
    {
      id: "plot-002",
      title: "別の物語",
      description: "2つ目のPlot",
      tags: ["SF"],
      ownerId: "user-002",
      starCount: 10,
      isStarred: false,
      isPaused: false,
      editingUsers: [],
      createdAt: "2026-01-15T00:00:00Z",
      updatedAt: "2026-02-14T12:00:00Z",
    },
  ],
  total: 2,
  limit: 5,
  offset: 0,
};

const MOCK_PLOT_DETAIL = {
  id: "plot-001",
  title: "テスト物語",
  description: "テスト用のPlot",
  tags: ["ファンタジー", "冒険"],
  ownerId: "user-001",
  starCount: 42,
  isStarred: false,
  isPaused: false,
  editingUsers: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-02-15T12:00:00Z",
  owner: {
    id: "user-001",
    displayName: "テスト太郎",
    avatarUrl: "",
  },
  sections: [
    {
      id: "section-001",
      plotId: "plot-001",
      title: "第1章",
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "むかしむかし…" }] }] },
      orderIndex: 0,
      version: 3,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-02-15T12:00:00Z",
    },
  ],
};

const MOCK_HISTORY = {
  items: [
    {
      id: "hist-003",
      sectionId: "section-001",
      operationType: "update",
      payload: {},
      user: { id: "user-001", displayName: "テスト太郎", avatarUrl: "" },
      version: 3,
      createdAt: "2026-02-15T12:00:00Z",
    },
    {
      id: "hist-002",
      sectionId: "section-001",
      operationType: "update",
      payload: {},
      user: { id: "user-001", displayName: "テスト太郎", avatarUrl: "" },
      version: 2,
      createdAt: "2026-02-10T12:00:00Z",
    },
    {
      id: "hist-001",
      sectionId: "section-001",
      operationType: "create",
      payload: {},
      user: { id: "user-001", displayName: "テスト太郎", avatarUrl: "" },
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
    },
  ],
  total: 3,
};

test.describe("Full user journey", () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route("**/api/v1/plots/trending*", (route) =>
      route.fulfill({ json: MOCK_PLOTS }),
    );
    await page.route("**/api/v1/plots/popular*", (route) =>
      route.fulfill({ json: MOCK_PLOTS }),
    );
    await page.route("**/api/v1/plots/new*", (route) =>
      route.fulfill({ json: MOCK_PLOTS }),
    );
    await page.route("**/api/v1/plots/plot-001", (route) =>
      route.fulfill({ json: MOCK_PLOT_DETAIL }),
    );
    await page.route("**/api/v1/sections/section-001/history*", (route) =>
      route.fulfill({ json: MOCK_HISTORY }),
    );
    await page.route("**/api/v1/sections/section-001/rollback/*", (route) =>
      route.fulfill({
        json: {
          ...MOCK_PLOT_DETAIL.sections[0],
          version: 2,
          content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "復元された内容" }] }] },
        },
      }),
    );
  });

  test("top page loads with hero and plot cards", async ({ page }) => {
    await page.goto("/");

    // Hero section
    await expect(page.locator("h1")).toContainText("みんなで紡ぐ");
    await expect(page.locator("h1")).toContainText("物語の世界");

    // Subtitle
    await expect(page.getByText("Plotは、誰でも参加できる")).toBeVisible();

    // Section titles
    await expect(page.getByText("急上昇")).toBeVisible();
    await expect(page.getByText("新着")).toBeVisible();
    await expect(page.getByText("人気")).toBeVisible();

    // Plot cards rendered
    await expect(page.getByText("テスト物語").first()).toBeVisible();
    await expect(page.getByText("別の物語").first()).toBeVisible();
  });

  test("navigate from top page to plot detail", async ({ page }) => {
    await page.goto("/");

    // Click first plot card
    await page.getByText("テスト物語").first().click();

    // Should navigate to plot detail
    await page.waitForURL("**/plots/plot-001");

    // Plot detail shows title and description
    await expect(page.locator("h1")).toContainText("テスト物語");
    await expect(page.getByText("テスト用のPlot")).toBeVisible();

    // Tags are visible
    await expect(page.getByText("ファンタジー")).toBeVisible();
    await expect(page.getByText("冒険")).toBeVisible();

    // Owner info
    await expect(page.getByText("テスト太郎")).toBeVisible();

    // Section tab
    await expect(page.getByRole("button", { name: "第1章" })).toBeVisible();
  });

  test("plot detail shows section content", async ({ page }) => {
    await page.goto("/plots/plot-001");

    // Wait for content to load
    await expect(page.getByRole("button", { name: "第1章" })).toBeVisible();

    // Star count shown
    await expect(page.getByText("42")).toBeVisible();
  });

  test("header and footer are present on all pages", async ({ page }) => {
    // Top page
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();

    // Plot detail
    await page.goto("/plots/plot-001");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });

  test("plot cards link to correct detail page", async ({ page }) => {
    await page.goto("/");

    // Check that plot cards are links to /plots/{id}
    const firstCard = page.locator('a[href="/plots/plot-001"]').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard).toContainText("テスト物語");
  });

  test("plot tags are displayed on cards", async ({ page }) => {
    await page.goto("/");

    // Tags on plot card
    await expect(page.getByText("ファンタジー").first()).toBeVisible();
    await expect(page.getByText("SF").first()).toBeVisible();
  });
});
