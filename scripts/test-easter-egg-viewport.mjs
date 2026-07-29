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
  { name: 'phone-portrait', width: 390, height: 844, isMobile: true, hasTouch: true, page: 'home.html' },
  { name: 'small-phone', width: 360, height: 640, isMobile: true, hasTouch: true, page: 'home.html' },
  { name: 'phone-landscape', width: 844, height: 390, isMobile: true, hasTouch: true, page: 'home.html' },
  { name: 'desktop', width: 1366, height: 768, isMobile: false, hasTouch: false, page: 'home.html' },
  { name: 'games-phone', width: 390, height: 844, isMobile: true, hasTouch: true, page: 'games/index.html' },
];

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

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
      await wait(170);
    }
  });
  await page.locator('.ccg-secret-modal.is-open').waitFor({ state: 'visible', timeout: 5000 });
}

async function viewportMetrics(page, selector) {
  return page.evaluate(targetSelector => {
    const element = document.querySelector(targetSelector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const viewport = window.visualViewport;
    const visible = {
      top: viewport ? viewport.offsetTop : 0,
      left: viewport ? viewport.offsetLeft : 0,
      width: viewport ? viewport.width : window.innerWidth,
      height: viewport ? viewport.height : window.innerHeight,
    };
    visible.right = visible.left + visible.width;
    visible.bottom = visible.top + visible.height;
    return {
      rect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      visible,
      withinVisibleViewport:
        rect.top >= visible.top - 2
        && rect.left >= visible.left - 2
        && rect.right <= visible.right + 2
        && rect.bottom <= visible.bottom + 2,
    };
  }, selector);
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
  const scrollBeforeOpen = await page.evaluate(() => window.scrollY);

  await triggerTripleClick(page);
  await page.waitForTimeout(100);

  const menuMetrics = await viewportMetrics(page, '.ccg-secret-modal__content');
  const closeMetrics = await viewportMetrics(page, '[data-ccg-secret-close]');
  const menuState = await page.evaluate(() => {
    const modal = document.querySelector('.ccg-secret-modal');
    const content = document.querySelector('.ccg-secret-modal__content');
    const close = document.querySelector('[data-ccg-secret-close]');
    return {
      scrollY: window.scrollY,
      contentScrollTop: content?.scrollTop ?? null,
      contentClientHeight: content?.clientHeight ?? null,
      contentScrollHeight: content?.scrollHeight ?? null,
      closeIsFocused: document.activeElement === close,
      bodyPosition: document.body.style.position,
      bodyTouchAction: getComputedStyle(document.body).touchAction,
      ariaHidden: modal?.getAttribute('aria-hidden'),
    };
  });

  const menuScreenshot = path.join(screenshotsDir, `${testCase.name}-menu.png`);
  await page.screenshot({ path: menuScreenshot, fullPage: false });

  const scrollCheck = await page.evaluate(() => {
    const content = document.querySelector('.ccg-secret-modal__content');
    const close = document.querySelector('[data-ccg-secret-close]');
    if (!content || !close) return { scrollable: false, scrolled: false, closeWithinViewport: false };
    const scrollable = content.scrollHeight > content.clientHeight + 1;
    if (scrollable) content.scrollTop = content.scrollHeight;
    const rect = close.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport ? viewport.offsetTop : 0;
    const bottom = top + (viewport ? viewport.height : window.innerHeight);
    return {
      scrollable,
      scrolled: !scrollable || content.scrollTop > 0,
      closeWithinViewport: rect.top >= top - 2 && rect.bottom <= bottom + 2,
      scrollTop: content.scrollTop,
    };
  });

  await page.locator('[data-ccg-secret-close]').click();
  await page.locator('.ccg-secret-modal.is-open').waitFor({ state: 'hidden', timeout: 5000 });
  await page.waitForTimeout(1000);
  const scrollAfterClose = await page.evaluate(() => window.scrollY);

  await triggerTripleClick(page);
  const reopenedScrollTop = await page.evaluate(() => document.querySelector('.ccg-secret-modal__content')?.scrollTop ?? null);

  await page.evaluate(() => {
    const pacman = document.querySelector('[data-ccg-secret-code="pacman"]');
    if (!pacman) throw new Error('PACMAN result trigger not found');
    pacman.click();
  });
  await page.locator('.ccg-egg-overlay').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(150);

  const resultOverlayMetrics = await viewportMetrics(page, '.ccg-egg-overlay');
  const resultFrameMetrics = await viewportMetrics(page, '.ccg-egg-overlay__frame');
  const exitMetrics = await viewportMetrics(page, '.ccg-egg-overlay__exit');
  const resultState = await page.evaluate(() => {
    const exit = document.querySelector('.ccg-egg-overlay__exit');
    const media = document.querySelector('.ccg-egg-overlay__media');
    return {
      exitIsFocused: document.activeElement === exit,
      mediaClientHeight: media?.clientHeight ?? null,
      mediaScrollHeight: media?.scrollHeight ?? null,
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  });

  const resultScreenshot = path.join(screenshotsDir, `${testCase.name}-result.png`);
  await page.screenshot({ path: resultScreenshot, fullPage: false });

  await page.locator('.ccg-egg-overlay__exit').click();
  await page.locator('.ccg-egg-overlay').waitFor({ state: 'detached', timeout: 5000 });

  const checks = {
    menuWithinVisibleViewport: Boolean(menuMetrics?.withinVisibleViewport),
    closeWithinVisibleViewport: Boolean(closeMetrics?.withinVisibleViewport),
    menuStartsAtTop: menuState.contentScrollTop === 0,
    menuCanScroll: scrollCheck.scrolled,
    stickyCloseRemainsVisible: scrollCheck.closeWithinViewport,
    scrollPositionPreservedWhileOpen: Math.abs(menuState.scrollY - scrollBeforeOpen) <= 2,
    scrollPositionRestoredAfterClose: Math.abs(scrollAfterClose - scrollBeforeOpen) <= 2,
    bodyIsNotRepositioned: menuState.bodyPosition !== 'fixed',
    touchPanningNotDisabledOnBody: menuState.bodyTouchAction !== 'none',
    closeReceivesFocus: menuState.closeIsFocused,
    reopenedMenuResetsToTop: reopenedScrollTop === 0,
    resultOverlayWithinVisibleViewport: Boolean(resultOverlayMetrics?.withinVisibleViewport),
    resultFrameWithinVisibleViewport: Boolean(resultFrameMetrics?.withinVisibleViewport),
    resultExitWithinVisibleViewport: Boolean(exitMetrics?.withinVisibleViewport),
    resultExitReceivesFocus: resultState.exitIsFocused,
    resultMediaHasUsableHeight: Number(resultState.mediaClientHeight) >= 120,
  };

  await context.close();

  return {
    ...testCase,
    url,
    scrollBeforeOpen: round(scrollBeforeOpen),
    scrollAfterClose: round(scrollAfterClose),
    menuMetrics,
    closeMetrics,
    menuState,
    scrollCheck,
    reopenedScrollTop,
    resultOverlayMetrics,
    resultFrameMetrics,
    exitMetrics,
    resultState,
    checks,
    passed: Object.values(checks).every(Boolean),
    screenshots: {
      menu: menuScreenshot,
      result: resultScreenshot,
    },
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

const rows = results.map(result => {
  const menuHeight = result.menuMetrics ? round(result.menuMetrics.rect.height) : 'n/a';
  const frameHeight = result.resultFrameMetrics ? round(result.resultFrameMetrics.rect.height) : 'n/a';
  return `| ${result.name} | ${result.width}×${result.height} | ${result.passed ? 'PASS' : 'FAIL'} | ${menuHeight} | ${frameHeight} |`;
}).join('\n');

const report = `# Easter Egg Viewport Positioning Validation\n\n## Verdict\n\n**${evidence.verdict}**\n\nThe three-click command menu and a representative Easter egg result were tested from a scrolled page position across phone portrait, small phone, phone landscape, desktop and the Games index.\n\n| Case | Viewport | Result | Menu height | Result frame height |\n|---|---:|---:|---:|---:|\n${rows}\n\n## Required behaviour\n\n- Menu panel, close button, result frame and result exit button remain inside the visible viewport.\n- Long menus scroll internally with the close control remaining visible.\n- Every reopen begins at the top of the command list.\n- Opening and closing does not move the underlying page.\n- The body is no longer changed to fixed positioning or touch-action none.\n- Keyboard focus moves to the active close/exit control.\n\n## Failed checks\n\n${failedChecks.length ? failedChecks.map(item => `- ${item}`).join('\n') : '- None'}\n`;

fs.writeFileSync(path.resolve(args.report), report);
console.log(JSON.stringify({ verdict: evidence.verdict, testedCases: results.length, failedChecks }, null, 2));
if (failedChecks.length) process.exit(1);
