import fs from 'node:fs';
const names=new Set(JSON.parse(fs.readFileSync('evidence/world-project-exclusions.json','utf8')));
for(const file of ['client/src/world-projects.json','delivery/world-agentic-v2/data/projects.json']){const rows=JSON.parse(fs.readFileSync(file,'utf8'));const next=rows.filter(p=>!names.has(p.name));fs.writeFileSync(file,JSON.stringify(next,null,2)+'\n');console.log(file,next.length,'projects');}
const file='delivery/world-agentic-v2/components/Accounts.tsx';let s=fs.readFileSync(file,'utf8').replaceAll('70 public-source projects','63 public-source projects').replaceAll('THE COLLECTION / 70','THE COLLECTION / 63');fs.writeFileSync(file,s);
