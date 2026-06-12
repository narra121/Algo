import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: 'C:/Users/narpra1/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
})
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))

await page.goto('http://localhost:5173/')
const cardCount = await page.locator('.algo-card').count()
console.log('algorithm cards:', cardCount)
let failures = 0

for (let c = 0; c < cardCount; c++) {
  await page.goto('http://localhost:5173/')
  const card = page.locator('.algo-card').nth(c)
  const name = await card.locator('h3').innerText()
  await card.click()
  await page.waitForSelector('.naive-card')

  // Reveal every journey attempt so all demo buttons exist.
  while (await page.locator('.jreveal').count()) {
    await page.locator('.jreveal').first().click()
  }

  // Expand every mini player and leave it open — an expanded player no longer
  // renders its .mini-open button, so the button count drains to zero.
  let opened = 0
  while (await page.locator('.mini-open').count()) {
    await page.locator('.mini-open').first().click()
    opened++
    // Each expanded player must render its narration.
    await page.waitForFunction(
      n => document.querySelectorAll('.mini-player .narration').length >= n,
      opened,
      { timeout: 5000 },
    )
  }
  const pass = opened >= 3
  if (!pass) failures++
  console.log(`${name}: ${opened} demos opened — ${pass ? 'PASS' : 'FAIL (expected ≥3)'}`)
}

console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors')
await browser.close()
process.exitCode = errors.length || failures ? 1 : 0
