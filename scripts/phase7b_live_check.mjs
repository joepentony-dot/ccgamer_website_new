#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';
import axe from 'axe-core';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]
      .replace(/^--/, '')
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    result[key] = args[index + 1];
  }
  if (!result.baseUrl || !result.output) {
    throw new Error('Usage: --base-url URL --output FILE');
  }
  return result;
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Chrome executable not found');
}

const ROUTES = [
  { label: 'About', path: '/about.html' },
  { label: 'Games', path: '/games/index.html' },
  { label: 'Game: Zeewolf', path: '/games/game.html?id=zeewolf' },
  { label: 'Collections', path: '/games/collections/index.html' },
  { label: 'Emulation', path: '/emulation.html' },
  { label: 'Quiz', path: '/quiz/quiz.html' },
  { label: 'Emulation guide', path: '/resources/emulation-guide.html' },
  { label: 'Legacy quiz', path: '/resources/quiz.html' },
];

async function inspectRoute(browser, baseUrl, route) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    const response = await page.goto(new URL(route.path, baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(1800);

    const skipSelector = '.ccg-skip-link, .quiz-skip-link';
    const skipLink = page.locator(skipSelector).first();
    const skipCount = await page.locator(skipSelector).count();
    const href = skipCount ? await skipLink.getAttribute('href') : null;
    const targetSelector = href && href.startsWith('#') ? href : null;
    const targetCount = targetSelector ? await page.locator(targetSelector).count() : 0;

    let visibleOnFocus = false;
    let focusTransferred = false;
    if (skipCount && targetCount) {
      await skipLink.focus();
      visibleOnFocus = await skipLink.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0
          && rect.height > 0
          && rect.bottom > 0
          && style.display !== 'none'
          && style.visibility !== 'hidden';
      });
      await skipLink.click();
      await page.waitForTimeout(100);
      focusTransferred = await page.evaluate((selector) => {
        const target = document.querySelector(selector);
        return Boolean(target && document.activeElement === target);
      }, targetSelector);
    }

    await page.addScriptTag({ content: axe.source });
    const axeResult = await page.evaluate(async () => window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
      resultTypes: ['violations'],
    }));
    const seriousOrCriticalNodes = axeResult.violations
      .filter((violation) => ['serious', 'critical'].includes(violation.impact))
      .reduce((sum, violation) => sum + violation.nodes.length, 0);

    const result = {
      label: route.label,
      path: route.path,
      status: response?.status() ?? null,
      skip_link_count: skipCount,
      href,
      target_count: targetCount,
      visible_on_focus: visibleOnFocus,
      focus_transferred: focusTransferred,
      axe_violation_count: axeResult.violations.length,
      serious_or_critical_nodes: seriousOrCriticalNodes,
    };
    result.passed = result.status === 200
      && result.skip_link_count === 1
      && result.target_count === 1
      && result.visible_on_focus
      && result.focus_transferred
      && result.serious_or_critical_nodes === 0;
    return result;
  } catch (error) {
    return {
      label: route.label,
      path: route.path,
      error: error.message,
      passed: false,
      serious_or_critical_nodes: 0,
    };
  } finally {
    await page.close();
  }
}

async function main() {
  const args = parseArgs();
  const chromePath = findChrome();
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const routes = [];
    for (const route of ROUTES) {
      routes.push(await inspectRoute(browser, args.baseUrl, route));
    }
    const seriousOrCriticalNodes = routes.reduce(
      (sum, route) => sum + (route.serious_or_critical_nodes || 0),
      0,
    );
    // Do not include run time or commit SHA: committed evidence must be repeatable.
    const payload = {
      base_url: args.baseUrl,
      chrome_path: chromePath,
      axe_version: axe.version,
      routes,
      serious_or_critical_nodes: seriousOrCriticalNodes,
      passed: routes.every((route) => route.passed),
    };
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(JSON.stringify(payload, null, 2));
    if (!payload.passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
