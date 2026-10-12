import { test } from "node:test";
import assert from "node:assert/strict";
import { allRepositories, mergeProject } from "../server/src/importer.js";
import {
  publicIP,
  webURL,
  resolvePublic,
  safeFetch,
} from "../server/src/safe-url.js";
import { storeImage } from "../server/src/media.js";
import type { Project } from "../shared/types.js";
const fixture: Project = {
  id: "github:1",
  slug: "test-record",
  name: "Test fixture",
  description: "Imported description",
  overview: "",
  category: "Creative websites",
  technologies: ["HTML"],
  platform: "GitHub",
  repository: "https://github.com/SarimSheikh1/test-record",
  deployments: [],
  featured: 0,
  published: false,
  excluded: false,
  fork: false,
  archived: false,
  verified: true,
  status: "repository verified",
  updatedAt: "2026-10-10",
  checkedAt: null,
  desktop: null,
  mobile: null,
  features: [],
  readme: "",
  provenance: { description: "GitHub" },
  overrides: [],
};
test("pagination traverses full pages and excludes private records", async () => {
  const calls: string[] = [];
  const rows = await allRepositories(async (p) => {
    calls.push(p);
    return p.includes("page=1&")
      ? Array.from({ length: 100 }, (_, i) => ({ id: i, private: i === 0 }))
      : [{ id: 101, private: false }];
  });
  assert.equal(calls.length, 2);
  assert.equal(rows.length, 100);
  assert(calls[1].includes("page=2"));
});
test("malformed imports fail without fabricated records", async () => {
  await assert.rejects(
    allRepositories(async () => ({ message: "bad" })),
    /Malformed/,
  );
});
test("provider rate limits propagate", async () => {
  await assert.rejects(
    allRepositories(async () => {
      throw Error("GitHub rate limit");
    }),
    /rate limit/,
  );
});
test("stable import identity preserves owner overrides and publication", () => {
  const old = {
    ...fixture,
    description: "Owner writing",
    category: "Travel",
    featured: 3,
    published: true,
    excluded: true,
    overrides: ["description", "category"],
    deployments: ["https://example.com/"],
  };
  const next = mergeProject(old, {
    ...fixture,
    deployments: ["https://example.com/", "https://example.org/"],
  });
  assert.equal(next.description, "Owner writing");
  assert.equal(next.category, "Travel");
  assert.equal(next.published, true);
  assert.equal(next.featured, 3);
  assert.equal(next.excluded, true);
  assert.equal(next.deployments.length, 2);
  assert.equal(next.provenance.description, "owner");
});
test("private, reserved and IPv4-mapped destinations rejected", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "192.0.2.1",
  ])
    assert.equal(publicIP(ip), false, ip);
  assert.equal(publicIP("8.8.8.8"), true);
});
test("URL parser rejects unsafe schemes, ports, userinfo and names", () => {
  for (const url of [
    "file:///tmp/test",
    "ftp://example.com",
    "http://localhost/",
    "https://internal/",
    "https://a.internal",
    "https://example.com:8443",
    "https://user:pass@example.com/",
  ])
    assert.throws(() => webURL(url), undefined, url);
  assert.equal(
    webURL("https://example.com/#hello").href,
    "https://example.com/",
  );
});
test("upload checks image content instead of trusting extension", async () => {
  await assert.rejects(
    storeImage(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
      "unsafe",
      "owner-upload",
    ),
  );
  await assert.rejects(
    storeImage(Buffer.from("not an image"), "invalid", "owner-upload"),
  );
  await assert.rejects(
    storeImage(Buffer.alloc(12_000_001), "oversized", "owner-upload"),
    /12MB/,
  );
});
test("private numeric destinations are blocked before opening a connection", async () => {
  await assert.rejects(resolvePublic("http://127.0.0.1/"), /reserved/);
  await assert.rejects(
    safeFetch("http://169.254.169.254/latest/meta-data/"),
    /reserved/,
  );
});
