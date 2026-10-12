import { chromium } from "@playwright/test";
import { projects, save, job, pool } from "./db.js";
import { resolvePublic } from "./safe-url.js";
import { storeImage } from "./media.js";
// Fail closed: browser routing checks alone cannot prevent DNS rebinding or all browser traffic.
if (process.env.CAPTURE_EGRESS_ISOLATED !== "true")
  throw Error(
    "Capture requires an isolated public-only egress worker. See README; use admin uploads locally.",
  );
const browser = await chromium.launch({ headless: true });
try {
  for (const p of await projects(true)) {
    if (!p.deployments.length || p.excluded) continue;
    try {
      await resolvePublic(p.deployments[0]);
      for (const mode of ["desktop", "mobile"] as const) {
        const context = await browser.newContext({
          viewport:
            mode === "desktop"
              ? { width: 1440, height: 1000 }
              : { width: 390, height: 844 },
          isMobile: mode === "mobile",
          serviceWorkers: "block",
          acceptDownloads: false,
        });
        try {
          await context.route("**/*", async (route) => {
            try {
              await resolvePublic(route.request().url());
              await route.continue();
            } catch {
              await route.abort();
            }
          });
          const page = await context.newPage();
          const response = await page.goto(p.deployments[0], {
            waitUntil: "domcontentloaded",
            timeout: 20000,
          });
          if (!response || !response.ok())
            throw Error("Capture destination unavailable");
          await page.waitForTimeout(1500);
          const bytes = await page.screenshot({
            fullPage: false,
            timeout: 10000,
          });
          p[mode] = await storeImage(
            bytes,
            `${p.name} ${mode} homepage captured preview`,
            "capture",
          );
          await save(p);
        } finally {
          await context.close();
        }
      }
      await job("capture", "complete", { project: p.id });
    } catch (e) {
      await job("capture", "failed", {
        project: p.id,
        error: e instanceof Error ? e.message : "Capture failed",
        previousPreviewsRetained: true,
      });
    }
  }
} finally {
  await browser.close();
  await pool.end();
}
