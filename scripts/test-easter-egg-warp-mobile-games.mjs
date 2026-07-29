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
        pointerType: navigator.maxTouchPoints ? 'touch' : 'mouse',
        isPrimary: true,
        button: 0,
      }));
      await wait(180);
    }
  });
  await page.locator('.ccg-secret-modal.is-open').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(1150);
}

async function openCommand(page, command) {
  await triggerTripleClick(page);
  await page.locator(`[data-ccg-secret-code="${command}"]`).click();
}

async function closeResult(page) {
  const exit = page.locator('.ccg-egg-overlay__exit');
  if (await exit.count()) {
    await exit.click();
    await page.locator('.ccg-egg-overlay').waitFor({ state: 'detached', timeout: 5000 });
  }
  await page.waitForTimeout(800);
}

function withinViewport(rect, viewport, tolerance = 2) {
  return rect
    && rect.top >= -tolerance
    && rect.left >= -tolerance
    && rect.right <= viewport.width + tolerance
    && rect.bottom <= viewport.height + tolerance;
}

async function testMobile(browser) {
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

  await page.goto(new URL('home.html', args.baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);

  const checks = {};
  const details = {};

  await openCommand(page, 'warp');
  await page.locator('.ccg-warp-overlay').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(450);
  details.mobileWarp = await page.evaluate(() => {
    const overlay = document.querySelector('.ccg-warp-overlay');
    const canvas = document.querySelector('.ccg-warp-overlay__canvas');
    const rect = overlay?.getBoundingClientRect();
    let hasPaint = false;
    if (canvas) {
      const context = canvas.getContext('2d');
      const sampleWidth = Math.max(1, Math.min(canvas.width, 120));
      const sampleHeight = Math.max(1, Math.min(canvas.height, 120));
      const data = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
      hasPaint = Array.from(data).some((value, index) => index % 4 !== 3 && value > 0);
    }
    return {
      mobileLite: document.documentElement.classList.contains('ccg-mobile-lite'),
      bodyWarpClass: document.body.classList.contains('ccg-warp'),
      canvasWidth: canvas?.width ?? 0,
      canvasHeight: canvas?.height ?? 0,
      hasPaint,
      rect: rect ? { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom } : null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
  checks.mobileWarpVisible = details.mobileWarp.canvasWidth > 0 && details.mobileWarp.canvasHeight > 0;
  checks.mobileWarpPaintedDespiteLiteMode = details.mobileWarp.mobileLite && details.mobileWarp.hasPaint;
  checks.mobileWarpWithinViewport = withinViewport(details.mobileWarp.rect, details.mobileWarp.viewport);
  await page.screenshot({ path: path.join(screenshotsDir, 'mobile-warp.png'), fullPage: false });
  await page.locator('.ccg-warp-overlay').dispatchEvent('pointerdown');
  await page.locator('.ccg-warp-overlay').waitFor({ state: 'detached', timeout: 5000 });
  await page.waitForTimeout(800);

  await openCommand(page, 'pacman');
  await page.locator('.ccg-egg-overlay--pacman').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => {
    const iframe = document.querySelector('.ccg-egg-overlay--pacman iframe');
    return Boolean(iframe?.contentDocument?.querySelector('[data-ccg-pacman-controls]:not([hidden])'));
  }, null, { timeout: 10000 });

  details.mobilePacman = await page.evaluate(() => {
    const iframe = document.querySelector('.ccg-egg-overlay--pacman iframe');
    const documentInside = iframe?.contentDocument;
    const controls = documentInside?.querySelector('[data-ccg-pacman-controls]');
    const media = document.querySelector('.ccg-egg-overlay--pacman .ccg-egg-overlay__media');
    const rect = media?.getBoundingClientRect();
    if (documentInside) {
      documentInside.defaultView.__ccgTestKeys = [];
      documentInside.addEventListener('keydown', event => {
        documentInside.defaultView.__ccgTestKeys.push(event.keyCode || event.which || 0);
      }, true);
    }
    return {
      controlsVisible: Boolean(controls && !controls.hidden),
      controlCount: controls?.querySelectorAll('[data-pacman-key-code]').length ?? 0,
      touchClass: documentInside?.documentElement.classList.contains('ccg-pacman-touch') ?? false,
      mediaRect: rect ? { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom } : null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });

  const pacmanFrame = page.frames().find(frame => frame.url().includes('pacman.html'));
  if (!pacmanFrame) throw new Error('PACMAN iframe was not available');
  await pacmanFrame.locator('[data-pacman-key-code="39"]').dispatchEvent('pointerdown');
  await pacmanFrame.locator('[data-pacman-key-code="78"]').dispatchEvent('pointerdown');
  await page.waitForTimeout(150);
  details.mobilePacman.dispatchedKeys = await pacmanFrame.evaluate(() => window.__ccgTestKeys || []);
  checks.mobilePacmanControlsAppear = details.mobilePacman.controlsVisible && details.mobilePacman.controlCount === 5;
  checks.mobilePacmanTouchLayoutActive = details.mobilePacman.touchClass;
  checks.mobilePacmanControlsDispatchKeys = details.mobilePacman.dispatchedKeys.includes(39)
    && details.mobilePacman.dispatchedKeys.includes(78);
  checks.mobilePacmanWithinViewport = withinViewport(details.mobilePacman.mediaRect, details.mobilePacman.viewport);
  await page.screenshot({ path: path.join(screenshotsDir, 'mobile-pacman.png'), fullPage: false });
  await closeResult(page);

  await openCommand(page, 'invaders');
  await page.locator('.ccg-egg-overlay--desktop-only').waitFor({ state: 'visible', timeout: 5000 });
  details.mobileInvaders = await page.evaluate(() => ({
    message: document.querySelector('.ccg-egg-overlay__desktop-only strong')?.textContent?.trim() || '',
    iframeCount: document.querySelectorAll('.ccg-egg-overlay--desktop-only iframe').length,
  }));
  checks.mobileInvadersShowsDesktopNotice = details.mobileInvaders.message === 'AVAILABLE ON DESKTOP ONLY';
  checks.mobileInvadersDoesNotLoadKeyboardGame = details.mobileInvaders.iframeCount === 0;
  await page.screenshot({ path: path.join(screenshotsDir, 'mobile-invaders-desktop-only.png'), fullPage: false });
  await closeResult(page);

  await context.close();
  return { name: 'mobile', checks, details };
}

async function testDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    screen: { width: 1366, height: 768 },
    isMobile: false,
    hasTouch: false,
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

  await page.goto(new URL('home.html', args.baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);

  const checks = {};
  const details = {};

  await openCommand(page, 'warp');
  await page.locator('.ccg-warp-overlay').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(450);
  details.desktopWarp = await page.evaluate(() => {
    const canvas = document.querySelector('.ccg-warp-overlay__canvas');
    const context = canvas?.getContext('2d');
    let hasPaint = false;
    if (canvas && context) {
      const data = context.getImageData(0, 0, Math.min(canvas.width, 120), Math.min(canvas.height, 120)).data;
      hasPaint = Array.from(data).some((value, index) => index % 4 !== 3 && value > 0);
    }
    return { width: canvas?.width ?? 0, height: canvas?.height ?? 0, hasPaint };
  });
  checks.desktopWarpVisible = details.desktopWarp.width > 0 && details.desktopWarp.height > 0;
  checks.desktopWarpPainted = details.desktopWarp.hasPaint;
  await page.screenshot({ path: path.join(screenshotsDir, 'desktop-warp.png'), fullPage: false });
  await page.locator('.ccg-warp-overlay').dispatchEvent('pointerdown');
  await page.locator('.ccg-warp-overlay').waitFor({ state: 'detached', timeout: 5000 });
  await page.waitForTimeout(800);

  await openCommand(page, 'invaders');
  await page.locator('.ccg-egg-overlay--invaders').waitFor({ state: 'visible', timeout: 5000 });
  details.desktopInvaders = await page.evaluate(() => {
    const overlay = document.querySelector('.ccg-egg-overlay--invaders');
    const media = overlay?.querySelector('.ccg-egg-overlay__media');
    const screen = overlay?.querySelector('.ccg-egg-overlay__screen--invaders');
    const iframe = overlay?.querySelector('iframe');
    const mediaRect = media?.getBoundingClientRect();
    const screenRect = screen?.getBoundingClientRect();
    const mediaStyle = media ? getComputedStyle(media) : null;
    return {
      iframePresent: Boolean(iframe),
      iframeSource: iframe?.src || '',
      mediaRect: mediaRect ? {
        top: mediaRect.top,
        left: mediaRect.left,
        right: mediaRect.right,
        bottom: mediaRect.bottom,
        width: mediaRect.width,
        height: mediaRect.height,
      } : null,
      screenRect: screenRect ? {
        top: screenRect.top,
        left: screenRect.left,
        right: screenRect.right,
        bottom: screenRect.bottom,
      } : null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      justifySelf: mediaStyle?.justifySelf || '',
      alignSelf: mediaStyle?.alignSelf || '',
      aspectRatio: mediaStyle?.aspectRatio || '',
    };
  });
  const media = details.desktopInvaders.mediaRect;
  const horizontalOffset = media ? Math.abs(((media.left + media.right) / 2) - (details.desktopInvaders.viewport.width / 2)) : Infinity;
  checks.desktopInvadersLoadsIframe = details.desktopInvaders.iframePresent
    && details.desktopInvaders.iframeSource.includes('dwmkerr.github.io/spaceinvaders');
  checks.desktopInvadersUsesDedicatedCentredLayout = horizontalOffset <= 3
    && details.desktopInvaders.justifySelf === 'center'
    && details.desktopInvaders.alignSelf === 'center';
  checks.desktopInvadersWithinViewport = withinViewport(media, details.desktopInvaders.viewport);
  checks.desktopInvadersScreenFillsMedia = Boolean(media && details.desktopInvaders.screenRect)
    && Math.abs(media.left - details.desktopInvaders.screenRect.left) <= 2
    && Math.abs(media.right - details.desktopInvaders.screenRect.right) <= 2;
  await page.screenshot({ path: path.join(screenshotsDir, 'desktop-invaders-centred.png'), fullPage: false });
  await closeResult(page);

  await context.close();
  return { name: 'desktop', checks, details };
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let results;
try {
  results = [await testMobile(browser), await testDesktop(browser)];
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

const report = `# WARP, PACMAN and INVADERS Easter Egg Validation\n\n## Verdict\n\n**${evidence.verdict}**\n\n| Environment | Checks | Result |\n|---|---:|---:|\n${rows}\n\n## Required behaviour\n\n- WARP renders a visible canvas effect on desktop and under mobile-lite animation suppression.\n- PACMAN displays a mobile directional pad and Start/New Game control.\n- PACMAN touch buttons dispatch the keyboard codes expected by the local game.\n- Mobile INVADERS displays “AVAILABLE ON DESKTOP ONLY” and does not load the keyboard-only iframe.\n- Desktop INVADERS uses a dedicated centred 4:3 layout and remains inside the viewport.\n\n## Failed checks\n\n${failedChecks.length ? failedChecks.map(item => `- ${item}`).join('\n') : '- None'}\n`;

fs.writeFileSync(path.resolve(args.report), report);
console.log(JSON.stringify({ verdict: evidence.verdict, failedChecks }, null, 2));
if (failedChecks.length) process.exit(1);
