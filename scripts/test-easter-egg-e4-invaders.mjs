import fs from 'node:fs';
import process from 'node:process';
import { chromium } from 'playwright-core';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]]);
  return pairs;
}, []));
const baseURL = args['base-url'] || 'http://127.0.0.1:4173/';
const outputPath = args.output || 'docs/seo-baseline/easter-egg-e4-invaders-evidence.json';
const reportPath = args.report || 'docs/seo-baseline/easter-egg-e4-invaders-validation.md';
const chromiumPath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const cases = [
  { name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true },
  { name: 'short-mobile', viewport: { width: 360, height: 640 }, mobile: true },
  { name: 'desktop', viewport: { width: 1366, height: 768 }, mobile: false },
];

const browser = await chromium.launch({ executablePath: chromiumPath, headless: true, args: ['--no-sandbox'] });
const results = [];
for (const item of cases) {
  const context = await browser.newContext({ viewport: item.viewport, isMobile: item.mobile, hasTouch: item.mobile });
  const page = await context.newPage();
  await page.goto(`${baseURL}home.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.ccg-brand__logo', { state: 'visible', timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, Math.min(800, document.documentElement.scrollHeight - innerHeight - 100)));
  const startScroll = await page.evaluate(() => scrollY);
  await page.evaluate(async mobile => {
    const logo = document.querySelector('.ccg-brand__logo');
    if (!logo) throw new Error('CCG brand logo not found');
    for (let index = 0; index < 3; index += 1) {
      logo.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, composed: true, isPrimary: true,
        pointerId: 1, pointerType: mobile ? 'touch' : 'mouse',
      }));
      await new Promise(resolve => setTimeout(resolve, 180));
    }
  }, item.mobile);
  await page.waitForSelector('.ccg-secret-modal.is-open');
  await page.waitForTimeout(1050);
  await page.locator('[data-ccg-secret-code="invaders"]').click();
  const frame = page.locator('.ccg-egg-overlay--invaders iframe');
  await frame.waitFor({ state: 'visible' });
  const frameURL = await frame.getAttribute('src');
  const game = page.frameLocator('.ccg-egg-overlay--invaders iframe');
  await game.locator('[data-canvas]').waitFor({ state: 'visible' });
  const touchVisible = await game.locator('.ccg-invaders__touch').evaluate(el => getComputedStyle(el).display !== 'none');
  const startVisible = await game.locator('[data-start]').isVisible();
  await game.locator('[data-start]').click();
  await page.waitForTimeout(250);
  const score = await game.locator('[data-score]').textContent();
  const lives = await game.locator('[data-lives]').textContent();
  const canvasContained = await game.locator('[data-canvas]').evaluate(el => {
    const r = el.getBoundingClientRect();
    return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1;
  });
  const hasControls = await game.locator('[data-pause], [data-restart], [data-sound]').count() === 3;
  await page.locator('.ccg-egg-overlay__exit').click();
  await page.waitForTimeout(300);
  const endScroll = await page.evaluate(() => scrollY);
  results.push({
    name: item.name,
    checks: {
      localFrame: Boolean(frameURL && frameURL.includes('/resources/audio/easter-eggs/invaders.html')),
      noExternalRuntime: Boolean(frameURL && !frameURL.startsWith('http')),
      touchControlsMatchPlatform: item.mobile ? touchVisible : !touchVisible,
      startVisible,
      initialScore: score === '000000',
      initialLives: lives === '3',
      canvasContained,
      hasControls,
      scrollRestored: Math.abs(endScroll - startScroll) <= 2,
    },
  });
  await context.close();
}
await browser.close();
const failedChecks = results.flatMap(result => Object.entries(result.checks).filter(([, pass]) => !pass).map(([name]) => `${result.name}: ${name}`));
const evidence = { generatedAt: new Date().toISOString(), verdict: failedChecks.length ? 'FAIL' : 'PASS', failedChecks, results };
fs.mkdirSync(new URL('../docs/seo-baseline/', import.meta.url), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2));
fs.writeFileSync(reportPath, `# E4 Local Invaders Validation\n\n**${evidence.verdict}**\n\n${failedChecks.length ? failedChecks.map(x => `- FAIL — ${x}`).join('\n') : '- Local Invaders passed desktop, mobile and short-mobile checks.'}\n`);
console.log(JSON.stringify({ verdict: evidence.verdict, failedChecks }, null, 2));
if (failedChecks.length) process.exit(1);
