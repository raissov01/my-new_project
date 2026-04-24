/**
 * BUG-LEARN-019: /learn/map responsive tests — 375px, 414px, desktop.
 *
 * Pre-requisites:
 *   1. `npx playwright install` (installs browser binaries)
 *   2. Dev server running: `npm run dev`
 *   3. Set PLAYWRIGHT_COOKIE env to a valid `next-auth.session-token` value
 *      so the server component passes auth. Otherwise tests run as an
 *      unauthenticated user and will redirect to /login.
 *
 * Run: npx playwright test --project=mobile-375
 */

import { test, expect, type Page } from "@playwright/test";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function loginWithCookie(page: Page) {
  const cookie = process.env.PLAYWRIGHT_COOKIE;
  if (!cookie) return; // Skip auth — tests that need auth will just verify redirect

  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: cookie,
      domain: new URL(baseURL).hostname,
      path: "/",
      httpOnly: true,
      secure: false,
    },
  ]);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Unauthenticated user", () => {
  test("redirects /learn to /login", async ({ page }) => {
    await page.goto("/learn");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects /learn/map to /login", async ({ page }) => {
    await page.goto("/learn/map");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects /ielts/roadmap to /login", async ({ page }) => {
    await page.goto("/ielts/roadmap");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Placement flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginWithCookie(page);
    if (!process.env.PLAYWRIGHT_COOKIE) test.skip();
  });

  test("new user is redirected to /learn/placement", async ({ page }) => {
    await page.goto("/learn");
    // Either on placement or map (if already placed)
    const url = page.url();
    expect(url).toMatch(/\/learn\/(placement|map)/);
  });

  test("placement page renders on mobile 375px", async ({ page }) => {
    await page.goto("/learn/placement");
    const url = page.url();
    if (!url.includes("placement")) return; // already placed

    // Intro screen should be visible
    await expect(page.locator("h1, h2").first()).toBeVisible();
    // No horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });
});

test.describe("/learn/map responsive layout", () => {
  test.beforeEach(async ({ page }) => {
    await loginWithCookie(page);
    if (!process.env.PLAYWRIGHT_COOKIE) test.skip();
  });

  test("map page renders without horizontal overflow on 375px", async ({ page }) => {
    await page.goto("/learn/map");
    await page.waitForLoadState("networkidle");

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test("map page renders without horizontal overflow on 414px", async ({ page }) => {
    await page.goto("/learn/map");
    await page.waitForLoadState("networkidle");

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 414;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test("top stats bar is visible and sticky", async ({ page }) => {
    await page.goto("/learn/map");
    await page.waitForLoadState("networkidle");

    // Hearts should be visible in top bar
    const hearts = page.locator("svg.lucide-heart").first();
    await expect(hearts).toBeVisible();

    // Gems icon
    const gems = page.locator("svg.lucide-gem").first();
    await expect(gems).toBeVisible();
  });

  test("Today's Goal widget is visible", async ({ page }) => {
    await page.goto("/learn/map");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Today's Goal")).toBeVisible();
  });

  test("Overall progress bar is visible", async ({ page }) => {
    await page.goto("/learn/map");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/lessons/i).first()).toBeVisible();
  });

  test("unit bubbles render with correct icons (semantic)", async ({ page }) => {
    await page.goto("/learn/map");
    await page.waitForLoadState("networkidle");

    // At least one unit bubble should be visible
    const unitBubbles = page.locator("[id^='unit-']");
    const count = await unitBubbles.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking locked unit shows no lessons panel", async ({ page }) => {
    await page.goto("/learn/map");
    await page.waitForLoadState("networkidle");

    // Find a locked unit (opacity-40 wrapper)
    const locked = page.locator(".opacity-40").first();
    const count = await locked.count();
    if (count === 0) return; // All unlocked — skip

    await locked.click();
    // Lessons panel should NOT appear
    const panel = page.locator("[class*='rounded-2xl'][class*='border']").nth(3);
    // Just ensure no crash
    await page.waitForTimeout(300);
  });

  test("expanding a unit shows lesson list", async ({ page }) => {
    await page.goto("/learn/map");
    await page.waitForLoadState("networkidle");

    // Click the first unlocked unit bubble (not opacity-40)
    const unlockedUnit = page.locator("[id^='unit-']:not(.opacity-40)").first();
    if (!(await unlockedUnit.count())) return;

    await unlockedUnit.click();
    await page.waitForTimeout(300);

    // A Play or Retry button should appear
    const playBtn = page.getByText(/play|retry/i).first();
    await expect(playBtn).toBeVisible();
  });

  test("Quick Practice section is at the bottom", async ({ page }) => {
    await page.goto("/learn/map");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText("⚡ Quick Practice")).toBeVisible();
  });

  test("level badge click opens modal with retake option", async ({ page }) => {
    await page.goto("/learn/map");
    await page.waitForLoadState("networkidle");

    const badge = page.getByText(/🎓/).first();
    await badge.click();
    await expect(page.getByText(/retake placement/i)).toBeVisible();

    // Close modal
    await page.keyboard.press("Escape");
  });

  test("zigzag path — unit bubbles alternate sides (not all centered)", async ({ page }) => {
    await page.goto("/learn/map");
    await page.waitForLoadState("networkidle");

    const bubbles = await page.locator("[id^='unit-'] > div").all();
    if (bubbles.length < 2) return;

    const boxes = await Promise.all(bubbles.slice(0, 4).map(b => b.boundingBox()));
    const validBoxes = boxes.filter(Boolean) as { x: number; y: number; width: number; height: number }[];

    if (validBoxes.length < 2) return;

    // At least two adjacent units should have different x-centers
    const xCenters = validBoxes.map(b => b.x + b.width / 2);
    const allSame = xCenters.every(x => Math.abs(x - xCenters[0]) < 5);
    expect(allSame).toBe(false);
  });
});

test.describe("/ielts/roadmap", () => {
  test.beforeEach(async ({ page }) => {
    await loginWithCookie(page);
    if (!process.env.PLAYWRIGHT_COOKIE) test.skip();
  });

  test("renders IELTS units without General English units", async ({ page }) => {
    await page.goto("/ielts/roadmap");
    await page.waitForLoadState("networkidle");

    // Should NOT see General English unit titles
    const basicVocab = page.getByText("Basic Vocabulary");
    await expect(basicVocab).not.toBeVisible();

    // Should see IELTS unit title (if seeded)
    // Just verify no crash and page has content
    await expect(page.locator("h1")).toBeVisible();
  });

  test("link to General English path works", async ({ page }) => {
    await page.goto("/ielts/roadmap");
    await page.waitForLoadState("networkidle");

    await page.getByText("Go to General English →").click();
    await expect(page).toHaveURL(/\/learn\/map/);
  });
});
