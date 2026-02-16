import { test, expect } from "@playwright/test";

/**
 * Auth flow E2E tests:
 * Login page → Star → Fork
 *
 * OAuth login is mocked — tests verify the UI flow, not real OAuth.
 */

test.describe("Auth flow", () => {
  test("login page renders with provider buttons", async ({ page }) => {
    await page.goto("/auth/login");

    // Page title
    await expect(page.getByText("DocEditorにログイン")).toBeVisible();

    // Provider buttons
    await expect(page.getByTestId("login-github")).toBeVisible();
    await expect(page.getByTestId("login-google")).toBeVisible();

    // GitHub button text
    await expect(page.getByText("GitHubでログイン")).toBeVisible();
    await expect(page.getByText("Googleでログイン")).toBeVisible();

    // Terms text
    await expect(page.getByText("利用規約に同意した")).toBeVisible();
  });

  test("login page shows redirect message when redirectTo param is present", async ({ page }) => {
    await page.goto("/auth/login?redirectTo=/plots/new");

    await expect(
      page.getByText("このページにアクセスするにはログインが必要です"),
    ).toBeVisible();
  });

  test("login page does not show redirect message without param", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(
      page.getByText("このページにアクセスするにはログインが必要です"),
    ).not.toBeVisible();
  });
});

test.describe("Star interaction (mocked)", () => {
  const MOCK_PLOT_DETAIL = {
    id: "plot-star-test",
    title: "スターテスト物語",
    description: "スター用テスト",
    tags: [],
    ownerId: "user-001",
    starCount: 5,
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
        id: "section-star",
        plotId: "plot-star-test",
        title: "序章",
        content: { type: "doc", content: [] },
        orderIndex: 0,
        version: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-02-15T12:00:00Z",
      },
    ],
  };

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/plots/plot-star-test", (route) =>
      route.fulfill({ json: MOCK_PLOT_DETAIL }),
    );
  });

  test("plot detail shows star count", async ({ page }) => {
    await page.goto("/plots/plot-star-test");

    // Star count displayed
    await expect(page.getByText("5")).toBeVisible();
  });
});

test.describe("Fork interaction (mocked)", () => {
  const MOCK_PLOT_DETAIL = {
    id: "plot-fork-test",
    title: "フォークテスト物語",
    description: "フォーク用テスト",
    tags: [],
    ownerId: "user-001",
    starCount: 3,
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
        id: "section-fork",
        plotId: "plot-fork-test",
        title: "第1章",
        content: { type: "doc", content: [] },
        orderIndex: 0,
        version: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-02-15T12:00:00Z",
      },
    ],
  };

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/plots/plot-fork-test", (route) =>
      route.fulfill({ json: MOCK_PLOT_DETAIL }),
    );
  });

  test("plot detail page loads correctly for fork test", async ({ page }) => {
    await page.goto("/plots/plot-fork-test");

    await expect(page.getByText("フォークテスト物語")).toBeVisible();
    await expect(page.getByRole("button", { name: "第1章" })).toBeVisible();
  });
});
