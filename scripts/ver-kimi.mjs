import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
for (const n of ['01-hangar', '02-hud', '03-landing', '04-mandos']) {
  const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('file://' + process.cwd() + '/.kimi/' + n + '.html');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${process.argv[2]}/kimi-${n}.png`, fullPage: false });
  await page.close();
}
await b.close();
