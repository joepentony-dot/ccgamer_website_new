#!/usr/bin/env node
// Read-only, live-desktop diagnostic for the actual Search Console route families.
// No public pages, catalogue, account data or styles are modified.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { largestSessionWindow } from './lib/cls-session-window.mjs';

const origin = 'https://www.cheekycommodoregamer.co.uk';
const routes = [
  { label: 'Combat School game', path: '/games/combat-school/' },
  { label: 'Games archive', path: '/games/' },
  { label: 'C64 emulator', path: '/emulator/c64/', modes: ['c64'] },
  { label: 'Emulation guide', path: '/emulation.html' },
  { label: '50 Essential Amiga Games', path: '/retro-specials/50-essential-amiga-games/' },
];
const viewports = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];
const args = Object.fromEntries(process.argv.slice(2).reduce((items, value, index, all) => {
  if (index % 2 === 0) items.push([value, all[index + 1]]);
  return items;
}, []));
if (!args['--output'] || !args['--screenshots']) {
  throw new Error('Usage: --output FILE --screenshots DIRECTORY');
}
const output = path.resolve(args['--output']);
const screenshots = path.resolve(args['--screenshots']);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.mkdirSync(screenshots, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});
const rows = [];
const rect = (box) => box ? {
  x: box.x, y: box.y, width: box.width, height: box.height,
} : null;
try {
  for (const viewport of viewports) {
    const viewportLabel = viewport.width + 'x' + viewport.height;
    for (const route of routes) {
      for (const mode of route.modes || ['c64', 'amiga']) {
        const context = await browser.newContext({
          viewport,
          deviceScaleFactor: 1,
          serviceWorkers: 'allow',
        });
        await context.addInitScript((savedMode) => {
          try { localStorage.setItem('ccg-mode', savedMode); } catch (_) {}
        }, mode);
        await context.addInitScript(() => {
          const describe = (node) => {
            if (!node || node.nodeType !== 1) return null;
            const classes = [...node.classList].slice(0, 4);
            return { tag: node.tagName.toLowerCase(), id: node.id || '',
              classes, selector: node.tagName.toLowerCase() + (node.id ? '#' + node.id : classes.length ? '.' + classes.join('.') : '') };
          };
          const rectangle = (box) => box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
          window.__ccgDesktopShifts = [];
          window.__ccgDesktopObserverError = null;
          try {
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                window.__ccgDesktopShifts.push({
                  startTime: entry.startTime, value: entry.value,
                  hadRecentInput: entry.hadRecentInput,
                  sources: (entry.sources || []).map((source) => ({
                    node: describe(source.node),
                    previousRect: rectangle(source.previousRect),
                    currentRect: rectangle(source.currentRect),
                  })),
                });
              }
            }).observe({ type: 'layout-shift', buffered: true });
          } catch (error) { window.__ccgDesktopObserverError = String(error.message || error); }
        });
        const page = await context.newPage();
        let documentNavigationCount = 0;
        page.on('framenavigated', (frame) => {
          if (frame === page.mainFrame()) documentNavigationCount += 1;
        });
        const failedRequests = [];
        page.on('requestfailed', (request) => {
          if (failedRequests.length < 20) failedRequests.push({
            url: request.url(), failure: request.failure()?.errorText || '',
          });
        });
        for (const pass of ['cold', 'warm']) {
          const start = Date.now();
          const navigationCountBefore = documentNavigationCount;
          try {
            failedRequests.length = 0;
            const response = await page.goto(origin + route.path, {
              waitUntil: 'domcontentloaded', timeout: 90000,
            });
            if (!response || response.status() >= 400) {
              throw new Error('Document HTTP status ' + (response?.status() ?? 'unknown'));
            }
            await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
            await page.waitForTimeout(6000);
            const navigationCount = documentNavigationCount - navigationCountBefore;
            const bootstrapReloadDetected = route.path === '/emulator/c64/' &&
              pass === 'cold' && navigationCount > 1;
            const evidence = await page.evaluate(() => ({
              shifts: window.__ccgDesktopShifts || [],
              observerError: window.__ccgDesktopObserverError,
              fonts: document.fonts?.status || 'unavailable',
              main: (() => {
                const node = document.querySelector('main');
                const r = node?.getBoundingClientRect();
                return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
              })(),
              header: (() => {
                const node = document.querySelector('header');
                const r = node?.getBoundingClientRect();
                return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
              })(),
              stylesheets: [...document.styleSheets].map((sheet) => sheet.href).filter(Boolean),
            }));
            if (evidence.observerError) throw new Error(evidence.observerError);
            const relevant = evidence.shifts.filter((entry) => !entry.hadRecentInput);
            const cls = largestSessionWindow(relevant);
            const highest = [...relevant].sort((left, right) => right.value - left.value).slice(0, 10);
            const filename = viewportLabel + '-' + route.path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') + '-' + mode + '-' + pass + '.png';
            await page.screenshot({ path: path.join(screenshots, filename), fullPage: false });
            rows.push({
              url: origin + route.path, label: route.label, mode, pass,
              measurement_label: bootstrapReloadDetected ? 'cold-post-bootstrap' : pass,
              bootstrap_reload_detected: bootstrapReloadDetected,
              document_navigations: navigationCount,
              status: response.status(), viewport: viewportLabel,
              cls_largest_session_window: cls,
              lifetime_shift_sum: relevant.reduce((sum, entry) => sum + entry.value, 0),
              largest_shifts: highest, all_shifts: relevant,
              elapsed_ms: Date.now() - start,
              fonts: evidence.fonts, main: evidence.main, header: evidence.header,
              stylesheets: evidence.stylesheets, request_failures: [...failedRequests],
              screenshot: filename,
            });
            console.log(JSON.stringify({
              route: route.path, viewport: viewportLabel, mode, pass,
              measurement: bootstrapReloadDetected ? 'cold-post-bootstrap' : pass,
              cls, largest_shifts: highest.slice(0, 3),
            }));
          } catch (error) {
            rows.push({ url: origin + route.path, label: route.label, mode, pass, viewport: viewportLabel,
              measurement_label: (route.path === '/emulator/c64/' && pass === 'cold') ? 'cold-post-bootstrap-unknown' : pass,
              document_navigations: documentNavigationCount - navigationCountBefore,
              error: String(error.message || error), elapsed_ms: Date.now() - start,
              request_failures: [...failedRequests] });
            console.error(viewportLabel + ' ' + route.label + ' ' + mode + ' ' + pass + ': ' + error.message);
          }
        }
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
const payload = {
  generated_at: new Date().toISOString(),
  commit_sha: process.env.CCG_CHECKED_OUT_SHA || null,
  workflow_event_sha: process.env.GITHUB_SHA || null,
  methodology: 'Live canonical routes, real Chromium at three desktop viewport sizes, 6s after load, fresh context then warm repeat, saved C64/Amiga modes. CLS is the largest 1s-gap/5s session window. Lab only; not Search Console field data.',
  routes, viewports, rows,
};
fs.writeFileSync(output, JSON.stringify(payload, null, 2) + '\n');
const successes = rows.filter((row) => Number.isFinite(row.cls_largest_session_window));
console.log(JSON.stringify({ cases: rows.length, success: successes.length,
  errors: rows.filter((row) => row.error).length,
  highest_cls: successes.length ? Math.max(...successes.map((row) => row.cls_largest_session_window)) : null,
  output }, null, 2));
if (successes.length !== rows.length) process.exitCode = 1;
