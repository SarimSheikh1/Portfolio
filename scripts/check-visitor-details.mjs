import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const context=await browser.newContext();
 const page=await context.newPage();
 page.on('dialog',dialog=>dialog.accept('Analytics Check'));
 const saved=page.waitForResponse(response=>{if(!response.url().endsWith('/api/v1/activity')||response.request().method()!=='POST')return false;const payload=response.request().postDataJSON();return payload.name==='Analytics Check'&&payload.details?.timezone;});
 await page.goto('http://127.0.0.1:8787/');
 const response=await saved;
 if(!response.ok()||!(await response.json()).stored)throw Error('Visitor details not saved: '+response.status());
 const first=await page.evaluate(()=>localStorage.getItem('world-visitor'));
 const next=await context.newPage();next.on('dialog',dialog=>dialog.dismiss());
 await next.goto('http://127.0.0.1:8787/');
 const second=await next.evaluate(()=>localStorage.getItem('world-visitor'));
 if(!first||first!==second)throw Error('Duplicate browser identity across tabs');
 const denied=await page.request.get('http://127.0.0.1:8787/api/v1/admin/activity');
 if(denied.status()!==401)throw Error('Analytics exposed to anonymous visitors');
 const now=new Date().toISOString();
 await next.route('**/api/v1/admin/activity',route=>route.fulfill({json:{summary:{total:1,active:1},visitors:[{id:first,name:'Analytics Check',email:null,first_seen:now,last_seen:now,current_target:'work',active:true,details:{device:'Desktop',timezone:'Asia/Karachi'}}],events:[]}}));
 await next.evaluate(async()=>{
   const source=await (await fetch('/src/world.tsx')).text();
   const reactUrl=source.match(/from "([^"]*\/react\.js\?[^"]*)"/)[1];
   const domUrl=source.match(/from "([^"]*\/react-dom_client\.js\?[^"]*)"/)[1];
   const reactModule=await import(reactUrl);const React=reactModule.default||reactModule;
   const domModule=await import(domUrl);const {createRoot}=domModule.default||domModule;
   const {default:Dashboard}=await import('/src/VisitorDashboard.tsx');
   document.getElementById('root').style.display='none';
   const mount=document.createElement('main');document.body.append(mount);
   createRoot(mount).render(React.createElement(Dashboard,{expanded:true}));
 });
 await next.getByRole('heading',{name:'Recent visitors',exact:true}).waitFor();
 await next.getByText('View details',{exact:true}).click();
 await next.getByRole('definition').getByText('Desktop',{exact:true}).waitFor();
 if(!await next.locator('.visitor-status.is-active').isVisible())throw Error('Active badge missing');
 console.log('Passed: name and device details stored by real API, stable identity across tabs, anonymous analytics access denied.');
}finally{await browser.close()}
