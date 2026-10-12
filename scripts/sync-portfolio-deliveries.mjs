import fs from 'node:fs';import path from 'node:path';
const source=path.resolve('delivery/portfolio-github');
for(const destination of ['delivery/portfolio-push','delivery/world-agency-site']){
const target=path.resolve(destination);if(!target.startsWith(path.resolve('delivery')+path.sep))throw Error('Invalid delivery path');
for(const entry of fs.readdirSync(source)){if(['dist','node_modules','.git'].includes(entry))continue;fs.cpSync(path.join(source,entry),path.join(target,entry),{recursive:true,force:true})}
if(destination.endsWith('world-agency-site')){fs.cpSync(path.join(source,'dist'),path.join(target,'dist'),{recursive:true,force:true});}
console.log('Copied final source to',destination);
}
