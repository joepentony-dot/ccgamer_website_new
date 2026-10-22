// Measure the actual disposable Pages artifact; never regenerate source games.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CCG_BROWSER_MODULE || 'playwright');
const root = path.resolve(process.env.CCG_SITE_ROOT || '_site');
const reportDir = path.resolve(process.env.CCG_CLS_REPORT_DIR || path.join(os.tmpdir(), 'ccg-cls'));
assert(fs.existsSync(path.join(root, 'games/ace-of-aces/index.html')), 'Run the existing Pages staging qualification first');
fs.mkdirSync(reportDir, { recursive: true });
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (name.endsWith('/')) name += 'index.html';
  const file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'public, max-age=3600' });
  res.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const results = [];
const unavailableExternalNetwork = process.env.CCG_OFFLINE_EXTERNALS === '1';
try {
  const pages = ['/home.html', '/games/ace-of-aces/', '/games/20-tons/'];
  const widths = [390, 412, 518, 768, 960, 1199, 1280, 1440];
  for (const url of pages) for (const mode of ['c64', 'amiga']) for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'allow' });
    await context.addInitScript(mode => localStorage.setItem('ccg-mode', mode), mode);
    const page = await context.newPage();
    if (unavailableExternalNetwork) {
      // Local restricted executors cannot reach these origins. This explicit
      // diagnostic mode is never enabled in CI and is recorded in the report.
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort('blockedbyclient'));
    }
    const pending = new Set();
    page.on('request', request => pending.add(request.url()));
    page.on('requestfinished', request => pending.delete(request.url()));
    page.on('requestfailed', request => pending.delete(request.url()));
    const session = await context.newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 1500000, uploadThroughput: 750000 });
    await page.addInitScript(() => {
      window.__cls = { shifts: [], errors: [], geometry: [] };
      const geometry = () => Object.fromEntries(['header', 'main'].map(selector => [selector, document.querySelector(selector)?.getBoundingClientRect().toJSON()]));
      new PerformanceObserver(list => list.getEntries().forEach(entry => {
        if (!entry.hadRecentInput) window.__cls.shifts.push({ time: entry.startTime, value: entry.value, sources: entry.sources?.map(source => ({ node: source.node?.outerHTML?.slice(0, 300), parent: source.node?.parentElement?.outerHTML?.slice(0, 200), previous: source.previousRect, current: source.currentRect })) });
      })).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => list.getEntries().forEach(entry => { if (entry.name === 'first-contentful-paint') window.__cls.geometry.push({ time: entry.startTime, ...geometry() }); })).observe({ type: 'paint', buffered: true });
      addEventListener('error', event => { if (event.message) window.__cls.errors.push(event.message); });
    });
    const failures = [];
    page.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText }));
    let previousPulseGames = [];
    for (const cache of ['cold', 'warm']) {
      try { await page.goto(base + url, { waitUntil: 'domcontentloaded' }); }
      catch (error) {
        fs.writeFileSync(path.join(reportDir, 'navigation-failure.json'), JSON.stringify({ url, mode, width, cache, pending: [...pending], message: error.message }, null, 2));
        throw error;
      }
      await page.waitForTimeout(6000);
      const evidence = await page.evaluate(() => ({ ...window.__cls, finalGeometry: Object.fromEntries(['header', 'main'].map(selector => [selector, document.querySelector(selector)?.getBoundingClientRect().toJSON()])), mode: document.documentElement.dataset.ccgMode, pulseGames: [...document.querySelectorAll('.ccg-archive-pulse__card[data-ccg-archive-pulse="game-of-the-day"], .ccg-archive-pulse__card[data-ccg-archive-pulse="archive-pick"]')].map(card => card.getAttribute('href')), styles: [...document.styleSheets].map(sheet => sheet.href), resources: performance.getEntriesByType('resource').map(entry => entry.toJSON()), mainVisible: getComputedStyle(document.querySelector('main')).visibility === 'visible' }));
      // Core Web Vitals uses the largest session window, not a lifetime sum.
      let start = 0, previous = 0, sessionValue = 0, cls = 0;
      for (const entry of evidence.shifts) {
        if (entry.time - previous > 1000 || entry.time - start > 5000) { start = entry.time; sessionValue = 0; }
        sessionValue += entry.value; previous = entry.time; cls = Math.max(cls, sessionValue);
      }
      const slug = url.includes('home') ? 'home' : url.split('/')[2];
      await page.screenshot({ path: path.join(reportDir, `${slug}-${mode}-${width}-${cache}.png`) });
      const row = { url, mode, width, cache, unavailableExternalNetwork, cls, totalShift: evidence.shifts.reduce((sum, entry) => sum + entry.value, 0), failures: [...failures], ...evidence };
      results.push(row);
      fs.writeFileSync(path.join(reportDir, 'measurements.json'), JSON.stringify(results, null, 2));
      console.log(`${url} ${mode} ${width} ${cache}: CLS ${cls.toFixed(5)}`);
      assert(evidence.mainVisible, 'Main content must remain visible');
      assert.equal(evidence.mode, mode, 'Saved display mode must survive navigation');
      assert(cls <= 0.10, `CLS ${cls} exceeds 0.10: ${url} ${mode} ${width} ${cache}`);
      assert.equal(evidence.errors.length, 0, JSON.stringify(evidence.errors));
      if (url === '/home.html') {
        assert.equal(evidence.pulseGames.length, 2);
        if (cache === 'warm') assert(evidence.pulseGames.every(href => !previousPulseGames.includes(href)), 'The next visit must rotate both Archive Pulse picks without a late visible update');
        previousPulseGames = evidence.pulseGames;
      }
    }
    // Exercise the real controls after recording loading metrics.
    if (width >= 1200) {
      const toggle = page.locator('[data-ccg-more-toggle]');
      await toggle.click();
      const first = page.locator('[data-ccg-more-menu] a').first();
      await first.waitFor({ state: 'visible' });
      const handle = await first.elementHandle();
      await page.evaluate(() => dispatchEvent(new Event('resize')));
      await page.waitForTimeout(100);
      assert(await handle.evaluate(node => node.isConnected), 'An unchanged refit must preserve focused menu links');
      await page.setViewportSize({ width, height: 400 });
      await page.waitForFunction(() => {
        const box = document.querySelector("[data-ccg-more-menu]").getBoundingClientRect();
        return box.y >= 0 && box.bottom <= innerHeight;
      }, null, { timeout: 2000 });
      const menuBox = await page.locator('[data-ccg-more-menu]').boundingBox();
      assert(menuBox && menuBox.y >= 0 && menuBox.y + menuBox.height <= 400, 'Height-only resize must reposition the open More menu inside the viewport');
      assert(await handle.evaluate(node => node.isConnected), 'Height-only resize must retain menu links');
      await page.keyboard.press('Escape');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      await page.setViewportSize({ width, height: 900 });
    } else if (width < 960) {
      const navToggle = page.locator('[data-ccg-nav-toggle]');
      await page.waitForFunction(() =>
        document.querySelector('[data-ccg-nav-toggle]')?.dataset.ccgNavToggleBound === 'true',
        null,
        { timeout: 3000 }
      );
      await navToggle.click();
      await page.waitForTimeout(180);
      const navState = await page.evaluate(() => {
        const header = document.querySelector('[data-ccg-header]');
        const toggle = document.querySelector('[data-ccg-nav-toggle]');
        const drawer = document.querySelector('[data-ccg-nav-drawer]');
        const panel = drawer?.querySelector('.ccg-nav-drawer__panel');
        const panelStyle = panel ? getComputedStyle(panel) : null;
        const drawerStyle = drawer ? getComputedStyle(drawer) : null;
        return {
          expanded: toggle?.getAttribute('aria-expanded'),
          drawerHidden: drawer?.getAttribute('aria-hidden'),
          headerClass: header?.className || '',
          drawerDisplay: drawerStyle?.display || '',
          drawerOpacity: drawerStyle?.opacity || '',
          drawerPointerEvents: drawerStyle?.pointerEvents || '',
          panelDisplay: panelStyle?.display || '',
          panelVisibility: panelStyle?.visibility || '',
          panelTransform: panelStyle?.transform || '',
          panelRect: panel?.getBoundingClientRect().toJSON?.() || null
        };
      });
      assert.equal(navState.expanded, 'true', `Mobile Menu toggle did not expand: ${JSON.stringify(navState)}`);
      assert.equal(navState.drawerHidden, 'false', `Mobile navigation drawer stayed aria-hidden: ${JSON.stringify(navState)}`);
      assert(navState.headerClass.includes('ccg-header--nav-open'), `Mobile navigation header state did not open: ${JSON.stringify(navState)}`);
      await page.locator('.ccg-nav-drawer__panel').waitFor({ state: 'visible', timeout: 3000 });
      await page.keyboard.press('Escape');
    }
    await page.keyboard.press('Control+k');
    await page.locator('.ccg-global-search__input').waitFor({ state: 'visible' });
    await page.locator('.ccg-global-search__input').fill('commando');
    await page.locator('.ccg-global-search__result').first().waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-ccg-global-search-trigger]').count(), 1);
    assert.equal(await page.locator('.ccg-auth-slot').count(), 1);
    if (url.includes('/games/')) {
      assert(await page.locator('#gameHeroTitle').innerText());
      assert.equal(await page.locator('#game-video-embed').getAttribute('src'), null, 'Video must remain deferred');
    }
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
console.log(`Qualified ${results.length} cold/warm page, mode and viewport measurements.`);
