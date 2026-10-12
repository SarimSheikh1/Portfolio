import { readFile } from "node:fs/promises";
import { pool, projects, save } from "../server/src/db.js";
import { mergeProject } from "../server/src/importer.js";
try {
  const snapshot = JSON.parse(
    await readFile("evidence/published-projects.json", "utf8"),
  );
  const existing = await projects(true);
  const selectedIds = new Set(snapshot.projects.map((p: any) => p.id));
  for (const old of existing)
    if (!selectedIds.has(old.id))
      await save({ ...old, published: false, excluded: true });
  for (const p of snapshot.projects)
    await save({
      ...mergeProject(
        existing.find((x) => x.id === p.id),
        p,
      ),
      published: true,
      excluded: false,
    });
  console.log(
    `${snapshot.projects.length} verified public repository records seeded. Existing owner edits preserved.`,
  );
} finally {
  await pool.end();
}
