import { test, expect } from "@playwright/test";
test("live collection has real previews and usable external links, with no galaxy", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".project-card")).toHaveCount(11);
  expect(
    (await page.locator(".project-card .project-title").allTextContents()).map(
      (s) => s.trim(),
    ),
  ).toEqual([
    "Mardara-Expense-Tracker",
    "SNIPER-SHADOW",
    "TARGET-RUSH",
    "Mardara_Travel_Agent",
    "Mardara-gym-",
    "Mardara_Speed",
    "KINETIQ-STUDIO",
    "AERION-DRIVE",
    "todo-app",
    "ROYALVOWS",
    "-Nexagen-Solution-website",
  ]);
  await expect(page.locator(".project-card .demo-status")).toHaveCount(2);
  await expect(
    page.locator('.project-card a[aria-label$="live project"]'),
  ).toHaveCount(9);
  await expect(page.locator("canvas,.galaxy")).toHaveCount(0);
  for (const card of await page.locator(".project-card").all()) {
    await card.scrollIntoViewIfNeeded();
    const link = card.getByRole("link", {
      name: /Open .* live project|View .* source on GitHub/,
    });
    await expect(link).toHaveAttribute("href", /^https:\/\//);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(card.locator(".screenshot img")).toHaveJSProperty(
      "complete",
      true,
    );
    expect(
      await card
        .locator(".screenshot img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0);
  }
  await expect(
    page.getByRole("button", { name: "galaxy", exact: true }),
  ).toHaveCount(0);
});
test("contact page supplies the owner email and phone on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/contact");
  await expect(
    page.getByRole("heading", { name: /Your next idea/ }),
  ).toBeVisible();
  await expect(
    page.locator('.contact-direct a[href="mailto:sarimhatif1@gmail.com"]'),
  ).toBeVisible();
  await expect(
    page.locator('.contact-direct a[href="tel:+923228668488"]'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "docs/qa/contact-320.png", fullPage: true });
});
