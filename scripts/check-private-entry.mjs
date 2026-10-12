import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin='http://127.0.0.1:8787';
for(const url of ['/api/v1/login','/api/v1/access-entry']){
 const r=await fetch(origin+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(url.endsWith('access-entry')?{path:'/admin'}:{username:'test',password:'test'})});
 if(r.status!==404)throw Error(url+' should return 404 to anonymous requests; received '+r.status);
}
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();const requested=[];page.on('request',r=>requested.push(r.url()));
 await page.goto(origin);await page.locator('.project').first().waitFor();
 if(await page.locator('a[href="/admin"],.sphere-admin-access').count())throw Error('Admin entry remains public');
 if(requested.some(url=>url.includes('WorldAdmin')))throw Error('Admin module loaded for public visitor');
 await page.goto(origin+'/admin');await page.getByRole('heading',{name:'Page not found'}).waitFor();
 const entry=(await readFile('.env','utf8')).match(/^OWNER_ENTRY_PATH=(.*)$/m)[1].trim();
 await page.goto(origin+entry);
 await page.getByRole('heading',{name:'Owner access'}).waitFor();
 await page.getByRole('status').filter({hasText:'database is offline'}).waitFor();
 console.log('PASS: no public admin entry, no public admin module load, /admin unavailable, anonymous admin login rejected.');
}finally{await browser.close()}
