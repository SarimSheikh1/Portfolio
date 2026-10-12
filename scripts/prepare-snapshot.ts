import { readFile, writeFile } from "node:fs/promises";
import { checkURL } from "../server/src/safe-url.js";
import type { Project } from "../shared/types.js";
import { curateProjects, ownerContact } from "../shared/curation.js";
const previous: Project[] = JSON.parse(
  await readFile("evidence/published-projects.json", "utf8"),
).projects;
const evidence = JSON.parse(
  await readFile("evidence/github-public.json", "utf8"),
);
const supplemental = JSON.parse(
  await readFile("evidence/github-readmes.json", "utf8"),
).readmes;
const records: Project[] = [];
for (const r of evidence.records) {
  const prior = previous.find((p) => p.id === `github:${r.id}`);
  const readme = r.readme || supplemental[r.name] || "";
  const technologies = [
    ...new Set([
      ...Object.keys(r.languages || {}),
      ...(r.language ? [r.language] : []),
    ]),
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
    "TypeScript",
    "GSAP",
  ])
    if (new RegExp(`\\b${tool.replace(".", "\\.")}\\b`, "i").test(readme))
      technologies.push(tool);
  let deployments: string[] = [];
  let status = "public repository verified";
  let checkedAt: string | null = null;
  if (r.homepage || prior?.deployments[0]) {
    const check = await checkURL(r.homepage || prior!.deployments[0]);
    status = check.status;
    checkedAt = check.checkedAt;
    if (check.status === "reachable") deployments = [check.url];
  }
  const category = /\btravel\b/i.test(readme)
    ? "Travel"
    : /\b(conference|chat|messaging)\b/i.test(readme)
      ? "Communication"
      : /\b(business|ecommerce|e-commerce|agency)\b/i.test(readme)
        ? "Business"
        : /\b(ai agent|chatbot)\b/i.test(readme)
          ? "AI experiments"
          : "Creative websites";
  const descriptions: Record<string, string> = {
    Roamora:
      "A responsive travel website with destination and service pages. Booking and contact integrations are demonstration-only, according to its README.",
    ROYALVOWS:
      "A public wedding website project. Explore the source for its documented scope and implementation.",
    "KINETIQ-STUDIO":
      "A creative studio website project, available through a verified public repository.",
    "-Nexagen-Solution-website":
      "A business website built in HTML, CSS, and JavaScript. Its README documents demo contact flows and owner-review requirements.",
    "AERION-DRIVE":
      "A public automotive website project. Feature behavior has not been independently tested in this portfolio.",
  };
  records.push({
    id: `github:${r.id}`,
    slug: r.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    name: r.name,
    description:
      descriptions[r.name] ||
      r.description ||
      "A public project repository. Explore its source and available documentation.",
    overview:
      r.description ||
      "This project is included from Sarim’s verified public GitHub collection. The available README describes its scope; documented features are not independently tested behavior.",
    category,
    technologies: [...new Set(technologies)],
    platform: deployments.some((l) => l.includes("vercel.app"))
      ? "Vercel"
      : "GitHub",
    repository: r.repository,
    deployments,
    featured: r.homepage
      ? 10 - records.filter((p) => p.featured > 0).length
      : 0,
    published: true,
    excluded: false,
    fork: r.fork,
    archived: r.archived,
    verified: true,
    status,
    updatedAt: r.updatedAt,
    checkedAt,
    desktop: prior?.desktop || null,
    mobile: prior?.mobile || null,
    features: [],
    readme,
    provenance: {
      description: descriptions[r.name]
        ? "Build review of public repository/README"
        : r.description
          ? "GitHub repository description"
          : "Honest unavailable description",
      technologies:
        "GitHub language metadata / README mention; not behavior tested",
      category: "README keyword classification; owner editable",
      repository: "GitHub public REST API",
      deployments: "GitHub homepage / public HTTP availability check",
    },
    overrides: [],
  });
}
const published = curateProjects(records);
await writeFile(
  "evidence/published-projects.json",
  JSON.stringify(
    {
      capturedAt: evidence.capturedAt,
      projects: published,
      settings: ownerContact,
    },
    null,
    2,
  ),
);
await writeFile(
  "client/public/projects.json",
  JSON.stringify({
    capturedAt: evidence.capturedAt,
    projects: published,
    settings: ownerContact,
  }),
);
console.log(
  JSON.stringify({
    projects: records.length,
    deployments: records
      .filter((p) => p.deployments.length)
      .map((p) => ({ name: p.name, url: p.deployments[0] })),
    uncaptured: records.length,
  }),
);
