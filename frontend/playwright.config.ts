import { defineConfig, devices } from "@playwright/test";

/**
 * BUG-LEARN-019: Responsive / mobile test configuration.
 * Run: npx playwright install && npx playwright test
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    // Desktop
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    // Mobile — BUG-LEARN-019 primary targets
    {
      name: "mobile-375",
      use: {
        ...devices["iPhone SE"],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: "mobile-414",
      use: {
        ...devices["iPhone XR"],
        viewport: { width: 414, height: 896 },
      },
    },
  ],
});
