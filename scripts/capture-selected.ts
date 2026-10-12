/** One-off public preview capture through a DNS-pinned public-only proxy.
 * No imported scripts are executed for repository-only HTML previews.
 * The general hosted capture worker still requires external network isolation.
 */
import http from "node:http";
import net from "node:net";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { resolvePublic, safeFetch } from "../server/src/safe-url.js";
import { curateProjects, ownerContact } from "../shared/curation.js";
import type { Preview, Project } from "../shared/types.js";
const snapshot = JSON.parse(
  await readFile("evidence/published-projects.json", "utf8"),
);
const selected = curateProjects(snapshot.projects);
const metadata = JSON.parse(
  await readFile("evidence/github-public.json", "utf8"),
).records;
const sockets = new Set<net.Socket>();
const proxy = http.createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method || ""))
      throw Error("Read-only capture");
    const result = await safeFetch(req.url || "", 8_000_000);
    res.writeHead(result.status, {
      "content-type":
        result.headers["content-type"] || "application/octet-stream",
    });
    res.end(result.body);
  } catch {
    res.writeHead(403);
    res.end("Capture proxy rejected destination");
  }
});
proxy.on("connect", async (req, client, head) => {
  const socket = client as net.Socket;
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  try {
    const destination = new URL(`https://${req.url}`);
    if (destination.port && destination.port !== "443")
      throw Error("HTTPS only");
    const { address } = await resolvePublic(destination.href);
    const upstream = net.connect({
      host: address.address,
      port: 443,
      family: address.family,
    });
    sockets.add(upstream);
    upstream.on("close", () => sockets.delete(upstream));
    let bytes = 0;
    upstream.on("data", (b) => {
      bytes += b.length;
      if (bytes > 40_000_000) {
        upstream.destroy();
        socket.destroy();
      }
    });
    upstream.setTimeout(25000, () => {
      upstream.destroy();
      socket.destroy();
    });
    upstream.on("connect", () => {
      socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
  } catch {
    socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
  }
});
await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
const port = (proxy.address() as net.AddressInfo).port;
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  proxy: { server: `http://127.0.0.1:${port}`, bypass: "<-loopback>" },
  args: [
    "--disable-quic",
    "--disable-background-networking",
    "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
    "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
  ],
});
const history: any[] = JSON.parse(
  await readFile("evidence/preview-captures.json", "utf8"),
);
const sourcePaths: Record<string, string> = {
  "todo-app": "public/index.html",
  "Mardara-Expense-Tracker": "public/index.html",
};
await mkdir("client/public/previews", { recursive: true });
async function capture(project: Project, url: string, repository: boolean) {
  for (const mode of ["desktop", "mobile"] as const) {
    const context = await browser.newContext({
      viewport:
        mode === "desktop"
          ? { width: 1440, height: 1000 }
          : { width: 390, height: 844 },
      isMobile: mode === "mobile",
      deviceScaleFactor: 1,
      javaScriptEnabled: !repository,
      serviceWorkers: "block",
      acceptDownloads: false,
      reducedMotion: "reduce",
    });
    try {
      await context.route("**/*", async (route) => {
        try {
          let u = route.request().url();
          if (
            repository &&
            new URL(u).origin === new URL(url).origin &&
            !new URL(u).pathname.startsWith("/SarimSheikh1/")
          )
            u = new URL(new URL(u).pathname.slice(1), url).href;
          if (!["GET", "HEAD"].includes(route.request().method()))
            throw Error("Read-only");
          await resolvePublic(u);
          if (repository) {
            if (route.request().resourceType() === "script") {
              await route.abort();
              return;
            }
            const response = await safeFetch(u, 8_000_000);
            const type = u.endsWith(".css")
              ? "text/css"
              : u === url
                ? "text/html"
                : response.headers["content-type"] ||
                  "application/octet-stream";
            await route.fulfill({
              status: response.status,
              contentType: String(type),
              body: response.body,
            });
            return;
          }
          await route.continue();
        } catch {
          await route.abort();
        }
      });
      const page = await context.newPage();
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 25000,
      });
      if (!response?.ok())
        throw Error(
          `Homepage unavailable (${response?.status() || "network"})`,
        );
      await page.waitForTimeout(repository ? 1200 : 2800);
      const text = await page.locator("body").innerText({ timeout: 4000 });
      if (
        text.trim().length < 20 ||
        /vercel authentication|log in to vercel|deployment not found/i.test(
          text,
        )
      )
        throw Error("No eligible public interface");
      const png = await page.screenshot({
        fullPage: false,
        animations: "disabled",
        timeout: 10000,
      });
      const id = `${project.slug}-${mode}`;
      const full = await sharp(png)
        .webp({ quality: 86 })
        .toBuffer({ resolveWithObject: true });
      const thumb = await sharp(png)
        .resize({ width: 640, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      await writeFile(`client/public/previews/${id}.webp`, full.data);
      await writeFile(`client/public/previews/${id}-640.webp`, thumb);
      project[mode] = {
        url: `/previews/${id}.webp`,
        thumbnail: `/previews/${id}-640.webp`,
        alt: `${project.name} genuine ${mode} ${repository ? "repository HTML interface (scripts disabled)" : "public homepage"} screenshot`,
        capturedAt: new Date().toISOString(),
        width: full.info.width,
        height: full.info.height,
        source: repository ? "repository-capture" : "capture",
        sourceURL: url,
      } as Preview;
    } finally {
      await context.close();
    }
  }
}
try {
  for (const project of selected) {
    if (
      project.desktop?.source === "capture" &&
      project.mobile?.source === "capture" &&
      project.status === "reachable"
    )
      continue;
    const supplied = metadata.find(
      (r: any) => r.name === project.name,
    )?.homepage;
    let captured = false;
    const live = project.deployments[0] || supplied;
    if (live)
      try {
        await capture(project, live, false);
        project.deployments = [...new Set([...project.deployments, live])];
        project.status = "reachable";
        project.checkedAt = new Date().toISOString();
        captured = true;
        history.push({
          project: project.name,
          source: "public deployment",
          result: "captured",
          url: live,
        });
      } catch (e) {
        project.deployments = [];
        project.status = "Live demo unavailable";
        history.push({
          project: project.name,
          source: "public deployment",
          result: "failed",
          error: (e as Error).message,
        });
      }
    if (!captured && !project.deployments.length) {
      try {
        const source = `https://raw.githubusercontent.com/SarimSheikh1/${encodeURIComponent(project.name)}/main/${sourcePaths[project.name] || "index.html"}`;
        await capture(project, source, true);
        history.push({
          project: project.name,
          source: "public repository HTML; scripts disabled",
          result: "captured",
          url: source,
        });
      } catch (e) {
        history.push({
          project: project.name,
          source: "public repository HTML",
          result: "failed",
          error: (e as Error).message,
        });
      }
    }
    console.log(
      `${project.name}: desktop=${!!project.desktop}, mobile=${!!project.mobile}`,
    );
    await writeFile(
      "evidence/published-projects.json",
      JSON.stringify(
        { ...snapshot, projects: selected, settings: ownerContact },
        null,
        2,
      ),
    );
    await writeFile(
      "client/public/projects.json",
      JSON.stringify({
        ...snapshot,
        projects: selected,
        settings: ownerContact,
      }),
    );
    await writeFile(
      "evidence/preview-captures.json",
      JSON.stringify(history, null, 2),
    );
  }
} finally {
  await browser.close();
  for (const socket of sockets) socket.destroy();
  await new Promise<void>((resolve) => proxy.close(() => resolve()));
}
