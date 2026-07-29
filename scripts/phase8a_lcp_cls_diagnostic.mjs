#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]
      .replace(/^--/, '')
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    result[key] = args[index + 1];
  }
  if (!result.output || !result.rawDir) {
    throw new Error('Usage: --output FILE --raw-dir DIR');
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

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectGameRoutes() {
  const root = process.cwd();
  const games = JSON.parse(fs.readFileSync(path.join(root, 'games/games.json'), 'utf8'));
  const candidates = games
    .filter((game) => game && game.slug && ['C64', 'AMIGA'].includes(String(game.system).toUpperCase()))
    .map((game) => {
      const thumbnail = String(game.thumbnail || '').replace(/^\/+/, '');
      const full = path.join(root, thumbnail);
      let thumbnailBytes = 0;
      try {
        if (thumbnail && fs.statSync(full).isFile()) thumbnailBytes = fs.statSync(full).size;
      } catch (_) {
        thumbnailBytes = 0;
      }
      return {
        slug: game.slug,
        title: game.title || game.slug,
        system: String(game.system).toUpperCase(),
        thumbnail,
        thumbnail_bytes: thumbnailBytes,
      };
    })
    .filter((game) => game.thumbnail_bytes > 0);

  const selected = [];
  const zeewolf = candidates.find((game) => game.slug === 'zeewolf');
  if (zeewolf) selected.push({ ...zeewolf, selection: 'fixed baseline' });

  for (const system of ['C64', 'AMIGA']) {
    const systemGames = candidates
      .filter((game) => game.system === system && game.slug !== 'zeewolf')
      .sort((left, right) => left.thumbnail_bytes - right.thumbnail_bytes || left.slug.localeCompare(right.slug));
    if (!systemGames.length) continue;
    const median = systemGames[Math.floor((systemGames.length - 1) / 2)];
    const largest = systemGames[systemGames.length - 1];
    selected.push({ ...median, selection: `${system} median thumbnail` });
    selected.push({ ...largest, selection: `${system} largest thumbnail` });
  }

  return uniqueBy(selected, (game) => game.slug).map((game) => ({
    label: `Game: ${game.title}`,
    url: `https://www.cheekycommodoregamer.co.uk/games/${game.slug}/`,
    audit_url: `https://www.cheekycommodoregamer.co.uk/games/game.html?id=${encodeURIComponent(game.slug)}`,
    family: 'game',
    metadata: game,
  }));
}

function buildRoutes() {
  const core = [
    { label: 'Home', url: 'https://www.cheekycommodoregamer.co.uk/home.html', family: 'home' },
    { label: 'Games', url: 'https://www.cheekycommodoregamer.co.uk/games/', family: 'archive' },
    { label: 'Genres', url: 'https://www.cheekycommodoregamer.co.uk/games/genres/', family: 'archive' },
    { label: 'Quiz', url: 'https://www.cheekycommodoregamer.co.uk/quiz/quiz.html', family: 'utility' },
  ];
  return [...core, ...selectGameRoutes()];
}

function compact(value, depth = 0) {
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (depth >= 7) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => compact(item, depth + 1));
  if (typeof value === 'object') {
    const allowed = [
      'type', 'url', 'label', 'description', 'displayValue', 'numericValue', 'score', 'value',
      'phase', 'subpart', 'cause', 'priorityHinted', 'requestDiscoverable', 'eagerlyLoaded', 'extra', 'nodeLabel', 'boundingRect', 'lhId', 'key', 'timing', 'wastedBytes', 'wastedMs', 'totalBytes', 'transferSize', 'resourceSize',
      'duration', 'startTime', 'endTime', 'requestStartTime', 'node', 'source', 'selector', 'snippet',
      'path', 'protocol', 'origin', 'entity', 'subItems', 'items', 'headings', 'debugData',
    ];
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (allowed.includes(key) || depth === 0) output[key] = compact(item, depth + 1);
    }
    return output;
  }
  return String(value);
}

function summarizeAudit(audit) {
  if (!audit) return null;
  return {
    id: audit.id,
    title: audit.title,
    score: audit.score,
    display_value: audit.displayValue ?? null,
    numeric_value: audit.numericValue ?? null,
    details: compact(audit.details ?? null),
  };
}

const INIT_OBSERVERS = `(() => {
  const state = { lcp: [], shifts: [], errors: [] };
  const rect = (value) => value ? {
    x: Math.round(value.x || 0), y: Math.round(value.y || 0),
    width: Math.round(value.width || 0), height: Math.round(value.height || 0)
  } : null;
  const describe = (node) => {
    if (!node || node.nodeType !== 1) return null;
    const classes = Array.from(node.classList || []).slice(0, 5);
    let selector = String(node.tagName || '').toLowerCase();
    if (node.id) selector += '#' + node.id;
    else if (classes.length) selector += '.' + classes.join('.');
    const bounds = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
    return {
      selector,
      tag: String(node.tagName || '').toLowerCase(),
      id: node.id || '',
      classes,
      text: String(node.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 180),
      src: node.currentSrc || node.src || node.getAttribute?.('src') || '',
      href: node.href || node.getAttribute?.('href') || '',
      loading: node.loading || node.getAttribute?.('loading') || '',
      fetch_priority: node.fetchPriority || node.getAttribute?.('fetchpriority') || '',
      width_attribute: node.getAttribute?.('width') || '',
      height_attribute: node.getAttribute?.('height') || '',
      natural_width: Number(node.naturalWidth || 0),
      natural_height: Number(node.naturalHeight || 0),
      complete: typeof node.complete === 'boolean' ? node.complete : null,
      rect: rect(bounds),
      outer_html: String(node.outerHTML || '').replace(/\\s+/g, ' ').slice(0, 500),
    };
  };
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.lcp.push({
          start_time: entry.startTime,
          render_time: entry.renderTime,
          load_time: entry.loadTime,
          size: entry.size,
          url: entry.url || '',
          id: entry.id || '',
          element: describe(entry.element),
        });
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (error) { state.errors.push('lcp observer: ' + error.message); }
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.shifts.push({
          start_time: entry.startTime,
          value: entry.value,
          had_recent_input: entry.hadRecentInput,
          sources: (entry.sources || []).map((source) => ({
            node: describe(source.node),
            previous_rect: rect(source.previousRect),
            current_rect: rect(source.currentRect),
          })),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (error) { state.errors.push('layout observer: ' + error.message); }
  window.__phase8a = state;
})();`;

async function runBrowserDiagnostic(chromePath, routes, rawDir) {
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const results = [];
  try {
    for (const route of routes) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 10; Phase8A) AppleWebKit/537.36 Chrome/150 Mobile Safari/537.36',
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      const consoleErrors = [];
      const requestFailures = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 500));
      });
      page.on('requestfailed', (request) => {
        requestFailures.push({ url: request.url(), type: request.resourceType(), failure: request.failure()?.errorText || '' });
      });
      await page.addInitScript({ content: INIT_OBSERVERS });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: Math.floor((1.6 * 1024 * 1024) / 8),
        uploadThroughput: Math.floor((750 * 1024) / 8),
        connectionType: 'cellular3g',
      });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

      const started = Date.now();
      try {
        const testedUrl = route.audit_url || route.url;
        const response = await page.goto(testedUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
        await page.evaluate(() => document.fonts?.ready).catch(() => {});
        await page.waitForTimeout(10000);
        const data = await page.evaluate(() => {
          const resources = performance.getEntriesByType('resource').map((entry) => ({
            name: entry.name,
            initiator_type: entry.initiatorType,
            start_time: entry.startTime,
            duration: entry.duration,
            fetch_start: entry.fetchStart,
            request_start: entry.requestStart,
            response_start: entry.responseStart,
            response_end: entry.responseEnd,
            transfer_size: entry.transferSize,
            encoded_body_size: entry.encodedBodySize,
            decoded_body_size: entry.decodedBodySize,
            protocol: entry.nextHopProtocol,
            render_blocking_status: entry.renderBlockingStatus || '',
          }));
          const navigation = performance.getEntriesByType('navigation')[0];
          return {
            observer: window.__phase8a || { lcp: [], shifts: [], errors: ['observer missing'] },
            resources,
            navigation: navigation ? {
              start_time: navigation.startTime,
              domain_lookup_start: navigation.domainLookupStart,
              connect_start: navigation.connectStart,
              request_start: navigation.requestStart,
              response_start: navigation.responseStart,
              response_end: navigation.responseEnd,
              dom_content_loaded: navigation.domContentLoadedEventEnd,
              load_event_end: navigation.loadEventEnd,
              transfer_size: navigation.transferSize,
              encoded_body_size: navigation.encodedBodySize,
              decoded_body_size: navigation.decodedBodySize,
            } : null,
            document: {
              title: document.title,
              ready_state: document.readyState,
              scroll_height: document.documentElement.scrollHeight,
              body_classes: Array.from(document.body?.classList || []),
            },
          };
        });
        const validShifts = (data.observer.shifts || []).filter((entry) => !entry.had_recent_input);
        const cls = validShifts.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
        const latestLcp = (data.observer.lcp || []).at(-1) || null;
        const resourcesByDuration = [...data.resources]
          .sort((left, right) => right.duration - left.duration)
          .slice(0, 20);
        const resourcesByTransfer = [...data.resources]
          .sort((left, right) => right.transfer_size - left.transfer_size)
          .slice(0, 20);
        const lcpResource = latestLcp?.url
          ? data.resources.find((resource) => resource.name === latestLcp.url) || null
          : latestLcp?.element?.src
            ? data.resources.find((resource) => resource.name === latestLcp.element.src) || null
            : null;
        const shiftSources = new Map();
        for (const shift of validShifts) {
          for (const source of shift.sources || []) {
            const selector = source.node?.selector || '[unknown]';
            const current = shiftSources.get(selector) || { selector, total_value: 0, occurrences: 0, sample: source };
            current.total_value += Number(shift.value || 0);
            current.occurrences += 1;
            shiftSources.set(selector, current);
          }
        }
        await page.screenshot({ path: path.join(rawDir, `${slug(route.label)}-mobile.png`), fullPage: true });
        results.push({
          ...route,
          status: response?.status() ?? null,
          tested_url: testedUrl,
          final_url: page.url(),
          elapsed_ms: Date.now() - started,
          lcp: latestLcp,
          lcp_history: data.observer.lcp || [],
          lcp_resource: lcpResource,
          cls,
          layout_shifts: validShifts.sort((left, right) => right.value - left.value).slice(0, 20),
          shift_sources: [...shiftSources.values()].sort((left, right) => right.total_value - left.total_value).slice(0, 20),
          navigation: data.navigation,
          resources_by_duration: resourcesByDuration,
          resources_by_transfer: resourcesByTransfer,
          resource_count: data.resources.length,
          transferred_bytes_observed: data.resources.reduce((sum, item) => sum + Number(item.transfer_size || 0), 0),
          console_errors: consoleErrors.slice(0, 20),
          request_failures: requestFailures.slice(0, 20),
          observer_errors: data.observer.errors || [],
          document: data.document,
          screenshot: `${slug(route.label)}-mobile.png`,
        });
      } catch (error) {
        results.push({
          ...route,
          error: `${error.name}: ${error.message}`,
          final_url: page.url(),
          elapsed_ms: Date.now() - started,
          console_errors: consoleErrors.slice(0, 20),
          request_failures: requestFailures.slice(0, 20),
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}

async function runLighthouse(chromePath, routes, rawDir) {
  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const results = [];
  const auditIds = [
    'largest-contentful-paint-element',
    'lcp-breakdown-insight',
    'lcp-discovery-insight',
    'cls-culprits-insight',
    'render-blocking-insight',
    'image-delivery-insight',
    'network-dependency-tree-insight',
    'third-parties-insight',
    'network-requests',
    'server-response-time',
    'uses-responsive-images',
    'offscreen-images',
    'unsized-images',
    'font-display',
    'unused-css-rules',
    'unused-javascript',
  ];
  try {
    for (const route of routes) {
      try {
        const testedUrl = route.audit_url || route.url;
        const runner = await lighthouse(testedUrl, {
          port: chrome.port,
          output: 'json',
          logLevel: 'error',
          onlyCategories: ['performance'],
          maxWaitForLoad: 90000,
        });
        const lhr = runner.lhr;
        const rawFile = `${slug(route.label)}-lighthouse-mobile.json`;
        fs.writeFileSync(path.join(rawDir, rawFile), JSON.stringify(lhr, null, 2));
        const audits = lhr.audits;
        results.push({
          ...route,
          tested_url: testedUrl,
          final_url: lhr.finalDisplayedUrl || lhr.finalUrl,
          performance_score: lhr.categories.performance?.score ?? null,
          metrics: {
            fcp_ms: audits['first-contentful-paint']?.numericValue ?? null,
            lcp_ms: audits['largest-contentful-paint']?.numericValue ?? null,
            cls: audits['cumulative-layout-shift']?.numericValue ?? null,
            tbt_ms: audits['total-blocking-time']?.numericValue ?? null,
            speed_index_ms: audits['speed-index']?.numericValue ?? null,
            total_bytes: audits['total-byte-weight']?.numericValue ?? null,
          },
          diagnostics: Object.fromEntries(auditIds.map((id) => [id, summarizeAudit(audits[id])])),
          raw_file: rawFile,
        });
      } catch (error) {
        results.push({ ...route, error: `${error.name}: ${error.message}` });
      }
    }
  } finally {
    await chrome.kill();
  }
  return results;
}

async function main() {
  const args = parseArgs();
  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.mkdirSync(args.rawDir, { recursive: true });
  const chromePath = findChrome();
  const routes = buildRoutes();
  const browser = await runBrowserDiagnostic(chromePath, routes, args.rawDir);
  const lighthouseResults = await runLighthouse(chromePath, routes, args.rawDir);
  const payload = {
    phase: '8A',
    generated_at: new Date().toISOString(),
    chrome_path: chromePath,
    methodology: {
      browser_profile: '390x844 mobile, 4x CPU slowdown, 150ms latency, 1.6Mbps down, 750Kbps up, cold cache',
      observation_window_ms_after_load: 10000,
      lighthouse: 'Lighthouse mobile performance defaults, cold run per route',
    },
    routes,
    browser,
    lighthouse: lighthouseResults,
  };
  fs.writeFileSync(args.output, `${JSON.stringify(payload, null, 2)}\n`);
  const failures = [...browser, ...lighthouseResults].filter((item) => item.error);
  console.log(JSON.stringify({ routes: routes.length, browser_runs: browser.length, lighthouse_runs: lighthouseResults.length, failures }, null, 2));
  if (browser.every((item) => item.error) || lighthouseResults.every((item) => item.error)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
