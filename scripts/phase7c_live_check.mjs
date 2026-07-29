#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';
import axe from 'axe-core';

// Evidence deliberately omits volatile timestamps so repeat runs converge.
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
  { label: 'Game: Zeewolf', path: '/games/game.html?id=zeewolf', type: 'game' },
  { label: 'Publisher: Ocean Software', path: '/games/publishers/ocean-software/', type: 'archive' },
  { label: 'Developer: Ocean', path: '/games/developers/ocean/', type: 'archive' },
  { label: 'Year: 1989', path: '/games/years/1989/', type: 'archive' },
  { label: 'Platform: Amiga', path: '/games/platforms/amiga/', type: 'archive' },
];

async function inspectRoute(browser, baseUrl, route) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => {
    window.__ccgLayoutShift = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__ccgLayoutShift += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (error) {}
  });

  try {
    const response = await page.goto(new URL(route.path, baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    if (route.type === 'game') {
      await page.waitForSelector('#gameHeroThumb[src]', { timeout: 60000 });
    } else {
      await page.waitForSelector('img[alt$=" cover art"]', { timeout: 60000 });
    }
    await page.waitForTimeout(1800);

    const media = await page.evaluate((type) => {
      if (type === 'game') {
        const hero = document.getElementById('gameHeroThumb');
        const iframe = document.getElementById('game-video-embed');
        const logo = document.querySelector('.ccg-brand__logo');
        const sized = [hero, iframe, logo].filter(Boolean).filter((element) => {
          return element.getAttribute('width') && element.getAttribute('height');
        });
        const unsized = [hero, iframe, logo].filter(Boolean).filter((element) => {
          return !element.getAttribute('width') || !element.getAttribute('height');
        });
        return {
          sized_media_count: sized.length,
          unsized_target_media: unsized.length,
          hero: hero ? {
            loading: hero.getAttribute('loading'),
            decoding: hero.getAttribute('decoding'),
            fetchpriority: hero.getAttribute('fetchpriority'),
            width: hero.getAttribute('width'),
            height: hero.getAttribute('height'),
          } : null,
          iframe: iframe ? {
            loading: iframe.getAttribute('loading'),
            width: iframe.getAttribute('width'),
            height: iframe.getAttribute('height'),
            title: iframe.getAttribute('title'),
          } : null,
          logo: logo ? {
            loading: logo.getAttribute('loading'),
            width: logo.getAttribute('width'),
            height: logo.getAttribute('height'),
          } : null,
        };
      }

      const images = Array.from(document.querySelectorAll('img[alt$=" cover art"]'));
      const unsized = images.filter((image) => (
        image.getAttribute('width') !== '320'
        || image.getAttribute('height') !== '180'
        || image.getAttribute('loading') !== 'lazy'
        || image.getAttribute('decoding') !== 'async'
      ));
      return {
        sized_media_count: images.length - unsized.length,
        unsized_target_media: unsized.length,
        archive_image_count: images.length,
      };
    }, route.type);

    await page.addScriptTag({ content: axe.source });
    const axeResult = await page.evaluate(async () => window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
      resultTypes: ['violations'],
    }));
    const seriousOrCriticalNodes = axeResult.violations
      .filter((violation) => ['serious', 'critical'].includes(violation.impact))
      .reduce((sum, violation) => sum + violation.nodes.length, 0);

    const layoutShiftScore = await page.evaluate(() => Number(window.__ccgLayoutShift || 0));
    const result = {
      label: route.label,
      path: route.path,
      type: route.type,
      status: response?.status() ?? null,
      ...media,
      layout_shift_score: layoutShiftScore,
      axe_violation_count: axeResult.violations.length,
      serious_or_critical_nodes: seriousOrCriticalNodes,
    };

    if (route.type === 'game') {
      result.passed = result.status === 200
        && result.unsized_target_media === 0
        && result.hero?.loading === 'eager'
        && result.hero?.decoding === 'async'
        && result.hero?.fetchpriority === 'high'
        && result.hero?.width === '320'
        && result.hero?.height === '180'
        && result.iframe?.loading === 'lazy'
        && result.iframe?.width === '560'
        && result.iframe?.height === '315'
        && Boolean(result.iframe?.title)
        && result.logo?.loading === 'eager'
        && result.serious_or_critical_nodes === 0;
    } else {
      result.passed = result.status === 200
        && result.sized_media_count > 0
        && result.unsized_target_media === 0
        && result.serious_or_critical_nodes === 0;
    }
    return result;
  } catch (error) {
    return {
      label: route.label,
      path: route.path,
      type: route.type,
      error: error.message,
      passed: false,
      sized_media_count: 0,
      unsized_target_media: 0,
      layout_shift_score: 0,
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
