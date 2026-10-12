import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:8787',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.hero-art')).opacity)===1);
 await page.locator('.service-grid').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.service-grid')).opacity)===1);
 await page.getByLabel('Toggle color theme').click();
 await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
 await page.getByLabel('Toggle color theme').click();
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:'outputs/world-agentic-hero.png'});
 assert.deepEqual(errors,[]);
 console.log('Passed: animated hero and service reveals finish, dark/light toggle works, no JavaScript errors.');
} finally {await browser.close()}
