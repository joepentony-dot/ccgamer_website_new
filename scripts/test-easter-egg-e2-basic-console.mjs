import fs from 'node:fs';
import process from 'node:process';
import { chromium } from 'playwright-core';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]]);
  return pairs;
}, []));
const baseURL = args['base-url'] || 'http://127.0.0.1:4173/';
const outputPath = args.output || 'docs/seo-baseline/easter-egg-e2-basic-evidence.json';
const reportPath = args.report || 'docs/seo-baseline/easter-egg-e2-basic-validation.md';
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
  await page.goto(`${baseURL}home.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, Math.min(800, document.documentElement.scrollHeight - innerHeight - 100)));
  const startScroll = await page.evaluate(() => scrollY);
  const logo = page.locator('[data-ccg-header] img, .ccg-logo img, .ccg-logo').first();
  for (let i = 0; i < 3; i += 1) { await logo.click({ force: true }); await page.waitForTimeout(180); }
  await page.waitForSelector('.ccg-secret-modal.is-open');
  await page.waitForTimeout(1050);
  const menuHasBasic = await page.locator('[data-ccg-secret-code="basic"]').isVisible();
  await page.locator('[data-ccg-secret-code="basic"]').click();
  await page.waitForSelector('.ccg-egg-overlay[data-ccg-basic-module="ready"]', { timeout: 10000 });
  const overlay = page.locator('.ccg-egg-overlay[data-ccg-basic-module="ready"]');
  const contained = await overlay.evaluate(el => {
    const r = el.querySelector('.ccg-basic-console')?.getBoundingClientRect();
    const exit = el.querySelector('.ccg-egg-overlay__exit')?.getBoundingClientRect();
    return Boolean(r && exit && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 && exit.top >= 0 && exit.bottom <= innerHeight);
  });
  const input = page.locator('[data-basic-input]');
  const submit = async command => { await input.fill(command); await input.press('Enter'); await page.waitForTimeout(120); };
  await submit('LIST');
  const listWorks = await page.locator('.ccg-basic-console__output').textContent().then(t => t.includes('10 PRINT CHR$(147)'));
  await submit('POKE 53280,2');
  const pokeWorks = await page.locator('.ccg-basic-console').evaluate(el => getComputedStyle(el).getPropertyValue('--ccg-basic-border').trim().length > 0);
  await submit('BAD COMMAND');
  const syntaxError = await page.locator('.ccg-basic-console__output').textContent().then(t => t.includes('?SYNTAX ERROR'));
  await submit('LOAD"*",8,1');
  await page.waitForSelector('.ccg-basic-console__launch', { timeout: 10000 });
  const reward = await page.locator('.ccg-basic-console__launch').evaluate(a => ({ visible: !!(a.offsetWidth && a.offsetHeight), href: a.getAttribute('href') || '' }));
  await page.locator('.ccg-egg-overlay__exit').click();
  await page.waitForTimeout(250);
  const endScroll = await page.evaluate(() => scrollY);
  const scrollDelta = endScroll - startScroll;
  const restored = Math.abs(scrollDelta) <= 2;
  results.push({
    name: item.name,
    metrics: { startScroll, endScroll, scrollDelta },
    checks: {
      menuHasBasic,
      contained,
      listWorks,
      pokeWorks,
      syntaxError,
      rewardVisible: reward.visible,
      rewardCanonical: /^\/games\/[^/]+\/$/.test(new URL(reward.href, baseURL).pathname),
      scrollRestored: restored,
    },
  });
  await context.close();
}
await browser.close();
const failedChecks = results.flatMap(result => Object.entries(result.checks).filter(([, pass]) => !pass).map(([name]) => `${result.name}: ${name}`));
const evidence = { generatedAt: new Date().toISOString(), verdict: failedChecks.length ? 'FAIL' : 'PASS', failedChecks, results };
fs.mkdirSync(new URL('../docs/seo-baseline/', import.meta.url), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2));
fs.writeFileSync(reportPath, `# BASIC Console Validation\n\n**${evidence.verdict}**\n\n${failedChecks.length ? failedChecks.map(x => `- FAIL — ${x}`).join('\n') : '- All mobile and desktop checks passed.'}\n`);
console.log(JSON.stringify({ verdict: evidence.verdict, failedChecks, scrollMetrics: results.map(({ name, metrics }) => ({ name, ...metrics })) }, null, 2));
if (failedChecks.length) process.exit(1);
