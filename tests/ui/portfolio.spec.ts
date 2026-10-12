import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }, info) => {
  if (!info.title.startsWith("portal dismissal"))
    await page.addInitScript(() => {
      localStorage.setItem("portal-dismissed", "yes");
      localStorage.setItem("motion", "off");
    });
  else await page.addInitScript(() => localStorage.setItem("motion", "off"));
});
for (const width of [320, 360, 390, 430, 768, 1024, 1440])
  test(`responsive page, controls and no overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Small ideas/ }),
    ).toBeVisible();
    if ([320, 390, 1440].includes(width))
      await page.screenshot({ path: "docs/qa/home-" + width + ".png" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByLabel("Open command palette").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page
      .getByRole("button", { name: "AI COLLABORATION", exact: false })
      .click();
    await expect(
      page.getByText("I use AI to brainstorm approaches", { exact: false }),
    ).toBeVisible();
    await page.goto("/admin");
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
test("portal dismissal, keyboard command, motion and honest storage failure", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("Your name").fill("Testing visitor");
  await page.getByLabel("Email address").fill("test@example.com");
  await page
    .getByLabel("The idea")
    .fill("A test inquiry to verify honest storage behavior.");
  await page.getByRole("button", { name: "Send an idea" }).click();
  await expect(page.getByRole("status")).toContainText("not configured");
});
test("API rejects unauthorized owner access and invalid form data", async ({
  request,
}) => {
  expect(
    (await request.get("http://127.0.0.1:3001/api/v1/admin/projects")).status(),
  ).toBe(401);
  expect(
    (
      await request.post("http://127.0.0.1:3001/api/v1/contact", {
        data: { name: "a", email: "bad", message: "x" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("http://127.0.0.1:3001/api/v1/login", {
        data: { username: "owner", password: "bad" },
      })
    ).status(),
  ).toBe(403);
});
test("gallery and list preserve shared search and direct project routes", async ({
  page,
}) => {
  await page.route("**/api/v1/public", async (route) => {
    const projects = Array.from({ length: 3 }, (_, i) => ({
      id: "ui-fixture-" + i,
      slug: "ui-fixture-" + i,
      name: `Test-only project ${i}`,
      description: "UI test fixture; never shipped as owner work",
      overview: "UI fixture",
      category: i === 0 ? "Travel" : "Business",
      technologies: ["HTML"],
      platform: "GitHub",
      repository:
        "https://github.com/SarimSheikh1/" +
        ["ROYALVOWS", "AERION-DRIVE", "KINETIQ-STUDIO"][i],
      deployments: ["https://example.com/"],
      featured: i,
      published: true,
      excluded: false,
      fork: false,
      archived: false,
      verified: true,
      status: "reachable",
      updatedAt: "2026-10-10",
      checkedAt: null,
      desktop: null,
      mobile: null,
      features: [],
      readme: "<script>unsafe()</script>",
      provenance: {},
      overrides: [],
    }));
    await route.fulfill({
      json: {
        apiVersion: 1,
        projects,
        settings: { github: "https://github.com/SarimSheikh1" },
        sourceStatus: "UI fixtures only",
      },
    });
  });
  await page.goto("/");
  await page.getByLabel("Search projects").fill("project 0");
  await page.getByRole("button", { name: "list", exact: true }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.getByRole("button", { name: "gallery", exact: true }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Explore project" }).click();
  await expect(
    page.getByRole("heading", { name: "Test-only project 0." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "mobile", exact: true }).click();
  await expect(page.getByText("No screenshot supplied")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Test-only project 0." }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Search projects")).toHaveValue("project 0");
  await expect(page.locator(".project-card")).toHaveCount(1);
  await expect(page.locator(".project-title")).toBeFocused();
});
