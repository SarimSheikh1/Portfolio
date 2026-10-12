import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const target=path.resolve('delivery/portfolio-push');
const local=fs.readFileSync('delivery/world-agentic-v2/.env.local','utf8').match(/OWNER_SETUP_KEY=(.+)/)[1].trim();
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:target}).toString().split('\0').filter(Boolean);
for(const file of files){if(!fs.existsSync(path.join(target,file)))continue;if(/(^|\/)(\.env\.local|\.dev\.vars|\.wrangler|node_modules|dist|outputs)(\/|$)/.test(file))throw Error('Runtime data in source');if(fs.readFileSync(path.join(target,file)).includes(Buffer.from(local)))throw Error('Local secret in source');}
for(const file of ['components/Portfolio.tsx','components/Accounts.tsx','components/Admin.tsx','lib/account-core.ts','data/projects.json','app/globals.css'])if(!fs.readFileSync(path.join(target,file)).equals(fs.readFileSync(path.resolve('delivery/world-agentic-v2',file))))throw Error(`Source mismatch: ${file}`);
const projects=JSON.parse(fs.readFileSync(path.join(target,'data/projects.json'),'utf8'));if(projects.length!==32)throw Error('Wrong collection size');
console.log('Source audit passed: 32 projects, tested source matches, no local secrets or runtime data.');
