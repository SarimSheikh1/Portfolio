import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const origin='http://127.0.0.1:8787';const env=await readFile('.env','utf8');const username=env.match(/^OWNER_LOGIN=(.*)$/m)[1].trim();
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const ctx=await browser.newContext();const viewer=await ctx.newPage();await viewer.goto(origin);await viewer.locator('.project').first().waitFor();await viewer.locator('.project-preview').first().click();await viewer.getByRole('dialog').waitFor();await viewer.getByRole('button',{name:'Close account dialog'}).click();
 const visitor=await viewer.evaluate(()=>sessionStorage.getItem('world-visitor'));
 const denied=await viewer.request.get(origin+'/api/v1/admin/activity');if(denied.status()!==401)throw Error('Anonymous activity dashboard accessible');
 const admin=await browser.newPage();await admin.goto(origin);await admin.getByRole('button',{name:'Admin Login',exact:true}).click();await admin.getByLabel('Email or username').fill(username);await admin.getByLabel('Password',{exact:true}).fill(process.env.CHECK_OWNER_PASSWORD);await admin.locator('.project-account-form').getByRole('button',{name:'Login',exact:true}).click();await admin.getByRole('heading',{name:'Mission control.'}).waitFor();await admin.getByRole('button',{name:'visitors',exact:true}).click();await admin.getByRole('heading',{name:'Visitor activity',exact:true}).waitFor();
 const response=await admin.request.get(origin+'/api/v1/admin/activity');const data=await response.json();if(!data.visitors.some(v=>v.id===visitor))throw Error('Real visitor visit missing');if(!data.events.some(e=>e.visitor_id===visitor&&e.kind==='project'))throw Error('Real project click missing');if(data.summary.active<1)throw Error('Active visitor count missing');
 console.log('PASS: real visit and project click recorded; admin visitor dashboard displays; anonymous analytics access rejected.');await ctx.close();
}finally{await browser.close()}
