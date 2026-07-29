#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';
import axe from 'axe-core';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    result[args[index].replace(/^--/, '')] = args[index + 1];
  }
  if (!result.output || !result.rawDir) {
    throw new Error('Usage: --output FILE --raw-dir DIR');
  }
  return result;
}

const ROUTES = [
  { label: 'Entry', url: 'https://www.cheekycommodoregamer.co.uk/' },
  { label: 'Home', url: 'https://www.cheekycommodoregamer.co.uk/home.html' },
  { label: 'Games', url: 'https://www.cheekycommodoregamer.co.uk/games/' },
  { label: 'Game: Zeewolf', url: 'https://www.cheekycommodoregamer.co.uk/games/zeewolf/' },
  { label: 'Genres', url: 'https://www.cheekycommodoregamer.co.uk/games/genres/' },
  { label: 'Publishers', url: 'https://www.cheekycommodoregamer.co.uk/games/publishers/' },
  { label: 'Music', url: 'https://www.cheekycommodoregamer.co.uk/music/' },
  { label: 'Quiz', url: 'https://www.cheekycommodoregamer.co.uk/quiz/quiz.html' },
];

const LIGHTHOUSE_RUNS = [
  ...ROUTES
    .filter((route) => ['Home', 'Games', 'Game: Zeewolf', 'Genres', 'Quiz'].includes(route.label))
    .map((route) => ({ ...route, mode: 'mobile' })),
  ...ROUTES
    .filter((route) => ['Home', 'Games'].includes(route.label))
    .map((route) => ({ ...route, mode: 'desktop' })),
];

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
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function display(audit) {
  return audit?.displayValue ?? (audit?.numericValue == null ? 'n/a' : String(audit.numericValue));
}

async function runAxe(chromePath, errors) {
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const results = [];
  try {
    for (const route of ROUTES) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      try {
        const response = await page.goto(route.url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(1500);
        await page.addScriptTag({ content: axe.source });
        const axeResult = await page.evaluate(async () => window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
          resultTypes: ['violations', 'incomplete'],
        }));
        const topViolations = axeResult.violations
          .map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            help: violation.help,
            helpUrl: violation.helpUrl,
            nodeCount: violation.nodes.length,
            samples: violation.nodes.slice(0, 5).map((node) => ({
              target: node.target,
              failureSummary: node.failureSummary,
            })),
          }))
          .sort((left, right) => right.nodeCount - left.nodeCount);
        const seriousOrCriticalNodes = topViolations
          .filter((violation) => ['serious', 'critical'].includes(violation.impact))
          .reduce((sum, violation) => sum + violation.nodeCount, 0);
        results.push({
          label: route.label,
          requested_url: route.url,
          final_url: page.url(),
          status: response?.status() ?? null,
          violation_count: axeResult.violations.length,
          affected_nodes: axeResult.violations.reduce((sum, violation) => sum + violation.nodes.length, 0),
          serious_or_critical_nodes: seriousOrCriticalNodes,
          incomplete_count: axeResult.incomplete.length,
          top_violations: topViolations,
        });
      } catch (error) {
        errors.push(`axe ${route.label}: ${error.message}`);
        results.push({
          label: route.label,
          requested_url: route.url,
          error: error.message,
          violation_count: 0,
          affected_nodes: 0,
          serious_or_critical_nodes: 0,
          top_violations: [],
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}

async function runLighthouse(chromePath, rawDir, errors) {
  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const results = [];
  try {
    for (const item of LIGHTHOUSE_RUNS) {
      try {
        const desktop = item.mode === 'desktop';
        const flags = {
          port: chrome.port,
          output: 'json',
          logLevel: 'error',
          onlyCategories: ['performance', 'accessibility'],
          formFactor: desktop ? 'desktop' : 'mobile',
          screenEmulation: desktop
            ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
            : { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false },
          throttlingMethod: 'simulate',
          maxWaitForLoad: 60000,
        };
        const runner = await lighthouse(item.url, flags);
        const lhr = runner.lhr;
        const rawPath = path.join(rawDir, `${slug(item.label)}-${item.mode}.json`);
        fs.writeFileSync(rawPath, JSON.stringify(lhr, null, 2));
        const audits = lhr.audits;
        results.push({
          label: item.label,
          mode: item.mode,
          requested_url: item.url,
          final_url: lhr.finalDisplayedUrl || lhr.finalUrl,
          performance_score: lhr.categories.performance?.score ?? null,
          accessibility_score: lhr.categories.accessibility?.score ?? null,
          fcp_display: display(audits['first-contentful-paint']),
          lcp_display: display(audits['largest-contentful-paint']),
          cls_display: display(audits['cumulative-layout-shift']),
          tbt_display: display(audits['total-blocking-time']),
          speed_index_display: display(audits['speed-index']),
          total_bytes_display: display(audits['total-byte-weight']),
          numeric: {
            fcp_ms: audits['first-contentful-paint']?.numericValue ?? null,
            lcp_ms: audits['largest-contentful-paint']?.numericValue ?? null,
            cls: audits['cumulative-layout-shift']?.numericValue ?? null,
            tbt_ms: audits['total-blocking-time']?.numericValue ?? null,
            total_bytes: audits['total-byte-weight']?.numericValue ?? null,
          },
          opportunities: [
            'render-blocking-resources',
            'unused-css-rules',
            'unused-javascript',
            'offscreen-images',
            'uses-responsive-images',
            'unsized-images',
            'font-display',
            'third-party-summary',
            'mainthread-work-breakdown',
          ].map((id) => ({
            id,
            score: audits[id]?.score ?? null,
            displayValue: audits[id]?.displayValue ?? null,
            details: audits[id]?.details?.summary ?? null,
          })),
          raw_file: rawPath,
        });
      } catch (error) {
        errors.push(`lighthouse ${item.label} ${item.mode}: ${error.message}`);
        results.push({
          label: item.label,
          mode: item.mode,
          requested_url: item.url,
          error: error.message,
          performance_score: null,
          accessibility_score: null,
        });
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
  const errors = [];
  const chromePath = findChrome();
  const axeResults = await runAxe(chromePath, errors);
  const lighthouseResults = await runLighthouse(chromePath, args.rawDir, errors);
  const payload = {
    generated_at: new Date().toISOString(),
    chrome_path: chromePath,
    axe_version: axe.version,
    routes: ROUTES,
    axe: axeResults,
    lighthouse: lighthouseResults,
    errors,
  };
  fs.writeFileSync(args.output, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify({
    axe_routes: axeResults.length,
    lighthouse_runs: lighthouseResults.length,
    errors,
  }, null, 2));
  if (axeResults.every((item) => item.error) || lighthouseResults.every((item) => item.error)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
