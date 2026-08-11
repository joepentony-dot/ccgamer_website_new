#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_HOSTS = new Set(['cheekycommodoregamer.co.uk', 'www.cheekycommodoregamer.co.uk']);
const SOURCE_FILES = [
  'games/games.json',
  'data/retro-specials.json',
  'data/retro-events.json',
  'data/amiga-demo-music.json',
  'data/zzap64-review-links.json',
];
const YOUTUBE_KEYS = new Set(['videoid', 'video_id', 'youtubeid', 'youtube_id']);
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_CONCURRENCY = 6;
const USER_AGENT = 'Mozilla/5.0 (compatible; CCG-Link-Health/1.0; +https://www.cheekycommodoregamer.co.uk/)';

function parseArgs(argv) {
  const args = { json: '', markdown: '', limit: 0, concurrency: DEFAULT_CONCURRENCY };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--json') args.json = argv[++i] || '';
    else if (token === '--markdown') args.markdown = argv[++i] || '';
    else if (token === '--limit') args.limit = Math.max(0, Number(argv[++i]) || 0);
    else if (token === '--concurrency') args.concurrency = Math.max(1, Math.min(12, Number(argv[++i]) || DEFAULT_CONCURRENCY));
  }
  return args;
}

function loadJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

function normalizeUrl(value) {
  const url = safeUrl(value);
  if (!url) return '';
  url.hash = '';
  return url.toString();
}

function youtubeIdFromUrl(value) {
  const url = safeUrl(value);
  if (!url) return '';
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (host === 'youtu.be') return /^[A-Za-z0-9_-]{11}$/.test(url.pathname.slice(1).split('/')[0]) ? url.pathname.slice(1).split('/')[0] : '';
  if (!['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) return '';
  const fromQuery = url.searchParams.get('v') || '';
  if (/^[A-Za-z0-9_-]{11}$/.test(fromQuery)) return fromQuery;
  const parts = url.pathname.split('/').filter(Boolean);
  const markerIndex = parts.findIndex((part) => ['embed', 'shorts', 'live'].includes(part));
  const candidate = markerIndex >= 0 ? parts[markerIndex + 1] : '';
  return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : '';
}

function isInternalUrl(value) {
  const url = safeUrl(value);
  return Boolean(url && SITE_HOSTS.has(url.hostname.toLowerCase()));
}

function collectReferences() {
  const map = new Map();

  function add(value, source, kind = 'url') {
    const normalized = normalizeUrl(value);
    if (!normalized || isInternalUrl(normalized)) return;
    if (!map.has(normalized)) {
      map.set(normalized, { url: normalized, kind, sources: [] });
    }
    const record = map.get(normalized);
    if (!record.sources.includes(source)) record.sources.push(source);
  }

  function walk(value, sourcePath, keyName = '') {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^https?:\/\//i.test(trimmed)) add(trimmed, sourcePath, 'url');
      if (YOUTUBE_KEYS.has(String(keyName || '').toLowerCase()) && /^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
        add(`https://www.youtube.com/watch?v=${trimmed}`, sourcePath, 'youtube-id');
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${sourcePath}[${index}]`, keyName));
      return;
    }
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => walk(item, `${sourcePath}.${key}`, key));
    }
  }

  SOURCE_FILES.forEach((relativePath) => {
    const data = loadJson(relativePath);
    if (data !== null) walk(data, relativePath);
  });

  return Array.from(map.values()).sort((a, b) => a.url.localeCompare(b.url));
}

function classifyStatus(status) {
  if (status >= 200 && status < 400) return 'healthy';
  if (status === 404 || status === 410) return 'confirmed-broken-candidate';
  if (status === 401 || status === 403) return 'blocked';
  if (status === 408 || status === 425 || status === 429 || status >= 500) return 'transient';
  if (status >= 400 && status < 500) return 'suspect';
  return 'transient';
}

async function fetchHeaders(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      },
    });
    if (response.body && typeof response.body.cancel === 'function') {
      await response.body.cancel().catch(() => {});
    }
    return { ok: true, status: response.status, finalUrl: response.url || url, error: '' };
  } catch (error) {
    const message = error && error.name === 'AbortError' ? 'timeout' : String(error && error.message ? error.message : error);
    return { ok: false, status: 0, finalUrl: url, error: message };
  } finally {
    clearTimeout(timer);
  }
}

async function checkYoutube(url) {
  const id = youtubeIdFromUrl(url);
  if (!id) return fetchHeaders(url);
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`;
  return fetchHeaders(oembed);
}

async function oneAttempt(url) {
  const id = youtubeIdFromUrl(url);
  const result = id ? await checkYoutube(url) : await fetchHeaders(url);
  const category = result.ok ? classifyStatus(result.status) : 'transient';
  return { ...result, category };
}

async function checkReference(reference) {
  const first = await oneAttempt(reference.url);
  if (first.category !== 'confirmed-broken-candidate') {
    return { ...reference, ...first, category: first.category, attempts: 1 };
  }

  await new Promise((resolve) => setTimeout(resolve, 600));
  const second = await oneAttempt(reference.url);
  const confirmed = second.category === 'confirmed-broken-candidate';
  return {
    ...reference,
    ...second,
    category: confirmed ? 'confirmed-broken' : 'unstable',
    attempts: 2,
    firstStatus: first.status,
  };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function runner() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runner()));
  return results;
}

function summarize(results) {
  const summary = {
    total: results.length,
    healthy: 0,
    confirmedBroken: 0,
    blocked: 0,
    transient: 0,
    suspect: 0,
    unstable: 0,
  };
  const byHost = {};

  results.forEach((result) => {
    if (result.category === 'healthy') summary.healthy += 1;
    else if (result.category === 'confirmed-broken') summary.confirmedBroken += 1;
    else if (result.category === 'blocked') summary.blocked += 1;
    else if (result.category === 'transient') summary.transient += 1;
    else if (result.category === 'suspect') summary.suspect += 1;
    else if (result.category === 'unstable') summary.unstable += 1;

    const host = safeUrl(result.url)?.hostname || 'invalid';
    byHost[host] ||= { total: 0, healthy: 0, confirmedBroken: 0, other: 0 };
    byHost[host].total += 1;
    if (result.category === 'healthy') byHost[host].healthy += 1;
    else if (result.category === 'confirmed-broken') byHost[host].confirmedBroken += 1;
    else byHost[host].other += 1;
  });

  return { summary, byHost };
}

function markdownReport(report) {
  const lines = [
    '# CCG external-link health',
    '',
    `Checked: ${report.checkedAt}`,
    '',
    `- Total unique external references: **${report.summary.total}**`,
    `- Healthy: **${report.summary.healthy}**`,
    `- Confirmed broken (404/410 twice): **${report.summary.confirmedBroken}**`,
    `- Blocked/unverifiable (401/403): **${report.summary.blocked}**`,
    `- Temporary/rate-limited/network errors: **${report.summary.transient}**`,
    `- Other 4xx requiring review: **${report.summary.suspect}**`,
    `- Unstable between verification attempts: **${report.summary.unstable}**`,
    '',
  ];

  const broken = report.results.filter((row) => row.category === 'confirmed-broken');
  if (broken.length) {
    lines.push('## Confirmed broken links', '');
    broken.slice(0, 120).forEach((row) => {
      lines.push(`- HTTP ${row.status} — ${row.url}`);
      lines.push(`  - Source: ${row.sources.slice(0, 4).join(', ')}${row.sources.length > 4 ? ` (+${row.sources.length - 4} more)` : ''}`);
    });
    if (broken.length > 120) lines.push(`- …and ${broken.length - 120} more in the JSON artifact.`);
    lines.push('');
  } else {
    lines.push('## Confirmed broken links', '', 'None.', '');
  }

  const advisory = report.results.filter((row) => ['blocked', 'transient', 'suspect', 'unstable'].includes(row.category));
  if (advisory.length) {
    lines.push('## Advisory / unverifiable results', '');
    advisory.slice(0, 60).forEach((row) => {
      const status = row.status ? `HTTP ${row.status}` : row.error || 'network error';
      lines.push(`- ${row.category}: ${status} — ${row.url}`);
    });
    if (advisory.length > 60) lines.push(`- …and ${advisory.length - 60} more in the JSON artifact.`);
    lines.push('');
  }

  lines.push('Only links that returned **404 or 410 on two separate attempts** are treated as confirmed broken. 401/403, 429, 5xx, timeouts and network errors are deliberately not labelled broken.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let references = collectReferences();
  if (args.limit > 0) references = references.slice(0, args.limit);

  console.log(`CCG external-link audit: checking ${references.length} unique external references…`);
  const results = await mapLimit(references, args.concurrency, checkReference);
  const { summary, byHost } = summarize(results);
  const report = {
    version: 1,
    checkedAt: new Date().toISOString(),
    sources: SOURCE_FILES,
    summary,
    byHost,
    results,
  };

  if (args.json) {
    const target = path.resolve(ROOT, args.json);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
  }
  const markdown = markdownReport(report);
  if (args.markdown) {
    const target = path.resolve(ROOT, args.markdown);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, markdown);
  }

  console.log(markdown);
}

main().catch((error) => {
  console.error(`External-link audit failed to run: ${error && error.stack ? error.stack : error}`);
  process.exitCode = 1;
});
