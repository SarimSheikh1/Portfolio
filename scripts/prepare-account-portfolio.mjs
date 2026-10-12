import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
const from=path.join(root,'delivery/world-agentic-v2');
const to=path.join(root,'delivery/portfolio-push');
const remote=execFileSync('git',['remote','get-url','origin'],{cwd:to,encoding:'utf8'}).trim();
if(remote!=='https://github.com/SarimSheikh1/Portfolio.git')throw Error('Unexpected target repository');
const obsolete=['src','public','index.html','netlify.toml','vercel.json'];
for(const name of obsolete){const target=path.resolve(to,name);if(!target.startsWith(to+path.sep))throw Error('Unsafe target');fs.rmSync(target,{recursive:true,force:true});}
const dirs=['app','build','components','data','db','drizzle','hooks','lib','public','scripts','vendor'];
const skip=new Set(['port-portfolio.mjs','finish-design.mjs','fix-json-types.mjs','add-account-roles.mjs']);
for(const dir of dirs)fs.cpSync(path.join(from,dir),path.join(to,dir),{recursive:true,filter:file=>!skip.has(path.basename(file))});
fs.mkdirSync(path.join(to,'.openai'),{recursive:true});
fs.copyFileSync(path.join(from,'.openai/hosting.json'),path.join(to,'.openai/hosting.json'));
const files=['.env.example','.gitignore','.npmrc','AGENTS.md','cloudflare-env.d.ts','components.json','drizzle.config.ts','eslint.config.mjs','next.config.ts','package-lock.json','package.json','postcss.config.mjs','README.md','tsconfig.json','vite.config.ts'];
for(const file of files)fs.copyFileSync(path.join(from,file),path.join(to,file));
fs.mkdirSync(path.join(to,'tests'),{recursive:true});
for(const file of ['account.test.ts','browser.mjs','motion.mjs'])fs.copyFileSync(path.join(from,'tests',file),path.join(to,'tests',file));
for(const file of ['package.json','package-lock.json']){const full=path.join(to,file);const json=JSON.parse(fs.readFileSync(full,'utf8'));json.name='world-agentic-portfolio';if(json.packages?.[''])json.packages[''].name=json.name;fs.writeFileSync(full,JSON.stringify(json,null,2)+'\n');}
fs.appendFileSync(path.join(to,'.gitignore'),'\n*.tsbuildinfo\n');
console.log('Prepared server-based portfolio source; secrets, database and build output excluded.');
