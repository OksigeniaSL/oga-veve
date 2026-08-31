import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const page = await b.newPage({ viewport: { width: 1180, height: 1500 } });
await page.goto('file://' + process.cwd() + '/.kimi/' + process.argv[2] + '.html');
await page.waitForTimeout(1500);
await page.screenshot({ path: process.argv[3], fullPage: true });
await b.close();
