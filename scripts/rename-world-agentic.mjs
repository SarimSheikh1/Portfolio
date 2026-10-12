import fs from 'node:fs';
for(const file of ['client/src/world.tsx','client/src/PublicProjects.tsx','client/index.html','scripts/check-world.mjs','scripts/check-world-projects.mjs','delivery/portfolio-github/README.md','delivery/portfolio-github/AGENTS.md','delivery/world-agency-site/README.md']){if(!fs.existsSync(file))continue;let s=fs.readFileSync(file,'utf8');s=s.replaceAll('World Agency','World Agentic').replaceAll('world agency','world agentic').replaceAll('WORLD AGENCY','WORLD AGENTIC');fs.writeFileSync(file,s)}
console.log('Corrected visible brand to World Agentic.');
