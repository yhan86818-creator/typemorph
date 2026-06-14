import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

// Landing
await page.goto('https://typemorph.dev', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'public/screenshot-landing.png' });
console.log('✅ landing');

// Workbench
await page.goto('https://typemorph.dev/converters/json-to-zod', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'public/screenshot-workbench.png' });
console.log('✅ workbench');

// Diff page
await page.goto('https://typemorph.dev/converters/json-to-typescript', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'public/screenshot-converter.png' });
console.log('✅ converter');

await browser.close();
