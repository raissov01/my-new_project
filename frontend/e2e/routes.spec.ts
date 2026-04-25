/**
 * routes.spec.ts — Acceptance Criteria: No 404s from internal links.
 *
 * Covers 20+ routes across public, auth-redirect, and legacy-redirect categories.
 *
 * Pre-requisites:
 *   1. `npx playwright install`
 *   2. Dev server running: `npm run dev`
 *   3. Optionally set PLAYWRIGHT_COOKIE (valid session token) to test
 *      authenticated pages; without it, auth-required routes are verified to
 *      redirect to /login rather than serving a 404.
 *
 * Run: npx playwright test e2e/routes.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function loginWithCookie(page: Page) {
  const cookie = process.env.PLAYWRIGHT_COOKIE;
  if (!cookie) return;
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

/** Asserts the page does NOT show a 404 title. */
async function assert200(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  const title = await page.title();
  expect(title, `${path} returned 404`).not.toMatch(/404|not found/i);
}

// ── 1. Public routes — no auth required ──────────────────────────────────────

test.describe("Public routes — no auth needed", () => {
  const PUBLIC_ROUTES = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/guide",
    "/ielts/demo",
  ];

  for (const route of PUBLIC_ROUTES) {
    test(`GET ${route} → not 404`, async ({ page }) => {
      await assert200(page, route);
    });
  }
});

// ── 2. Legacy redirect routes — must not 404 ─────────────────────────────────

test.describe("Legacy redirect routes", () => {
  test("/ai-chat redirects to /chat (not 404)", async ({ page }) => {
    await page.goto("/ai-chat", { waitUntil: "domcontentloaded" });
    const title = await page.title();
    expect(title).not.toMatch(/404|not found/i);
    expect(page.url()).toMatch(/\/chat|\/login/);
  });

  test("/ielts/quiz redirects to /quizzes (not 404)", async ({ page }) => {
    await page.goto("/ielts/quiz", { waitUntil: "domcontentloaded" });
    const title = await page.title();
    expect(title).not.toMatch(/404|not found/i);
    expect(page.url()).toMatch(/\/quizzes|\/login/);
  });

  test("/ielts/quizzes redirects to /quizzes (not 404)", async ({ page }) => {
    await page.goto("/ielts/quizzes", { waitUntil: "domcontentloaded" });
    const title = await page.title();
    expect(title).not.toMatch(/404|not found/i);
    expect(page.url()).toMatch(/\/quizzes|\/login/);
  });

  test("/home redirects to / (not 404)", async ({ page }) => {
    await page.goto("/home", { waitUntil: "domcontentloaded" });
    const title = await page.title();
    expect(title).not.toMatch(/404|not found/i);
  });

  test("/learn redirects to /learn/map or /learn/placement (not 404)", async ({ page }) => {
    await page.goto("/learn", { waitUntil: "domcontentloaded" });
    const url = page.url();
    expect(url).toMatch(/\/learn\/(map|placement)|\/login/);
  });
});

// ── 3. Auth-required routes — redirect to /login (not 404) ───────────────────

test.describe("Auth-required routes → /login (not 404)", () => {
  const AUTH_ROUTES = [
    "/dashboard",
    "/student/dashboard",
    "/teacher/dashboard",
    "/flashcards",
    "/chat",
    "/quizzes",
    "/listen",
    "/tutor",
    "/daily-news",
    "/mining",
    "/leaderboard",
    "/sets",
    "/sets/new",
    "/profile",
    "/settings",
    "/achievements",
    "/learn/map",
    "/ielts",
    "/ielts/simulator",
    "/ielts/materials",
    "/ielts/study-plan",
    "/student/classes",
    "/teacher/classes",
    "/friends",
    "/streak",
  ];

  for (const route of AUTH_ROUTES) {
    test(`GET ${route} → not 404 (redirects to login)`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const title = await page.title();
      expect(title, `${route} returned 404`).not.toMatch(/404|not found/i);
      // Must redirect to /login, not crash with 404
      expect(page.url()).toMatch(/\/login/);
    });
  }
});

// ── 4. Authenticated routes — visible pages (requires PLAYWRIGHT_COOKIE) ──────

test.describe("Authenticated routes — full render", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.PLAYWRIGHT_COOKIE) test.skip();
    await loginWithCookie(page);
  });

  const AUTHENTICATED_ROUTES = [
    "/student/dashboard",
    "/flashcards",
    "/chat",
    "/quizzes",
    "/listen",
    "/tutor",
    "/daily-news",
    "/mining",
    "/leaderboard",
    "/sets",
    "/profile",
    "/settings",
    "/achievements",
    "/ielts",
    "/ielts/materials",
    "/ielts/simulator",
    "/ielts/study-plan",
    "/student/classes",
    "/guide",
  ];

  for (const route of AUTHENTICATED_ROUTES) {
    test(`GET ${route} → renders page (not 404)`, async ({ page }) => {
      await assert200(page, route);
    });
  }
});

// ── 5. Navbar link smoke test ─────────────────────────────────────────────────

test.describe("Navbar links — none are 404", () => {
  /** hrefs used in navbar.tsx for authenticated users */
  const NAV_HREFS = [
    "/learn/map",
    "/listen",
    "/tutor",
    "/flashcards",
    "/quizzes",
    "/chat",
    "/daily-news",
    "/mining",
    "/ielts",
    "/guide",
    "/sets/new",
  ];

  for (const href of NAV_HREFS) {
    test(`navbar link ${href} → not 404`, async ({ page }) => {
      await page.goto(href, { waitUntil: "domcontentloaded" });
      const title = await page.title();
      expect(title, `Navbar link ${href} returned 404`).not.toMatch(/404|not found/i);
    });
  }
});
