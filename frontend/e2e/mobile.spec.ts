import { test, expect, devices } from "@playwright/test";

/**
 * Mobile responsiveness E2E tests.
 *
 * Verifies:
 * - Single-column layout on mobile viewports
 * - Key elements are visible and usable on small screens
 * - Login page renders correctly on mobile
 * - No horizontal overflow on mobile
 */

const MOCK_PLOTS = {
  items: [
    {
      id: "plot-m-001",
      title: "モバイルテスト物語",
      description: "モバイル確認用",
      tags: ["ファンタジー"],
      ownerId: "user-001",
      starCount: 10,
      isStarred: false,
      isPaused: false,
      editingUsers: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-02-15T12:00:00Z",
    },
    {
      id: "plot-m-002",
      title: "もう一つの物語",
      description: "テスト2",
      tags: ["SF"],
      ownerId: "user-002",
      starCount: 5,
      isStarred: false,
      isPaused: false,
      editingUsers: [],
      createdAt: "2026-01-10T00:00:00Z",
      updatedAt: "2026-02-14T12:00:00Z",
    },
  ],
  total: 2,
  limit: 5,
  offset: 0,
};

const MOCK_PLOT_DETAIL = {
  id: "plot-m-001",
  title: "モバイルテスト物語",
  description: "モバイル確認用",
  tags: ["ファンタジー"],
  ownerId: "user-001",
  starCount: 10,
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
      id: "section-m-001",
      plotId: "plot-m-001",
      title: "プロローグ",
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "テスト本文" }] }] },
      orderIndex: 0,
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-02-15T12:00:00Z",
    },
  ],
};

// Extract viewport/userAgent without defaultBrowserType to avoid worker conflicts
const { defaultBrowserType: _mb, ...iPhoneConfig } = devices["iPhone 13"];
const { defaultBrowserType: _tb, ...iPadConfig } = devices["iPad (gen 7)"];

function setupMockRoutes(page: import("@playwright/test").Page) {
  return Promise.all([
    page.route("**/api/v1/plots/trending*", (route) =>
      route.fulfill({ json: MOCK_PLOTS }),
    ),
    page.route("**/api/v1/plots/popular*", (route) =>
      route.fulfill({ json: MOCK_PLOTS }),
    ),
    page.route("**/api/v1/plots/new*", (route) =>
      route.fulfill({ json: MOCK_PLOTS }),
    ),
    page.route("**/api/v1/plots/plot-m-001", (route) =>
      route.fulfill({ json: MOCK_PLOT_DETAIL }),
    ),
  ]);
}

test.describe("Mobile responsiveness (iPhone 13)", () => {
  test.use(iPhoneConfig);

  test.beforeEach(async ({ page }) => {
    await setupMockRoutes(page);
  });

  test("top page renders single-column grid on mobile", async ({ page }) => {
    await page.goto("/");

    // Hero is visible
    await expect(page.locator("h1")).toContainText("みんなで紡ぐ");

    // Plot cards are visible
    await expect(page.getByText("モバイルテスト物語").first()).toBeVisible();

    // Check that plot cards stack vertically (single column)
    // On mobile (390px < 640px breakpoint), grid should be 1fr
    const cards = page.locator('a[href^="/plots/"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    if (count >= 2) {
      const firstBox = await cards.nth(0).boundingBox();
      const secondBox = await cards.nth(1).boundingBox();

      // In single-column layout, cards should be stacked vertically
      expect(firstBox).not.toBeNull();
      expect(secondBox).not.toBeNull();
      if (firstBox && secondBox) {
        // Same x position (or very close) means single column
        expect(Math.abs(firstBox.x - secondBox.x)).toBeLessThan(10);
        // Second card is below first
        expect(secondBox.y).toBeGreaterThan(firstBox.y);
      }
    }
  });

  test("top page hero text is readable on mobile", async ({ page }) => {
    await page.goto("/");

    const hero = page.locator("h1");
    await expect(hero).toBeVisible();

    const box = await hero.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Hero should not overflow viewport width (390px)
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(400);
    }
  });

  test("plot detail loads on mobile", async ({ page }) => {
    await page.goto("/plots/plot-m-001");

    // Title and section visible
    await expect(page.getByText("モバイルテスト物語")).toBeVisible();
    await expect(page.getByRole("button", { name: "プロローグ" })).toBeVisible();
  });

  test("login page is usable on mobile", async ({ page }) => {
    await page.goto("/auth/login");

    // Title visible
    await expect(page.getByText("DocEditorにログイン")).toBeVisible();

    // Buttons are visible and clickable
    const githubBtn = page.getByTestId("login-github");
    const googleBtn = page.getByTestId("login-google");

    await expect(githubBtn).toBeVisible();
    await expect(googleBtn).toBeVisible();

    // Buttons should be wide enough to tap (at least 40px height for mobile)
    const githubBox = await githubBtn.boundingBox();
    expect(githubBox).not.toBeNull();
    if (githubBox) {
      expect(githubBox.height).toBeGreaterThanOrEqual(40);
    }
  });

  test("page does not have horizontal overflow on mobile", async ({ page }) => {
    await page.goto("/");

    // Check that body/html doesn't overflow
    const overflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(overflowX).toBe(false);
  });
});

test.describe("Tablet responsiveness (iPad)", () => {
  test.use(iPadConfig);

  test.beforeEach(async ({ page }) => {
    await setupMockRoutes(page);
  });

  test("top page renders two-column grid on tablet", async ({ page }) => {
    await page.goto("/");

    // Plot cards visible
    await expect(page.getByText("モバイルテスト物語").first()).toBeVisible();

    // On iPad (810px > 640px breakpoint), grid should be 2 columns
    const cards = page.locator('a[href^="/plots/"]');
    const count = await cards.count();

    if (count >= 2) {
      const firstBox = await cards.nth(0).boundingBox();
      const secondBox = await cards.nth(1).boundingBox();

      expect(firstBox).not.toBeNull();
      expect(secondBox).not.toBeNull();
      if (firstBox && secondBox) {
        // In 2-column layout, second card should be on same row or different x
        const sameRow = Math.abs(firstBox.y - secondBox.y) < 10;
        const differentColumn = Math.abs(firstBox.x - secondBox.x) > 50;

        expect(sameRow || differentColumn).toBe(true);
      }
    }
  });
});
