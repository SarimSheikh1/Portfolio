import type { Project } from "../../shared/types.js";
import { projects, save, job } from "./db.js";
import { checkURL, webURL } from "./safe-url.js";
export async function githubJSON(path: string) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw Error(
      response.status === 403 || response.status === 429
        ? "GitHub rate limit or access restriction. Retry after the provider reset."
        : `GitHub request failed (${response.status})`,
    );
  return response.json();
}
export async function allRepositories(fetcher = githubJSON) {
  const rows: any[] = [];
  for (let page = 1; page <= 100; page++) {
    const data = await fetcher(
      `/users/SarimSheikh1/repos?per_page=100&page=${page}&sort=updated&type=owner`,
    );
    if (!Array.isArray(data))
      throw Error("Malformed GitHub repository response");
    rows.push(...data.filter((r) => r.private === false));
    if (data.length < 100) return rows;
  }
  throw Error("Pagination safety limit reached");
}
export function mergeProject(old: Project | undefined, next: Project) {
  if (!old) return next;
  const merged = {
    ...next,
    providerIdentities: old.providerIdentities,
    desktop: old.desktop,
    mobile: old.mobile,
    published: old.published,
    excluded: old.excluded,
    featured: old.featured,
    overrides: old.overrides,
  };
  for (const field of old.overrides)
    (merged as any)[field] = (old as any)[field];
  merged.deployments = [...new Set([...old.deployments, ...next.deployments])];
  merged.provenance = {
    ...next.provenance,
    ...Object.fromEntries(old.overrides.map((k) => [k, "owner"])),
  };
  return merged;
}
export async function previewGithub() {
  const existing = await projects(true);
  const repositories = await allRepositories();
  const result: Project[] = [];
  for (const repo of repositories) {
    let old = existing.find(
      (p) => p.id === `github:${repo.id}` || p.repository === repo.html_url,
    );
    let languages: Record<string, number> = {};
    let readme = "";
    try {
      languages = await githubJSON(
        `/repos/SarimSheikh1/${encodeURIComponent(repo.name)}/languages`,
      );
      const r = await githubJSON(
        `/repos/SarimSheikh1/${encodeURIComponent(repo.name)}/readme`,
      );
      readme = Buffer.from(r.content || "", "base64")
        .toString("utf8")
        .slice(0, 24000);
    } catch {
      /* metadata remains honest when an optional endpoint fails */
    }
    let links: string[] = [];
    let checkedAt: string | null = null;
    let status = "repository verified";
    if (repo.homepage) {
      try {
        webURL(repo.homepage);
        const check = await checkURL(repo.homepage);
        checkedAt = check.checkedAt;
        status = check.status;
        if (check.status === "reachable") links = [check.url];
      } catch {
        status = "homepage rejected";
      }
    }
    old ||= existing.find((p) =>
      links.some((url) => p.deployments.includes(url)),
    );
    const technologies = [
      ...Object.keys(languages),
      ...(repo.language ? [repo.language] : []),
    ];
    for (const tool of [
      "React",
      "Vite",
      "Next.js",
      "Express",
      "Tailwind",
      "PostgreSQL",
      "Python",
      "Node.js",
    ])
      if (new RegExp(`\\b${tool.replace(".", "\\.")}\\b`, "i").test(readme))
        technologies.push(tool);
    const p: Project = {
      id: old?.id || `github:${repo.id}`,
      slug: repo.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      name: repo.name,
      description:
        repo.description ||
        "Public repository. A project overview has not been supplied.",
      overview:
        repo.description ||
        "Explore the repository for the available source and documentation.",
      category: "Creative websites",
      technologies: [...new Set(technologies)],
      platform: links.some((l) => l.includes("vercel.app"))
        ? "Vercel"
        : links.some((l) => l.includes("netlify.app"))
          ? "Netlify"
          : "GitHub",
      repository: repo.html_url,
      deployments: links,
      featured: 0,
      published: false,
      excluded: false,
      fork: !!repo.fork,
      archived: !!repo.archived,
      verified: true,
      status,
      updatedAt: repo.updated_at,
      checkedAt,
      desktop: null,
      mobile: null,
      features: [],
      readme,
      provenance: {
        description: "GitHub description",
        technologies: "GitHub languages / README mention; not behavior tested",
        repository: "GitHub public API",
        deployments: "GitHub homepage; public HTTP check",
      },
      overrides: [],
    };
    result.push(mergeProject(old, p));
  }
  return result;
}
export async function importGithub() {
  try {
    const rows = await previewGithub();
    for (const p of rows) await save(p);
    await job("github", "complete", { count: rows.length });
    return rows;
  } catch (e) {
    await job("github", "failed", {
      error: e instanceof Error ? e.message : "Import failed",
    });
    throw e;
  }
}
export async function providerCandidates(provider: "vercel" | "netlify") {
  const token =
    provider === "vercel"
      ? process.env.VERCEL_TOKEN
      : process.env.NETLIFY_TOKEN;
  if (!token)
    throw Error(
      `${provider} is disconnected. Configure its server-side token.`,
    );
  let url =
    provider === "vercel"
      ? `https://api.vercel.com/v9/projects?limit=100${process.env.VERCEL_TEAM_ID ? "&teamId=" + encodeURIComponent(process.env.VERCEL_TEAM_ID) : ""}`
      : `https://api.netlify.com/api/v1/${process.env.NETLIFY_ACCOUNT_SLUG ? "accounts/" + encodeURIComponent(process.env.NETLIFY_ACCOUNT_SLUG) + "/" : ""}sites?per_page=100&page=1`;
  const candidates: any[] = [];
  for (let page = 1; page <= 50; page++) {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw Error(`${provider} request failed (${r.status})`);
    const data = await r.json();
    const rows = provider === "vercel" ? data.projects : data;
    if (!Array.isArray(rows)) throw Error("Malformed provider response");
    for (const p of rows) {
      if (provider === "netlify") {
        if (
          p.published_deploy?.context === "production" &&
          !p.password &&
          !p.basic_auth
        )
          candidates.push({
            provider,
            id: p.id,
            name: p.name,
            url: p.ssl_url || p.url,
            reviewRequired: true,
          });
      } else {
        const d = p.latestDeployments?.find(
          (d: any) => d.target === "production" && d.readyState === "READY",
        );
        if (d && !p.passwordProtection && !p.ssoProtection)
          candidates.push({
            provider,
            id: p.id,
            name: p.name,
            url: `https://${d.url}`,
            reviewRequired: true,
          });
      }
    }
    if (provider === "vercel") {
      if (!data.pagination?.next) break;
      url = `https://api.vercel.com/v9/projects?limit=100&until=${data.pagination.next}${process.env.VERCEL_TEAM_ID ? "&teamId=" + encodeURIComponent(process.env.VERCEL_TEAM_ID) : ""}`;
    } else {
      if (rows.length < 100) break;
      url = url.replace(/page=\d+/, `page=${page + 1}`);
    }
  }
  return candidates;
}
