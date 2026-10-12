import {chromium} from '@playwright/test';
import sharp from 'sharp';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:3840,height:2160}});await page.goto('http://127.0.0.1:8787/');
 for(const theme of ['dark','light']){
  await page.evaluate(theme=>{localStorage.setItem('world-theme',theme)},theme);await page.reload();
  const logo=page.locator('.brand .theme-logo-'+theme).first();await logo.waitFor({state:'visible'});await logo.evaluate(img=>img.decode());
  if(!await logo.evaluate(img=>img.naturalWidth>0))throw Error('Logo failed to load');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('4K overflow');
  await page.screenshot({path:'evidence/world-logo-'+theme+'-4k.png'});
 }
 await page.setViewportSize({width:390,height:844});await page.reload();if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
 for(const theme of ['dark','light']){const meta=await sharp('client/public/brand/world-agentic-'+theme+'-4k.png').metadata();if(meta.width!==2160||meta.height!==3840)throw Error('4K export dimensions incorrect')}
 console.log('PASS: theme logos switch/load; 4K and mobile have no overflow; exports are 2160x3840.');
}finally{await browser.close()}
