import { test, expect } from "@playwright/test";
test("preview tabs, lightbox Escape/focus restoration, and blocked frame fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("portal-dismissed", "yes");
    localStorage.setItem("motion", "off");
  });
  const preview = {
    url: "/qa-test-only.svg",
    thumbnail: "/qa-test-only.svg",
    alt: "TEST FIXTURE ONLY: preview control verification",
    capturedAt: "2026-10-10T00:00:00Z",
    width: 1440,
    height: 1000,
    source: "capture",
  };
  await page.route("**/qa-test-only.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1000"><rect width="1440" height="1000" fill="#131719"/><text x="100" y="200" fill="white" font-size="40">TEST FIXTURE ONLY</text></svg>',
    }),
  );
  await page.route("**/api/v1/public", (route) =>
    route.fulfill({
      json: {
        apiVersion: 1,
        projects: [
          {
            id: "qa",
            slug: "qa",
            name: "QA fixture",
            description: "Test-only record",
            overview: "",
            category: "Test",
            technologies: [],
            platform: "Test",
            repository: "https://github.com/SarimSheikh1/ROYALVOWS",
            deployments: ["https://example.com/"],
            published: true,
            excluded: false,
            verified: true,
            featured: 0,
            fork: false,
            archived: false,
            status: "reachable",
            updatedAt: "2026-10-10",
            checkedAt: null,
            desktop: preview,
            mobile: { ...preview, width: 390, height: 844 },
            readme: "",
            features: [],
            provenance: {},
            overrides: [],
          },
        ],
        settings: { github: "https://github.com/SarimSheikh1" },
        sourceStatus: "Test fixtures",
      },
    }),
  );
  await page.route("https://example.com/**", (route) =>
    route.fulfill({
      status: 403,
      headers: { "x-frame-options": "DENY" },
      body: "Test-only blocked embed",
    }),
  );
  await page.goto("/projects/qa");
  await expect(page.getByRole("img", { name: preview.alt })).toHaveAttribute(
    "alt",
    preview.alt,
  );
  const enlarge = page.getByRole("button", {
    name: "Enlarge QA fixture desktop preview",
  });
  await enlarge.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(enlarge).toBeFocused();
  await page.getByRole("button", { name: "mobile", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Enlarge QA fixture mobile preview" }),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "Request live preview" }).click();
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect(
    page.getByText("Embedding is best effort.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open Live Site", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close live frame" }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
});
test("landscape and unavailable WebGL keep the HTML interface usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    localStorage.setItem("portal-dismissed", "yes");
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: any,
      ...args: any[]
    ) {
      if (type === "webgl" || type === "webgl2") return null;
      return original.call(this, type, ...args);
    } as any;
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Small ideas/ }),
  ).toBeVisible();
  await expect(page.locator("canvas, .galaxy, .metal-fallback")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Open command palette").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Open command palette")).toBeFocused();
});
test("static Vercel fallback loads genuine records when API is absent", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("portal-dismissed", "yes");
    localStorage.setItem("motion", "off");
  });
  await page.route("**/api/v1/public", (route) =>
    route.fulfill({ status: 404, contentType: "text/html", body: "Not found" }),
  );
  await page.goto("/");
  await expect(page.locator(".project-card")).toHaveCount(11);
  await page.getByLabel("Search projects").fill("ROYALVOWS");
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Explore project" }).click();
  await expect(page.getByRole("heading", { name: "ROYALVOWS." })).toBeVisible();
});
