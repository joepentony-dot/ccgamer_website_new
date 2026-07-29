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
  { label: '404 page', path: '/404.html' },
  { label: 'About', path: '/about.html' },
  { label: 'Games', path: '/games/index.html' },
  { label: 'Game: Zeewolf', path: '/games/game.html?id=zeewolf', waitFor: '#gameHeroThumb[src]' },
  { label: 'Publisher: Ocean Software', path: '/games/publishers/ocean-software/', waitFor: 'img[alt$=" cover art"]' },
  { label: 'Year: 1989', path: '/games/years/1989/', waitFor: 'img[alt$=" cover art"]' },
  { label: 'Quiz', path: '/quiz/quiz.html' },
  { label: 'Login', path: '/auth/login.html' },
];

async function inspectRoute(browser, baseUrl, route) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route(/https:\/\/(?:www\.)?googletagmanager\.com\//, (requestRoute) => requestRoute.abort());
  await context.route(/https:\/\/(?:www\.)?google-analytics\.com\//, (requestRoute) => requestRoute.abort());
  const page = await context.newPage();

  try {
    const response = await page.goto(new URL(route.path, baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    if (route.waitFor) {
      await page.waitForSelector(route.waitFor, { timeout: 60000 });
    }
    await page.waitForTimeout(600);

    const delivery = await page.evaluate(() => {
      const analytics = Array.from(document.querySelectorAll('script[src]')).filter((script) => {
        try {
          const url = new URL(script.getAttribute('src'), document.baseURI);
          return url.pathname.toLowerCase().endsWith('/js/analytics.js');
        } catch (error) {
          return false;
        }
      });
      const stylesheetHrefs = Array.from(document.querySelectorAll('link[rel~="stylesheet"][href]'))
        .map((link) => link.getAttribute('href'))
        .filter(Boolean);
      const duplicateStyles = stylesheetHrefs.filter((href, index) => stylesheetHrefs.indexOf(href) !== index);
      return {
        analytics_tags: analytics.length,
        analytics_nonblocking: analytics.length > 0 && analytics.every((script) => (
          script.hasAttribute('defer')
          || script.hasAttribute('async')
          || String(script.getAttribute('type') || '').toLowerCase() === 'module'
        )),
        analytics_loader_executed: Boolean(window.ccgAnalyticsLoaded),
        duplicate_stylesheet_hrefs: new Set(duplicateStyles).size,
        body_has_content: Boolean(document.body && document.body.textContent.trim()),
      };
    });

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
      ...delivery,
      axe_violation_count: axeResult.violations.length,
      serious_or_critical_nodes: seriousOrCriticalNodes,
    };
    result.passed = result.status === 200
      && result.analytics_tags > 0
      && result.analytics_nonblocking
      && result.analytics_loader_executed
      && result.duplicate_stylesheet_hrefs === 0
      && result.body_has_content
      && result.serious_or_critical_nodes === 0;
    return result;
  } catch (error) {
    return {
      label: route.label,
      path: route.path,
      status: null,
      analytics_tags: 0,
      analytics_nonblocking: false,
      analytics_loader_executed: false,
      duplicate_stylesheet_hrefs: 0,
      serious_or_critical_nodes: 0,
      error: error.message,
      passed: false,
    };
  } finally {
    await context.close();
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
    const payload = {
      base_url: args.baseUrl,
      chrome_path: chromePath,
      axe_version: axe.version,
      routes,
      serious_or_critical_nodes: routes.reduce(
        (sum, route) => sum + (route.serious_or_critical_nodes || 0),
        0,
      ),
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
