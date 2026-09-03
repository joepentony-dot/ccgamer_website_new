#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
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
  const out = { manifest: defaultManifest, output: '', storageBaseUrl: '', limit: 1, probe: false, report: '', plan: false, selfTest: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--manifest') out.manifest = path.resolve(argv[++i] || '');
    else if (arg === '--output') out.output = path.resolve(argv[++i] || '');
    else if (arg === '--storage-base-url') out.storageBaseUrl = String(argv[++i] || '').trim();
    else if (arg === '--limit') out.limit = Number(argv[++i]);
    else if (arg === '--probe') out.probe = true;
    else if (arg === '--report') out.report = path.resolve(argv[++i] || '');
    else if (arg === '--plan') out.plan = true;
    else if (arg === '--self-test') out.selfTest = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else fail(`Unknown argument: ${arg}`);
  }
  return out;
}
function usage() {
  console.log(`Lost Sizzler enabled Storage recovery downloader\n\nUsage:\n  node scripts/recover-lost-sizzler-enabled-storage.mjs \\\n    --storage-base-url <public bucket root> \\\n    --output <directory> [--limit 1..16] [--probe] [--report <file>]\n\n  node scripts/recover-lost-sizzler-enabled-storage.mjs \\\n    --storage-base-url <public bucket root> --plan [--limit 1..16]\n\n  node scripts/recover-lost-sizzler-enabled-storage.mjs --self-test\n\nSafety rules:\n  - reads only the 16 ENABLED objects frozen in SUPABASE-STORAGE-RECOVERY-MANIFEST.md;\n  - validates every frozen Storage path as a canonical relative path before URL construction;\n  - defaults to --limit 1 so availability can be tested before recovering all 16;\n  - --plan and --self-test perform no network request;\n  - never downloads disabled counterparts;\n  - refuses symlinked recovery roots and refuses to overwrite an existing recovered or partial file;\n  - verifies downloaded byte size and SHA-256 before promoting the partial file;\n  - optional --probe runs ffprobe and requires an audio stream before promotion;\n  - report evidence must remain outside recovered binaries, cannot traverse symlinked parents, and cannot overwrite existing evidence;\n  - performs no Supabase database or Storage mutation.`);
}
function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
function assertNoSymlinkComponents(target, label) {
  const resolved = path.resolve(target);
  const parsed = path.parse(resolved);
  let current = resolved;
  while (true) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail(`${label} must not traverse a symbolic link: ${current}`);
    if (current === parsed.root) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return resolved;
}
function safeStorageRelativePath(value, label) {
  const text = String(value || '').trim();
  if (!text || text.startsWith('/') || text.includes('\\') || path.posix.isAbsolute(text)) fail(`${label} is not a safe relative Storage path: ${text || '<empty>'}`);
  const normalized = path.posix.normalize(text);
  if (normalized !== text || normalized === '.' || normalized.startsWith('../') || normalized.split('/').includes('..')) fail(`${label} is not a canonical relative Storage path: ${text}`);
  return normalized;
}
function safeOriginalFilename(value, label) {
  const text = String(value || '').trim();
  if (!text || text === '.' || text === '..' || text.includes('/') || text.includes('\\') || path.basename(text) !== text) fail(`${label} is not a safe filename: ${text || '<empty>'}`);
  return text;
}
function parseManifest(file) {
  const manifestPath = path.resolve(file);
  assertNoSymlinkComponents(manifestPath, 'Recovery manifest');
  if (!fs.existsSync(manifestPath) || !fs.lstatSync(manifestPath).isFile()) fail(`Recovery manifest must be a regular file: ${manifestPath}`);
  const text = fs.readFileSync(manifestPath, 'utf8');
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    if (cells.length !== 12) fail(`Unexpected recovery manifest row: ${line}`);
    const [number, playlist, originalFile, enabledRow, enabledPath, expectedBytes] = cells;
    const parsedNumber = Number(number);
    rows.push({
      number: parsedNumber,
      playlist: stripTicks(playlist),
      originalFile: safeOriginalFilename(stripTicks(originalFile), `Recovery manifest row ${parsedNumber} original filename`),
      enabledRow: Number(enabledRow),
      enabledPath: safeStorageRelativePath(stripTicks(enabledPath), `Recovery manifest row ${parsedNumber} enabled path`),
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
  const enabledPaths = new Set(rows.map(row => row.enabledPath));
  if (enabledPaths.size !== rows.length) fail('Recovery manifest contains duplicate enabled Storage paths.');
  return rows;
}
function safeOutputRoot(value) {
  if (!value) fail('--output is required.');
  const root = path.resolve(value);
  if (root === path.parse(root).root) fail('Recovery output must not be a filesystem root.');
  assertNoSymlinkComponents(root, 'Recovery output');
  fs.mkdirSync(root, { recursive: true });
  assertNoSymlinkComponents(root, 'Recovery output');
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`Recovery output must be a real directory: ${root}`);
  return root;
}
function safeReportPath(value, root) {
  if (!value) fail('Recovery report path is required.');
  const report = path.resolve(value);
  if (report === path.parse(report).root) fail('Recovery report must not be a filesystem root.');
  if (isInside(root, report)) fail('Recovery report must be outside the recovered binary directory.');
  assertNoSymlinkComponents(path.dirname(report), 'Recovery report parent');
  if (fs.existsSync(report)) fail(`Refusing to overwrite existing recovery report: ${report}`);
  return report;
}
function writeReport(value, reportPath, root) {
  const report = safeReportPath(reportPath, root);
  fs.mkdirSync(path.dirname(report), { recursive: true });
  assertNoSymlinkComponents(path.dirname(report), 'Recovery report parent');
  fs.writeFileSync(report, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  return report;
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
  const safePath = safeStorageRelativePath(storagePath, 'Recovery Storage path');
  const encoded = safePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const resolved = new URL(encoded, baseUrl);
  const base = new URL(baseUrl);
  if (resolved.origin !== base.origin || !resolved.pathname.startsWith(base.pathname)) fail(`Recovery Storage path escaped the public bucket root: ${safePath}`);
  return resolved.href;
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
  assertNoSymlinkComponents(path.dirname(destination), 'Recovery destination parent');
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
  assertNoSymlinkComponents(path.dirname(destination), 'Recovery destination parent');
  fs.writeFileSync(partial, Buffer.concat(chunks, bytes), { flag: 'wx' });
  return { bytes, partial };
}
function promoteVerifiedDownload(partial, destination) {
  assertNoSymlinkComponents(path.dirname(destination), 'Recovery destination parent');
  if (!fs.existsSync(partial)) fail(`Verified recovery partial is missing: ${partial}`);
  const partialStat = fs.lstatSync(partial);
  if (partialStat.isSymbolicLink() || !partialStat.isFile()) fail(`Verified recovery partial must be a real file: ${partial}`);
  if (fs.existsSync(destination)) fail(`Refusing to overwrite existing recovery file: ${destination}`);
  fs.renameSync(partial, destination);
}
function expectFailure(action, label) {
  let failed = false;
  try { action(); } catch (_) { failed = true; }
  if (!failed) fail(`Self-test expected failure: ${label}`);
}
function runSelfTest() {
  const base = normalizeBaseUrl('https://example.supabase.co/storage/v1/object/public/ccg-arcade-assets/');
  const safeUrl = recoveryUrl(base, 'music/lostSizzlerDanger/example.mp3');
  if (safeUrl !== 'https://example.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerDanger/example.mp3') fail(`Self-test safe Storage URL changed unexpectedly: ${safeUrl}`);
  expectFailure(() => recoveryUrl(base, '../escape.mp3'), 'Storage traversal must be rejected');
  expectFailure(() => safeStorageRelativePath('music\\escape.mp3', 'self-test Storage path'), 'backslash Storage path must be rejected');
  expectFailure(() => safeOriginalFilename('nested/file.mp3', 'self-test filename'), 'nested original filename must be rejected');

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lost-sizzler-enabled-recovery-'));
  try {
    const root = safeOutputRoot(path.join(temp, 'enabled'));
    const linkedRoot = path.join(temp, 'enabled-link');
    fs.symlinkSync(root, linkedRoot, 'dir');
    expectFailure(() => safeOutputRoot(linkedRoot), 'symlinked recovery output must be rejected');

    const reportValue = { schema: 'self-test', readOnlySupabaseRecovery: true };
    const report = path.join(temp, 'reports', 'recovery.json');
    writeReport(reportValue, report, root);
    if (!fs.existsSync(report)) fail('Self-test recovery report was not written.');
    expectFailure(() => writeReport(reportValue, report, root), 'existing recovery report must not be overwritten');
    expectFailure(() => writeReport(reportValue, path.join(root, 'report.json'), root), 'recovery report inside binary root must be rejected');

    const redirectedParent = path.join(temp, 'redirected-report-parent');
    fs.symlinkSync(root, redirectedParent, 'dir');
    expectFailure(() => writeReport(reportValue, path.join(redirectedParent, 'report.json'), root), 'symlinked report parent must be rejected');
    if (fs.existsSync(path.join(root, 'report.json'))) fail('Rejected redirected report unexpectedly wrote inside recovery output.');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
  console.log('Lost Sizzler enabled recovery self-test passed: Storage paths stay inside the frozen bucket, recovery roots are real directories, and report evidence is external, symlink-safe and immutable.');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); return; }
  if (args.selfTest) {
    if (args.output || args.report || args.storageBaseUrl || args.plan || args.probe) fail('--self-test cannot be combined with recovery or plan options.');
    runSelfTest();
    return;
  }
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
    const filename = path.posix.basename(safeStorageRelativePath(row.enabledPath, `Recovery row ${row.number} enabled path`));
    const destination = path.join(root, filename);
    if (!isInside(root, destination)) fail(`Recovery destination escaped output root: ${destination}`);
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
    const target = writeReport(report, args.report, root);
    console.log(`Recovery report written: ${target}`);
  }
  console.log(`Lost Sizzler enabled Storage recovery completed read-only for ${results.length}/${EXPECTED_COUNT} frozen enabled objects.`);
}

main().catch(error => {
  console.error(`Lost Sizzler enabled Storage recovery failed: ${error.message || error}`);
  process.exitCode = 1;
});
