// Screenshots the built site: node scripts/shot.mjs <url> <out-prefix> [width]
import { chromium } from 'playwright-core'
const [url, out, width = '1280'] = process.argv.slice(2)
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: Number(width), height: 900 }, colorScheme: scheme, deviceScaleFactor: 1 })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `${out}-${scheme}.png`, fullPage: true })
  await page.close()
}
await browser.close()
