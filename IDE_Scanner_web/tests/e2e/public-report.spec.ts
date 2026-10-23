import { expect, test } from "@playwright/test";

const report = "/extensions/GitHub.copilot/versions/1.388.0";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`public security summary is stable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(report);
    await expect(page.getByText("Review needed", { exact: true }).first()).toBeVisible();
    const reportLink = page.getByRole("link", { name: /Open Full Analysis/i });
    await expect(reportLink).toBeVisible();
    await expect(reportLink).toHaveAttribute("href", /\/extensions\/GitHub\.copilot\/versions\/1\.388\.0\/scans\//);
    await expect(page.getByRole("link", { name: /Read README and releases/i })).toHaveAttribute("href", "/extensions/GitHub.copilot");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}
