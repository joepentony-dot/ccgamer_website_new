#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index].replace(/^--/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    result[key] = args[index + 1];
  }
  for (const required of ['baseUrl', 'output', 'report', 'screenshots']) {
    if (!result[required]) throw new Error(`Missing --${required.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`);
  }
  return result;
}

const args = parseArgs();
const screenshotsDir = path.resolve(args.screenshots);
fs.mkdirSync(screenshotsDir, { recursive: true });

const cases = [
  { name: 'home-phone-touch', page: 'home.html', width: 390, height: 844, isMobile: true, hasTouch: true, pointerType: 'touch' },
  { name: 'home-desktop-mouse', page: 'home.html', width: 1366, height: 768, isMobile: false, hasTouch: false, pointerType: 'mouse' },
  { name: 'games-phone-touch', page: 'games/index.html', width: 390, height: 844, isMobile: true, hasTouch: true, pointerType: 'touch' },
];

async function dispatchLogoPointer(page, pointerType) {
  await page.evaluate(type => {
    const logo = document.querySelector('.ccg-brand__logo');
    if (!logo) throw new Error('Logo trigger not found');
    logo.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerType: type,
      isPrimary: true,
      button: 0,
      pointerId: 1,
    }));
  }, pointerType);
}

async function openMenu(page, pointerType) {
  for (let index = 0; index < 3; index += 1) {
    await dispatchLogoPointer(page, pointerType);
    if (index < 2) await page.waitForTimeout(170);
  }
  await page.locator('.ccg-secret-modal.is-open').waitFor({ state: 'visible', timeout: 5000 });
}

async function fireResidualThirdTapEvents(page, pointerType) {
  await page.evaluate(type => {
    const modal = document.querySelector('.ccg-secret-modal');
    const close = document.querySelector('[data-ccg-secret-close]');
    if (!modal || !close) throw new Error('Secret modal controls not found');

    close.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerType: type,
      isPrimary: true,
      button: 0,
      pointerId: 1,
    }));
    close.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }));
    close.click();

    modal.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      pointerId: 2,
    }));
    modal.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      pointerId: 2,
    }));
    modal.click();
  }, pointerType);
}

async function menuIsOpen(page) {
  return page.evaluate(() => {
    const modal = document.querySelector('.ccg-secret-modal');
    return Boolean(modal?.classList.contains('is-open') && modal.getAttribute('aria-hidden') === 'false');
  });
}

async function runCase(browser, testCase) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    screen: { width: testCase.width, height: testCase.height },
    isMobile: testCase.isMobile,
    hasTouch: testCase.hasTouch,
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  await page.route('**/*', async route => {
    const requestUrl = route.request().url();
    if (requestUrl.startsWith(args.baseUrl)) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  const url = new URL(testCase.page, args.baseUrl).toString();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, Math.max(0, document.documentElement.scrollHeight - window.innerHeight)));
  await page.waitForTimeout(150);
  const scrollBefore = await page.evaluate(() => window.scrollY);

  await openMenu(page, testCase.pointerType);
  await fireResidualThirdTapEvents(page, testCase.pointerType);
  await page.waitForTimeout(250);

  const stableAfterResidualEvents = await menuIsOpen(page);
  const accidentalResultAbsent = await page.evaluate(() => !document.querySelector('.ccg-egg-overlay, .ccg-bsod, .ccg-c64-reset'));

  const screenshotPath = path.join(screenshotsDir, `${testCase.name}-stable-menu.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  await page.waitForTimeout(900);
  const remainsOpenAfterShieldExpires = await menuIsOpen(page);

  await page.locator('.ccg-secret-modal').click({ position: { x: 4, y: 4 } });
  await page.locator('.ccg-secret-modal.is-open').waitFor({ state: 'hidden', timeout: 5000 });
  const backdropClosesAfterShield = !(await menuIsOpen(page));
  const scrollAfterBackdropClose = await page.evaluate(() => window.scrollY);

  await page.waitForTimeout(800);
  await openMenu(page, testCase.pointerType);
  await page.waitForTimeout(1100);
  await page.locator('[data-ccg-secret-close]').click();
  await page.locator('.ccg-secret-modal.is-open').waitFor({ state: 'hidden', timeout: 5000 });
  const closeButtonClosesAfterShield = !(await menuIsOpen(page));
  const scrollAfterButtonClose = await page.evaluate(() => window.scrollY);

  const checks = {
    stableAfterResidualEvents,
    accidentalResultAbsent,
    remainsOpenAfterShieldExpires,
    backdropClosesAfterShield,
    closeButtonClosesAfterShield,
    backdropClosePreservesScroll: Math.abs(scrollAfterBackdropClose - scrollBefore) <= 2,
    buttonClosePreservesScroll: Math.abs(scrollAfterButtonClose - scrollBefore) <= 2,
  };

  await context.close();

  return {
    ...testCase,
    url,
    scrollBefore,
    scrollAfterBackdropClose,
    scrollAfterButtonClose,
    checks,
    passed: Object.values(checks).every(Boolean),
    screenshot: screenshotPath,
  };
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const results = [];
try {
  for (const testCase of cases) {
    results.push(await runCase(browser, testCase));
  }
} finally {
  await browser.close();
}

const failedChecks = [];
for (const result of results) {
  for (const [check, passed] of Object.entries(result.checks)) {
    if (!passed) failedChecks.push(`${result.name}: ${check}`);
  }
}

const evidence = {
  generatedAt: new Date().toISOString(),
  verdict: failedChecks.length ? 'FAIL' : 'PASS',
  testedCases: results.length,
  failedChecks,
  results,
};

fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true });
fs.writeFileSync(path.resolve(args.output), `${JSON.stringify(evidence, null, 2)}\n`);

const rows = results.map(result => `| ${result.name} | ${result.width}×${result.height} | ${result.passed ? 'PASS' : 'FAIL'} |`).join('\n');
const report = `# Easter Egg Third-Click Stability Validation\n\n## Verdict\n\n**${evidence.verdict}**\n\nThe third logo tap was followed by simulated touch release, mouse release, synthetic click and duplicate backdrop pointer events. The menu was required to stay open throughout the opening shield, then close normally from a deliberate backdrop click or the close button.\n\n| Case | Viewport | Result |\n|---|---:|---:|\n${rows}\n\n## Required behaviour\n\n- The third tap opens the command menu.\n- Trailing events from that same tap cannot close the menu or launch a command.\n- The menu remains open after the one-second opening shield expires.\n- A later deliberate backdrop click closes it.\n- The close button works normally after the shield.\n- Closing preserves the underlying page position.\n\n## Failed checks\n\n${failedChecks.length ? failedChecks.map(item => `- ${item}`).join('\n') : '- None'}\n`;
fs.writeFileSync(path.resolve(args.report), report);

console.log(JSON.stringify({ verdict: evidence.verdict, testedCases: results.length, failedChecks }, null, 2));
if (failedChecks.length) process.exit(1);
