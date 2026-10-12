import { mkdir, writeFile } from "node:fs/promises";
const repos = [];
async function get(path) {
  const r = await fetch("https://api.github.com" + path, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "SarimIdeaUniverse",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw Error(`GitHub ${r.status}`);
  return r.json();
}
for (let page = 1; page <= 100; page++) {
  const data = await get(
    `/users/SarimSheikh1/repos?per_page=100&page=${page}&sort=updated`,
  );
  repos.push(...data.filter((r) => r.private === false));
  if (data.length < 100) break;
}
const records = [];
for (const r of repos) {
  let readme = "";
  let languages = {};
  let metadataError = "";
  try {
    const content = await get(
      `/repos/SarimSheikh1/${encodeURIComponent(r.name)}/readme`,
    );
    readme = Buffer.from(content.content || "", "base64")
      .toString("utf8")
      .slice(0, 24000);
  } catch (e) {
    metadataError = e.message;
  }
  try {
    languages = await get(
      `/repos/SarimSheikh1/${encodeURIComponent(r.name)}/languages`,
    );
  } catch (e) {
    metadataError = e.message;
  }
  records.push({
    id: r.id,
    name: r.name,
    repository: r.html_url,
    description: r.description,
    homepage: r.homepage,
    topics: r.topics,
    language: r.language,
    languages,
    readme,
    fork: r.fork,
    archived: r.archived,
    updatedAt: r.updated_at,
    metadataError,
  });
}
await mkdir("evidence", { recursive: true });
await writeFile(
  "evidence/github-public.json",
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      source: "GitHub public REST API; paginated",
      records,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    repositories: records.length,
    homepages: records
      .filter((r) => r.homepage)
      .map((r) => ({ name: r.name, url: r.homepage })),
    metadataFailures: records.filter((r) => r.metadataError).length,
  }),
);
