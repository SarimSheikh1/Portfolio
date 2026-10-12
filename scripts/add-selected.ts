import { readFile, writeFile, copyFile } from "node:fs/promises";
import { selectedProjects, ownerContact } from "../shared/curation.js";
import type { Project } from "../shared/types.js";
const current = JSON.parse(
  await readFile("evidence/published-projects.json", "utf8"),
);
const archived = JSON.parse(
  await readFile("evidence/selected-project-candidates.json", "utf8"),
).projects;
const evidence = JSON.parse(
  await readFile("evidence/github-public.json", "utf8"),
).records;
const links = JSON.parse(
  await readFile("evidence/selected-live-metadata.json", "utf8"),
);
const projects: Project[] = selectedProjects.map((name) => {
  let p =
    current.projects.find((p: Project) => p.name === name) ||
    archived.find((p: Project) => p.name === name);
  if (!p) {
    const r = evidence.find((r: any) => r.name === name);
    if (!r) throw Error("Missing verified repository " + name);
    p = {
      id: `github:${r.id}`,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      name,
      description: "A public project from Sarim’s GitHub collection.",
      overview:
        "Explore the project’s public source and available live experience.",
      category: name === "SNIPER-SHADOW" ? "Games" : "Utilities",
      technologies: r.language ? [r.language] : [],
      platform: "GitHub",
      repository: r.repository,
      deployments: [],
      featured: 0,
      published: true,
      excluded: false,
      fork: r.fork,
      archived: r.archived,
      verified: true,
      status: "public repository verified",
      updatedAt: r.updatedAt,
      checkedAt: null,
      desktop: null,
      mobile: null,
      features: [],
      readme: r.readme || "",
      provenance: { repository: "Verified public GitHub REST metadata" },
      overrides: [],
    };
  }
  if (links[name]?.homepage) {
    p.deployments = [links[name].homepage];
    p.status = "pending availability check";
  }
  return { ...p, published: true, excluded: false };
});
for (const p of projects)
  for (const mode of ["desktop", "mobile"] as const) {
    const preview = p[mode];
    if (preview?.source === "repository-capture") {
      for (const url of [preview.url, preview.thumbnail]) {
        const file = url.split("/").pop()!;
        await copyFile(
          "evidence/repository-previews/" + file,
          "client/public/previews/" + file,
        );
      }
    }
  }
for (const file of [
  "evidence/published-projects.json",
  "client/public/projects.json",
])
  await writeFile(
    file,
    JSON.stringify({ ...current, projects, settings: ownerContact }, null, 2),
  );
console.log("Prepared " + projects.length + " selected projects");
