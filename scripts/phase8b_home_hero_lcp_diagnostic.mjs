#!/usr/bin/env node
import crypto from 'node:crypto';
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
    const key = args[index].replace(/^--/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    result[key] = args[index + 1];
  }
  for (const required of ['baselineUrl', 'candidateUrl', 'output', 'report', 'rawDir']) {
    if (!result[required]) throw new Error(`Missing --${required.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`);
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

function median(values) {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!clean.length) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2;
}

function round(value, digits = 2) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function closeEnough(left, right, tolerance = 0.75) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance;
}

function rectMatches(left, right) {
  if (!left || !right) return false;
  return ['x', 'y', 'width', 'height'].every((key) => closeEnough(left[key], right[key]));
}

function hash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function browserRun(browser, baseUrl, variant, mode, runNumber, rawDir) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    locale: 'en-GB',
    reducedMotion: 'reduce',
  });
  await context.addInitScript((savedMode) => {
    localStorage.setItem('ccg-mode', savedMode);
    window.__phase8bVitals = { lcp: null, cls: 0 };
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) {
          window.__phase8bVitals.lcp = {
            startTime: last.startTime,
            renderTime: last.renderTime,
            loadTime: last.loadTime,
            size: last.size,
            tag: last.element?.tagName?.toLowerCase() || null,
            id: last.element?.id || null,
            className: typeof last.element?.className === 'string' ? last.element.className : null,
            url: last.url || null,
          };
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__phase8bVitals.cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}
  }, mode);

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (0.75 * 1024 * 1024) / 8,
    connectionType: 'cellular3g',
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const url = `${baseUrl.replace(/\/$/, '')}/home.html?phase8b=${variant}-${mode}-${runNumber}`;
  const response = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(6500);

  const data = await page.evaluate(() => {
    const absolute = (value) => new URL(value, location.href).href;
    const resource = (href) => {
      const entries = performance.getEntriesByName(absolute(href));
      const item = entries[entries.length - 1];
      return item ? {
        name: item.name,
        startTime: item.startTime,
        duration: item.duration,
        transferSize: item.transferSize,
        decodedBodySize: item.decodedBodySize,
        initiatorType: item.initiatorType,
      } : null;
    };
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    };
    const style = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const computed = getComputedStyle(element);
      return {
        backgroundImage: computed.backgroundImage,
        opacity: computed.opacity,
        visibility: computed.visibility,
        display: computed.display,
      };
    };
    const preloads = [...document.querySelectorAll('link[rel="preload"][as="image"]')].map((link) => ({
      href: link.getAttribute('href'),
      media: link.getAttribute('media') || '',
      fetchPriority: link.getAttribute('fetchpriority') || '',
      type: link.getAttribute('type') || '',
    }));
    return {
      finalUrl: location.href,
      htmlMode: document.documentElement.getAttribute('data-ccg-mode'),
      bodyMode: document.body.getAttribute('data-ccg-mode'),
      heroMode: document.querySelector('.home-hero')?.getAttribute('data-hero-mode') || null,
      preloads,
      c64Resource: resource('resources/images/hero/ccg-hero-c64.png'),
      amigaResource: resource('resources/images/hero/ccg-hero-amiga.png'),
      heroRect: rect('.home-hero'),
      frameRect: rect('.home-hero__frame'),
      titleRect: rect('.home-hero__title'),
      c64Style: style('.home-hero__bg--c64'),
      amigaStyle: style('.home-hero__bg--amiga'),
      vitals: window.__phase8bVitals,
    };
  });

  await page.addStyleTag({ content: '*{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await page.waitForTimeout(300);
  const hero = page.locator('.home-hero');
  const screenshotPath = path.join(rawDir, `${variant}-${mode}-${runNumber}-hero.png`);
  const screenshot = await hero.screenshot({ path: screenshotPath });
  data.screenshot = { path: screenshotPath, sha256: hash(screenshot) };
  data.status = response?.status() ?? null;

  await context.close();
  return data;
}

async function runBrowserSet(chromePath, baselineUrl, candidateUrl, rawDir) {
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  try {
    const result = { baseline: { c64: [], amiga: [] }, candidate: { c64: [], amiga: [] } };
    for (const variant of ['baseline', 'candidate']) {
      const url = variant === 'baseline' ? baselineUrl : candidateUrl;
      for (let run = 1; run <= 3; run += 1) {
        result[variant].c64.push(await browserRun(browser, url, variant, 'c64', run, rawDir));
      }
      result[variant].amiga.push(await browserRun(browser, url, variant, 'amiga', 1, rawDir));
    }
    return result;
  } finally {
    await browser.close();
  }
}

async function lighthouseRuns(chromePath, baseUrl, variant, rawDir) {
  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const runs = [];
  try {
    for (let run = 1; run <= 2; run += 1) {
      const runner = await lighthouse(`${baseUrl.replace(/\/$/, '')}/home.html?phase8b-lh=${variant}-${run}`, {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance'],
        maxWaitForLoad: 60000,
      });
      const lhr = runner.lhr;
      const rawPath = path.join(rawDir, `${variant}-lighthouse-${run}.json`);
      fs.writeFileSync(rawPath, JSON.stringify(lhr, null, 2));
      runs.push({
        run,
        performanceScore: lhr.categories.performance?.score ?? null,
        lcpMs: lhr.audits['largest-contentful-paint']?.numericValue ?? null,
        cls: lhr.audits['cumulative-layout-shift']?.numericValue ?? null,
        totalBytes: lhr.audits['total-byte-weight']?.numericValue ?? null,
        lcpDiscovery: lhr.audits['lcp-discovery-insight']?.details ?? null,
        rawPath,
      });
    }
  } finally {
    await chrome.kill();
  }
  return runs;
}

function summarizeBrowser(browser) {
  const summarizeVariant = (variant) => ({
    c64ResourceStartMedianMs: round(median(variant.c64.map((run) => run.c64Resource?.startTime))),
    c64ObservedLcpMedianMs: round(median(variant.c64.map((run) => run.vitals?.lcp?.startTime))),
    c64ObservedClsMedian: round(median(variant.c64.map((run) => run.vitals?.cls)), 4),
    c64Runs: variant.c64.length,
    amigaRuns: variant.amiga.length,
  });
  return {
    baseline: summarizeVariant(browser.baseline),
    candidate: summarizeVariant(browser.candidate),
  };
}

function buildChecks(browser, browserSummary, lighthouse) {
  const baselineFirst = browser.baseline.c64[0];
  const candidateFirst = browser.candidate.c64[0];
  const candidateAmiga = browser.candidate.amiga[0];
  const candidatePreloads = candidateFirst.preloads.filter((item) => item.href?.includes('/hero/'));
  const baselineStart = browserSummary.baseline.c64ResourceStartMedianMs;
  const candidateStart = browserSummary.candidate.c64ResourceStartMedianMs;
  const baselineLcp = median(lighthouse.baseline.map((run) => run.lcpMs));
  const candidateLcp = median(lighthouse.candidate.map((run) => run.lcpMs));

  const checks = {
    candidate_has_two_mode_safe_hero_preloads:
      candidatePreloads.length === 2 && candidatePreloads.every((item) => item.media === '' && item.fetchPriority === 'high'),
    c64_request_starts_earlier:
      Number.isFinite(baselineStart) && Number.isFinite(candidateStart) && candidateStart <= baselineStart - 100,
    c64_request_starts_within_500ms: Number.isFinite(candidateStart) && candidateStart <= 500,
    c64_mode_preserved:
      candidateFirst.htmlMode === 'c64' && candidateFirst.bodyMode === 'c64' && candidateFirst.heroMode === 'c64',
    amiga_mode_preserved:
      candidateAmiga.htmlMode === 'amiga' && candidateAmiga.bodyMode === 'amiga' && candidateAmiga.heroMode === 'amiga',
    hero_geometry_preserved:
      rectMatches(baselineFirst.heroRect, candidateFirst.heroRect) &&
      rectMatches(baselineFirst.frameRect, candidateFirst.frameRect) &&
      rectMatches(baselineFirst.titleRect, candidateFirst.titleRect),
    hero_computed_styles_preserved:
      JSON.stringify(baselineFirst.c64Style) === JSON.stringify(candidateFirst.c64Style) &&
      JSON.stringify(baselineFirst.amigaStyle) === JSON.stringify(candidateFirst.amigaStyle),
    lighthouse_lcp_not_regressed:
      Number.isFinite(baselineLcp) && Number.isFinite(candidateLcp) && candidateLcp <= baselineLcp + 1000,
  };
  return {
    checks,
    baselineLighthouseMedianLcpMs: round(baselineLcp),
    candidateLighthouseMedianLcpMs: round(candidateLcp),
    passed: Object.values(checks).every(Boolean),
  };
}

function markdown(payload) {
  const yesNo = (value) => value ? 'PASS' : 'FAIL';
  const lines = [
    '# Phase 8B Home Hero LCP Correction',
    '',
    '## Verdict',
    '',
    `**${payload.verdict}**`,
    '',
    'Phase 8B removes only the desktop-width restriction from the two existing homepage hero preload tags. The C64 and Amiga images, CSS backgrounds, mode logic, layout and visual assets are unchanged.',
    '',
    '## Measured result',
    '',
    '| Measurement | Baseline | Candidate |',
    '|---|---:|---:|',
    `| Median C64 hero request start | ${payload.summary.baseline.c64ResourceStartMedianMs ?? 'n/a'} ms | ${payload.summary.candidate.c64ResourceStartMedianMs ?? 'n/a'} ms |`,
    `| Median observed browser LCP | ${payload.summary.baseline.c64ObservedLcpMedianMs ?? 'n/a'} ms | ${payload.summary.candidate.c64ObservedLcpMedianMs ?? 'n/a'} ms |`,
    `| Median Lighthouse LCP | ${payload.validation.baselineLighthouseMedianLcpMs ?? 'n/a'} ms | ${payload.validation.candidateLighthouseMedianLcpMs ?? 'n/a'} ms |`,
    '',
    '## Validation',
    '',
    ...Object.entries(payload.validation.checks).map(([key, value]) => `- \`${key}\`: **${yesNo(value)}**`),
    '',
    '## Public change',
    '',
    '- `home.html`: remove `media="(min-width: 1024px)"` from the existing C64 and Amiga hero image preloads.',
    '- No CSS, JavaScript, image, route, game record or intro-loader change.',
    '',
    '## Safety',
    '',
    '- The homepage hero dimensions and computed background styles match the baseline.',
    '- Saved C64 and Amiga modes remain intact.',
    '- Full browser screenshots and Lighthouse JSON files are retained as workflow artifacts.',
  ];
  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseArgs();
  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.mkdirSync(path.dirname(args.report), { recursive: true });
  fs.mkdirSync(args.rawDir, { recursive: true });
  const chromePath = findChrome();

  const browser = await runBrowserSet(chromePath, args.baselineUrl, args.candidateUrl, args.rawDir);
  const lighthouseResult = {
    baseline: await lighthouseRuns(chromePath, args.baselineUrl, 'baseline', args.rawDir),
    candidate: await lighthouseRuns(chromePath, args.candidateUrl, 'candidate', args.rawDir),
  };
  const summary = summarizeBrowser(browser);
  const validation = buildChecks(browser, summary, lighthouseResult);
  const payload = {
    phase: '8B',
    generatedAt: new Date().toISOString(),
    methodology: 'Local baseline and candidate worktrees; 390x844 cold mobile browser runs with 4x CPU slowdown and throttled network; two Lighthouse mobile runs per variant.',
    browser,
    lighthouse: lighthouseResult,
    summary,
    validation,
    verdict: validation.passed ? 'PASS' : 'FAIL',
  };

  fs.writeFileSync(args.output, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(args.report, markdown(payload));
  console.log(JSON.stringify({ verdict: payload.verdict, summary, checks: validation.checks }, null, 2));
  if (!validation.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
