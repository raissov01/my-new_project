import { expect, test } from "@playwright/test";

const MOBILE_WIDTHS = [320, 390, 430];
const ROUTES = ["/", "/login", "/signup", "/nuet", "/quizzes"];

test.describe("Mobile layout smoke", () => {
  for (const width of MOBILE_WIDTHS) {
    for (const route of ROUTES) {
      test(`${route} has no build overlay or horizontal overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(250);

        await expect(page.locator("body")).not.toContainText(/Build Error|Parsing CSS source code failed/i);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow, `${route} overflowed horizontally at ${width}px`).toBeLessThanOrEqual(1);
      });
    }
  }
});
