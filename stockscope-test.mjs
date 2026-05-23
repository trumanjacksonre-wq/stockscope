import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://localhost:3000/dashboard/NVDA', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2000);
// Right portion of chart only — where projections should be
await page.screenshot({ path: '/tmp/ss-proj.png', clip: { x: 960, y: 350, width: 480, height: 400 } });
await browser.close();
