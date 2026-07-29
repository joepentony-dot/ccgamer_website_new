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
  for (const required of ['baseUrl', 'output', 'report', 'screenshot']) {
    if (!result[required]) throw new Error(`Missing --${required.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`);
  }
  return result;
}

const args = parseArgs();
fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true });
fs.mkdirSync(path.dirname(path.resolve(args.screenshot)), { recursive: true });

async function triggerTripleClick(page) {
  await page.evaluate(async () => {
    const logo = document.querySelector('.ccg-brand__logo');
    if (!logo) throw new Error('Logo trigger not found');
    const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
    for (let index = 0; index < 3; index += 1) {
      logo.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
      }));
      await wait(180);
    }
  });
  await page.locator('.ccg-secret-modal.is-open').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(1150);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let evidence;
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
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

  await page.goto(new URL('home.html', args.baseUrl).toString(), {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(900);
  await triggerTripleClick(page);
  await page.locator('[data-ccg-secret-code="pacman"]').click();
  await page.locator('.ccg-egg-overlay--pacman').waitFor({ state: 'visible', timeout: 5000 });

  await page.waitForFunction(() => {
    const frame = document.querySelector('.ccg-egg-overlay--pacman iframe');
    const documentInside = frame?.contentDocument;
    return documentInside?.documentElement.getAttribute('data-ccg-pacman-ready') === 'true'
      && Boolean(documentInside.querySelector('#pacman canvas'))
      && Boolean(documentInside.querySelector('[data-ccg-pacman-controls]:not([hidden])'));
  }, null, { timeout: 10000 });

  const pacmanFrame = page.frames().find(frame => frame.url().includes('pacman.html'));
  if (!pacmanFrame) throw new Error('PACMAN iframe was not available');

  await pacmanFrame.locator('[data-pacman-key-code="78"]').dispatchEvent('pointerdown');
  await page.waitForTimeout(350);

  const metrics = await pacmanFrame.evaluate(() => {
    const canvas = document.querySelector('#pacman canvas');
    const controls = document.querySelector('[data-ccg-pacman-controls]');
    const start = document.querySelector('.ccg-pacman-start');
    if (!canvas || !controls || !start) return null;

    const context = canvas.getContext('2d');
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let colouredPixels = 0;
    let brightPixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      if (red > 18 || green > 18 || blue > 18) colouredPixels += 1;
      if (red > 120 || green > 120 || blue > 120) brightPixels += 1;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const controlsRect = controls.getBoundingClientRect();
    const startRect = start.getBoundingClientRect();
    return {
      readyState: document.documentElement.getAttribute('data-ccg-pacman-ready'),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      colouredPixels,
      brightPixels,
      canvasRect: {
        top: canvasRect.top,
        left: canvasRect.left,
        right: canvasRect.right,
        bottom: canvasRect.bottom,
      },
      controlsRect: {
        top: controlsRect.top,
        left: controlsRect.left,
        right: controlsRect.right,
        bottom: controlsRect.bottom,
      },
      startRect: {
        top: startRect.top,
        left: startRect.left,
        right: startRect.right,
        bottom: startRect.bottom,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      documentScrollHeight: document.documentElement.scrollHeight,
      externalRuntimeScripts: Array.from(document.scripts)
        .map(script => script.src)
        .filter(src => src && !src.startsWith(window.location.origin)),
    };
  });

  const within = (rect, viewport) => Boolean(rect)
    && rect.top >= -2
    && rect.left >= -2
    && rect.right <= viewport.width + 2
    && rect.bottom <= viewport.height + 2;

  const checks = {
    localRuntimeReady: metrics?.readyState === 'true',
    canvasHasPlayableDimensions: Number(metrics?.canvasWidth) >= 300 && Number(metrics?.canvasHeight) >= 380,
    mazeCanvasContainsColour: Number(metrics?.colouredPixels) >= 1000,
    mazeCanvasContainsBrightPixels: Number(metrics?.brightPixels) >= 250,
    canvasWithinIframeViewport: within(metrics?.canvasRect, metrics?.viewport),
    touchControlsWithinIframeViewport: within(metrics?.controlsRect, metrics?.viewport),
    startButtonWithinIframeViewport: within(metrics?.startRect, metrics?.viewport),
    noExternalRuntimeScripts: Array.isArray(metrics?.externalRuntimeScripts) && metrics.externalRuntimeScripts.length === 0,
  };

  await page.screenshot({ path: path.resolve(args.screenshot), fullPage: false });

  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([check]) => check);

  evidence = {
    generatedAt: new Date().toISOString(),
    verdict: failedChecks.length ? 'FAIL' : 'PASS',
    failedChecks,
    checks,
    metrics,
  };

  await context.close();
} finally {
  await browser.close();
}

fs.writeFileSync(path.resolve(args.output), `${JSON.stringify(evidence, null, 2)}\n`);

const report = `# PACMAN Mobile Render Validation\n\n## Verdict\n\n**${evidence.verdict}**\n\nThe local PACMAN Easter egg was opened through the three-click menu in a 390×844 touch viewport. The test required a rendered maze canvas, visible touch controls, a visible Start/New Game button and no external runtime scripts.\n\n## Checks\n\n${Object.entries(evidence.checks).map(([check, passed]) => `- ${passed ? 'PASS' : 'FAIL'} — ${check}`).join('\n')}\n\n## Failed checks\n\n${evidence.failedChecks.length ? evidence.failedChecks.map(check => `- ${check}`).join('\n') : '- None'}\n`;

fs.writeFileSync(path.resolve(args.report), report);
console.log(JSON.stringify({ verdict: evidence.verdict, failedChecks: evidence.failedChecks }, null, 2));
if (evidence.failedChecks.length) process.exit(1);
