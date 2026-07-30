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

async function openWarp(page) {
  await page.evaluate(async () => {
    const logo = document.querySelector('.ccg-brand__logo');
    if (!logo) throw new Error('Logo trigger not found');
    const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
    for (let index = 0; index < 3; index += 1) {
      logo.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerType: navigator.maxTouchPoints ? 'touch' : 'mouse',
        isPrimary: true,
        button: 0,
      }));
      await wait(180);
    }
  });
  await page.locator('.ccg-secret-modal.is-open').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(1100);
  await page.locator('[data-ccg-secret-code="warp"]').click();
  await page.locator('.ccg-warp-overlay').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(450);
}

async function runCase(browser, name, contextOptions) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  await page.route('**/*', async route => {
    const requestUrl = route.request().url();
    if (requestUrl.startsWith(args.baseUrl)) await route.continue();
    else await route.abort();
  });

  await page.goto(new URL('home.html', args.baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(900);
  await openWarp(page);

  const details = await page.evaluate(() => {
    const overlay = document.querySelector('.ccg-warp-overlay');
    const canvas = document.querySelector('.ccg-warp-overlay__canvas');
    const rect = overlay?.getBoundingClientRect();
    let hasPaint = false;
    if (canvas) {
      const context = canvas.getContext('2d');
      const width = Math.max(1, Math.min(canvas.width, 120));
      const height = Math.max(1, Math.min(canvas.height, 120));
      const data = context.getImageData(0, 0, width, height).data;
      hasPaint = Array.from(data).some((value, index) => index % 4 !== 3 && value > 0);
    }
    return {
      canvasWidth: canvas?.width ?? 0,
      canvasHeight: canvas?.height ?? 0,
      hasPaint,
      bodyWarpClass: document.body.classList.contains('ccg-warp'),
      rect: rect ? { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom } : null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });

  const withinViewport = Boolean(details.rect)
    && details.rect.top >= -2
    && details.rect.left >= -2
    && details.rect.right <= details.viewport.width + 2
    && details.rect.bottom <= details.viewport.height + 2;

  const checks = {
    warpCanvasPresent: details.canvasWidth > 0 && details.canvasHeight > 0,
    warpCanvasPainted: details.hasPaint,
    warpBodyClassApplied: details.bodyWarpClass,
    warpWithinViewport: withinViewport,
  };

  await page.screenshot({ path: path.join(screenshotsDir, `${name}-warp.png`), fullPage: false });
  await context.close();
  return { name, checks, details };
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let results;
try {
  results = [
    await runCase(browser, 'mobile', {
      viewport: { width: 390, height: 844 },
      screen: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    }),
    await runCase(browser, 'desktop', {
      viewport: { width: 1366, height: 768 },
      screen: { width: 1366, height: 768 },
      isMobile: false,
      hasTouch: false,
      deviceScaleFactor: 1,
    }),
  ];
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
  failedChecks,
  results,
};

fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true });
fs.writeFileSync(path.resolve(args.output), `${JSON.stringify(evidence, null, 2)}\n`);

const rows = results.map(result => {
  const passed = Object.values(result.checks).filter(Boolean).length;
  const total = Object.keys(result.checks).length;
  return `| ${result.name} | ${passed}/${total} | ${passed === total ? 'PASS' : 'FAIL'} |`;
}).join('\n');

const report = `# WARP Easter Egg Validation\n\n## Verdict\n\n**${evidence.verdict}**\n\n| Environment | Checks | Result |\n|---|---:|---:|\n${rows}\n\n## Required behaviour\n\n- WARP renders a visible painted canvas on mobile and desktop.\n- The WARP body state is applied while the effect is active.\n- The effect remains within the viewport.\n`;

fs.writeFileSync(path.resolve(args.report), report);
if (failedChecks.length) {
  console.error(`WARP validation failed: ${failedChecks.join(', ')}`);
  process.exit(1);
}
console.log('WARP validation passed.');
