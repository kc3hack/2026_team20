import { defineConfig, devices } from "@playwright/test";

const viewports = {
  mobile: { width: 320, height: 740 },
  tablet: { width: 768, height: 900 },
  desktop: { width: 1024, height: 900 },
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    timezoneId: "UTC",
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
    },
  },
  projects: [
    {
      name: "light-mobile",
      use: {
        browserName: "chromium",
        ...devices["iPhone 12"],
        viewport: viewports.mobile,
        colorScheme: "light",
      },
    },
    {
      name: "dark-mobile",
      use: {
        browserName: "chromium",
        ...devices["iPhone 12"],
        viewport: viewports.mobile,
        colorScheme: "dark",
      },
    },
    {
      name: "light-tablet",
      use: {
        browserName: "chromium",
        ...devices["iPad Mini"],
        viewport: viewports.tablet,
        colorScheme: "light",
      },
    },
    {
      name: "dark-tablet",
      use: {
        browserName: "chromium",
        ...devices["iPad Mini"],
        viewport: viewports.tablet,
        colorScheme: "dark",
      },
    },
    {
      name: "light-desktop",
      use: {
        browserName: "chromium",
        ...devices["Desktop Chrome"],
        viewport: viewports.desktop,
        colorScheme: "light",
      },
    },
    {
      name: "dark-desktop",
      use: {
        browserName: "chromium",
        ...devices["Desktop Chrome"],
        viewport: viewports.desktop,
        colorScheme: "dark",
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
