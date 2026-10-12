import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
await page.goto("http://127.0.0.1:5173");
await page.waitForTimeout(1600);
console.log(
  await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    overflow: [...document.querySelectorAll("body *")]
      .map((e) => ({
        tag: e.tagName,
        cls: e.className,
        x: e.getBoundingClientRect().x,
        right: e.getBoundingClientRect().right,
      }))
      .filter((e) => e.right > innerWidth + 2 || e.x < -2)
      .slice(0, 20),
  })),
);
await page.setViewportSize({ width: 1440, height: 1000 });
await page.getByRole("button", { name: "Motion on", exact: true }).click();
for (const img of await page.locator(".project-card img").all()) {
  await img.scrollIntoViewIfNeeded();
  await img.evaluate((img) => img.decode());
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({
  path: "docs/qa/studio-desktop-full.png",
  fullPage: true,
});
await page.goto("http://127.0.0.1:5173/contact");
await page.screenshot({ path: "docs/qa/contact-desktop.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "docs/qa/contact-mobile.png", fullPage: true });
await browser.close();
