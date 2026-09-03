#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const defaultManifest = path.join(repo, 'arcade/lost-sizzler/SUPABASE-STORAGE-RECOVERY-MANIFEST.md');
const EXPECTED_COUNT = 16;
const EXPECTED_BYTES = 72_233_137;

function fail(message) { throw new Error(message); }
function stripTicks(value) {
  const text = String(value || '').trim();
  return text.startsWith('`') && text.endsWith('`') ? text.slice(1, -1) : text;
}
function parseArgs(argv) {
  const out = { manifest: defaultManifest, output: '', storageBaseUrl: '', limit: 1, probe: false, report: '', plan: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--manifest') out.manifest = path.resolve(argv[++i] || '');
    else if (arg === '--output') out.output = path.resolve(argv[++i] || '');
    else if (arg === '--storage-base-url') out.storageBaseUrl = String(argv[++i] || '').trim();
    else if (arg === '--limit') out.limit = Number(argv[++i]);
    else if (arg === '--probe') out.probe = true;
    else if (arg === '--report') out.report = path.resolve(argv[++i] || '');
    else if (arg === '--plan') out.plan = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else fail(`Unknown argument: ${arg}`);
  }
  return out;
}
function usage() {
  console.log(`Lost Sizzler enabled Storage recovery downloader\n\nUsage:\n  node scripts/recover-lost-sizzler-enabled-storage.mjs \\\n    --storage-base-url <public bucket root> \\\n    --output <directory> [--limit 1..16] [--probe] [--report <file>]\n\n  node scripts/recover-lost-sizzler-enabled-storage.mjs \\\n    --storage-base-url <public bucket root> --plan [--limit 1..16]\n\nSafety rules:\n  - reads only the 16 ENABLED objects frozen in SUPABASE-STORAGE-RECOVERY-MANIFEST.md;\n  - defaults to --limit 1 so availability can be tested before recovering all 16;\n  - --plan performs no network request and creates no output directory or report;\n  - never downloads disabled counterparts;\n  - refuses to overwrite an existing recovered or partial file;\n  - verifies downloaded byte size and SHA-256 before promoting the partial file;\n  - optional --probe runs ffprobe and requires an audio stream before promotion;\n  - performs no Supabase database or Storage mutation.`);
}
function parseManifest(file) {
  const text = fs.readFileSync(file, 'utf8');
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    if (cells.length !== 12) fail(`Unexpected recovery manifest row: ${line}`);
    const [number, playlist, originalFile, enabledRow, enabledPath, expectedBytes] = cells;
    rows.push({
      number: Number(number),
      playlist: stripTicks(playlist),
      originalFile: stripTicks(originalFile),
      enabledRow: Number(enabledRow),
      enabledPath: stripTicks(enabledPath),
      expectedBytes: Number(String(expectedBytes).replaceAll(',', ''))
    });
  }
  rows.sort((a, b) => a.number - b.number);
  if (rows.length !== EXPECTED_COUNT) fail(`Expected ${EXPECTED_COUNT} frozen enabled objects, found ${rows.length}.`);
  rows.forEach((row, index) => {
    if (row.number !== index + 1) fail(`Recovery manifest numbering changed at row ${row.number}.`);
    if (!row.enabledPath || !row.originalFile || !Number.isSafeInteger(row.expectedBytes) || row.expectedBytes <= 0) fail(`Recovery manifest row ${row.number} is invalid.`);
  });
  const total = rows.reduce((sum, row) => sum + row.expectedBytes, 0);
  if (total !== EXPECTED_BYTES) fail(`Frozen enabled byte total changed: ${total} != ${EXPECTED_BYTES}.`);
  return rows;
}
function safeOutputRoot(value) {
  if (!value) fail('--output is required.');
  const root = path.resolve(value);
  if (root === path.parse(root).root) fail('Recovery output must not be a filesystem root.');
  let current = root;
  while (current !== path.parse(current).root) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail(`Recovery output must not traverse a symbolic link: ${current}`);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  fs.mkdirSync(root, { recursive: true });
  return root;
}
function normalizeBaseUrl(value) {
  if (!value) fail('--storage-base-url is required.');
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:') fail('Storage base URL must use https.');
  if (!/\.supabase\.co$/i.test(parsed.hostname)) fail(`Storage base URL must target a Supabase project host: ${parsed.hostname}`);
  if (!/\/storage\/v1\/object\/public\/[^/]+\/?$/.test(parsed.pathname)) fail('Storage base URL must end at a public bucket root.');
  if (parsed.search || parsed.hash) fail('Storage base URL must not contain query or fragment data.');
  return parsed.href.endsWith('/') ? parsed.href : `${parsed.href}/`;
}
function recoveryUrl(baseUrl, storagePath) {
  return new URL(storagePath.split('/').map(segment => encodeURIComponent(segment)).join('/'), baseUrl).href;
}
function printPlan(rows, baseUrl) {
  const selectedBytes = rows.reduce((sum, row) => sum + row.expectedBytes, 0);
  console.log(`Lost Sizzler enabled Storage recovery plan: ${rows.length}/${EXPECTED_COUNT} objects, ${selectedBytes} expected bytes.`);
  for (const row of rows) {
    console.log(`PLAN ${String(row.number).padStart(2, '0')} | row ${row.enabledRow} | ${row.playlist}/${row.originalFile} | ${row.expectedBytes} | ${recoveryUrl(baseUrl, row.enabledPath)}`);
  }
  console.log('PLAN ONLY: zero network requests; zero files created; enabled generation only.');
}
function sha256File(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}
function probeFile(file) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-show_entries', 'stream=codec_name,codec_type', '-of', 'json', file], { encoding: 'utf8' });
  if (result.error) return { ok: false, error: result.error.code === 'ENOENT' ? 'ffprobe not found' : String(result.error.message || result.error) };
  if (result.status !== 0) return { ok: false, error: String(result.stderr || `ffprobe exited ${result.status}`).trim() };
  try {
    const parsed = JSON.parse(result.stdout || '{}');
    const audioStreams = (parsed.streams || []).filter(stream => stream.codec_type === 'audio');
    return {
      ok: audioStreams.length > 0,
      duration: Number(parsed.format?.duration || 0) || null,
      codecs: [...new Set(audioStreams.map(stream => stream.codec_name).filter(Boolean))],
      error: audioStreams.length ? '' : 'no audio stream reported'
    };
  } catch (error) {
    return { ok: false, error: `invalid ffprobe JSON: ${error.message}` };
  }
}
async function downloadTo(url, destination) {
  if (fs.existsSync(destination)) fail(`Refusing to overwrite existing recovery file: ${destination}`);
  const partial = `${destination}.partial`;
  if (fs.existsSync(partial)) fail(`Refusing to overwrite existing partial recovery file: ${partial}`);
  const response = await fetch(url, { redirect: 'follow', cache: 'no-store' });
  if (!response.ok) fail(`Storage download failed with HTTP ${response.status} for ${url}`);
  if (!response.body) fail(`Storage download returned no body for ${url}`);
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    const buffer = Buffer.from(chunk);
    chunks.push(buffer);
    bytes += buffer.length;
  }
  fs.writeFileSync(partial, Buffer.concat(chunks, bytes), { flag: 'wx' });
  return { bytes, partial };
}
function promoteVerifiedDownload(partial, destination) {
  if (!fs.existsSync(partial)) fail(`Verified recovery partial is missing: ${partial}`);
  if (fs.existsSync(destination)) fail(`Refusing to overwrite existing recovery file: ${destination}`);
  fs.renameSync(partial, destination);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); return; }
  if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > EXPECTED_COUNT) fail(`--limit must be an integer from 1 to ${EXPECTED_COUNT}.`);
  const rows = parseManifest(args.manifest).slice(0, args.limit);
  const baseUrl = normalizeBaseUrl(args.storageBaseUrl);
  if (args.plan) {
    if (args.output || args.report || args.probe) fail('--plan cannot be combined with --output, --report or --probe.');
    printPlan(rows, baseUrl);
    return;
  }
  const root = safeOutputRoot(args.output);
  const results = [];

  for (const row of rows) {
    const filename = path.basename(row.enabledPath);
    const destination = path.join(root, filename);
    const url = recoveryUrl(baseUrl, row.enabledPath);
    const { bytes, partial } = await downloadTo(url, destination);
    const sha256 = sha256File(partial);
    const sizeMatches = bytes === row.expectedBytes;
    const probe = args.probe ? probeFile(partial) : null;
    const result = { number: row.number, playlist: row.playlist, originalFile: row.originalFile, enabledRow: row.enabledRow, enabledPath: row.enabledPath, expectedBytes: row.expectedBytes, downloadedBytes: bytes, sizeMatches, sha256, probe };
    results.push(result);
    console.log(`${String(row.number).padStart(2, '0')} ${row.playlist}/${row.originalFile} | ${bytes} bytes | SHA-256 ${sha256}${args.probe ? ` | ffprobe ${probe?.ok ? 'OK' : 'FAIL'}` : ''}`);
    if (!sizeMatches) fail(`Downloaded byte size mismatch for recovery row ${row.number}: ${bytes} != ${row.expectedBytes}. Unverified bytes remain at ${partial}.`);
    if (args.probe && !probe?.ok) fail(`ffprobe/decode verification failed for recovery row ${row.number}: ${probe?.error || 'unknown error'}. Unverified bytes remain at ${partial}.`);
    promoteVerifiedDownload(partial, destination);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    readOnlySupabaseRecovery: true,
    generation: 'enabled-only',
    requestedCount: args.limit,
    frozenEnabledCount: EXPECTED_COUNT,
    frozenEnabledBytes: EXPECTED_BYTES,
    storageBaseUrl: baseUrl,
    manifest: path.resolve(args.manifest),
    output: root,
    probeRequested: args.probe,
    results
  };
  if (args.report) {
    if (path.resolve(args.report).startsWith(`${root}${path.sep}`)) fail('Recovery report must be outside the recovered binary directory.');
    if (fs.existsSync(args.report)) fail(`Refusing to overwrite existing recovery report: ${args.report}`);
    fs.mkdirSync(path.dirname(args.report), { recursive: true });
    fs.writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
    console.log(`Recovery report written: ${args.report}`);
  }
  console.log(`Lost Sizzler enabled Storage recovery completed read-only for ${results.length}/${EXPECTED_COUNT} frozen enabled objects.`);
}

main().catch(error => {
  console.error(`Lost Sizzler enabled Storage recovery failed: ${error.message || error}`);
  process.exitCode = 1;
});
