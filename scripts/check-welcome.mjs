import {chromium} from '@playwright/test';
const browser = await chromium.launch({channel:'chrome', headless:true});
try {
  const page = await browser.newPage();
  let prompts = 0;
  page.on('dialog', async dialog => {
    if (dialog.type() !== 'prompt' || dialog.message() !== 'Whats Your BeautiFul Name') throw new Error('Unexpected dialog');
    prompts++;
    await dialog.accept('Sarim');
  });
  await page.goto('http://127.0.0.1:8787/');
  await page.getByText('Hello, Sarim!', {exact:true}).waitFor();
  if (prompts !== 1) throw new Error(`Expected one prompt, got ${prompts}`);
  await page.getByRole('button', {name:'Let’s explore'}).click();
  await page.getByRole('dialog').waitFor({state:'detached'});
  if (await page.getByRole('dialog').count()) throw new Error('Welcome did not close');
  const fallback = await browser.newPage({viewport:{width:390,height:844}});
  await fallback.addInitScript(() => { window.prompt = () => null; });
  await fallback.goto('http://127.0.0.1:8787/');
  await fallback.getByLabel('Your beautiful name').fill('Ali');
  await fallback.getByRole('button', {name:'Continue', exact:true}).click();
  await fallback.getByText('Hello, Ali!', {exact:true}).waitFor();
  if (await fallback.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile overflow');
  console.log('Passed: native prompt once, personalized welcome, dismissal, blocked-prompt fallback, mobile layout.');
} finally { await browser.close(); }
