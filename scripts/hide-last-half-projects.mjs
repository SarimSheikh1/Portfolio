import fs from 'node:fs';

const source = 'client/src/world-projects.json';
const records = JSON.parse(fs.readFileSync(source, 'utf8'));
const remaining = Math.ceil(records.length / 2);
const removed = records.slice(remaining).map(project => project.name);
const excludedFile = 'evidence/world-project-exclusions.json';
const excluded = new Set([...JSON.parse(fs.readFileSync(excludedFile, 'utf8')), ...removed]);
fs.writeFileSync(excludedFile, JSON.stringify([...excluded], null, 2) + '\n');
fs.writeFileSync('evidence/world-hidden-last-half.json', JSON.stringify({previousCount: records.length, remainingCount: remaining, removed}, null, 2) + '\n');
for (const file of [source, 'delivery/world-agentic-v2/data/projects.json', 'delivery/portfolio-push/src/world-projects.json']) {
  const projects = JSON.parse(fs.readFileSync(file, 'utf8')).filter(project => !excluded.has(project.name));
  if (projects.length !== remaining) throw new Error(`Unexpected project count in ${file}`);
  fs.writeFileSync(file, JSON.stringify(projects, null, 2) + '\n');
}
const accountFile = 'delivery/world-agentic-v2/components/Accounts.tsx';
fs.writeFileSync(accountFile, fs.readFileSync(accountFile, 'utf8').replace(/\d+ public-source projects/g, `${remaining} public-source projects`).replace(/THE COLLECTION \/ \d+/g, `THE COLLECTION / ${remaining}`));
const adminFile = 'delivery/world-agentic-v2/components/Admin.tsx';
fs.writeFileSync(adminFile, fs.readFileSync(adminFile, 'utf8').replace('<strong>63</strong>', `<strong>${remaining}</strong>`));
console.log(JSON.stringify({hidden: removed.length, remaining}));
