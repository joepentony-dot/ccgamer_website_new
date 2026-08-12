import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ADMIN_DIR = path.join(ROOT, 'admin');
const REQUIRED_BOOTSTRAPS = [
  '/js/ccg-supabase-config.js',
  '/js/ccg-supabase-client.js'
];
const AUTH_ROOT_MODULES = new Set([
  'admin/js/auth.js',
  'admin/js/guard.js',
  'admin/js/admin-nav.js'
]);
const dependencyCache = new Map();
const failures = [];

function normalizeRepoPath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '');
}

function stripUrlNoise(value) {
  return String(value || '').split('#')[0].split('?')[0];
}

function resolveLocalScript(ref, fromFile) {
  const clean = stripUrlNoise(ref).trim();
  if (!clean || /^(?:https?:)?\/\//i.test(clean) || clean.startsWith('data:')) return null;

  if (clean.startsWith('/')) {
    return normalizeRepoPath(clean.slice(1));
  }

  const baseDir = path.posix.dirname(normalizeRepoPath(fromFile));
  return normalizeRepoPath(path.posix.normalize(path.posix.join(baseDir, clean)));
}

function extractImports(source) {
  const refs = [];
  const patterns = [
    /\bimport\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+[^'";]*?\s+from\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) refs.push(match[1]);
  }
  return refs;
}

function moduleNeedsSupabase(repoPath, visiting = new Set()) {
  const normalized = normalizeRepoPath(repoPath);
  if (!normalized.endsWith('.js')) return false;
  if (AUTH_ROOT_MODULES.has(normalized)) return true;
  if (dependencyCache.has(normalized)) return dependencyCache.get(normalized);
  if (visiting.has(normalized)) return false;

  const absolute = path.join(ROOT, normalized);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return false;

  visiting.add(normalized);
  const source = fs.readFileSync(absolute, 'utf8');

  if (/\bwindow\.ccgSupabase\b/.test(source)) {
    dependencyCache.set(normalized, true);
    visiting.delete(normalized);
    return true;
  }

  for (const ref of extractImports(source)) {
    const dependency = resolveLocalScript(ref, normalized);
    if (!dependency) continue;
    if (moduleNeedsSupabase(dependency, visiting)) {
      dependencyCache.set(normalized, true);
      visiting.delete(normalized);
      return true;
    }
  }

  visiting.delete(normalized);
  dependencyCache.set(normalized, false);
  return false;
}

function authDependentScriptPositions(html, htmlPath) {
  const positions = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(scriptPattern)) {
    const attrs = match[1] || '';
    const body = match[2] || '';
    const tagIndex = match.index ?? 0;
    const srcMatch = attrs.match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i);

    if (srcMatch) {
      const scriptPath = resolveLocalScript(srcMatch[1], htmlPath);
      if (scriptPath && moduleNeedsSupabase(scriptPath)) positions.push(tagIndex);
    }

    for (const ref of extractImports(body)) {
      const scriptPath = resolveLocalScript(ref, htmlPath);
      if (scriptPath && moduleNeedsSupabase(scriptPath)) positions.push(tagIndex);
    }
  }

  return positions;
}

function auditAdminBootstrap() {
  const htmlFiles = fs.readdirSync(ADMIN_DIR)
    .filter((name) => name.endsWith('.html'))
    .sort();

  let guardedPages = 0;

  for (const fileName of htmlFiles) {
    const repoPath = `admin/${fileName}`;
    const html = fs.readFileSync(path.join(ROOT, repoPath), 'utf8');
    const authPositions = authDependentScriptPositions(html, repoPath);
    if (!authPositions.length) continue;

    guardedPages += 1;
    const firstAuthScript = Math.min(...authPositions);
    const bootstrapPositions = REQUIRED_BOOTSTRAPS.map((needle) => html.indexOf(needle));

    REQUIRED_BOOTSTRAPS.forEach((needle, index) => {
      if (bootstrapPositions[index] < 0) {
        failures.push(`${repoPath}: auth-dependent admin code is loaded but ${needle} is missing.`);
      } else if (bootstrapPositions[index] > firstAuthScript) {
        failures.push(`${repoPath}: ${needle} must load before the first auth-dependent admin module.`);
      }
    });

    if (bootstrapPositions.every((position) => position >= 0) && bootstrapPositions[0] > bootstrapPositions[1]) {
      failures.push(`${repoPath}: Supabase config must load before the Supabase client.`);
    }
  }

  if (!guardedPages) failures.push('No auth-dependent admin pages were discovered; the audit is not exercising the admin runtime contract.');
}

function auditContentPublisherInteractionContract() {
  const htmlPath = path.join(ROOT, 'admin/content-publisher.html');
  const jsPath = path.join(ROOT, 'admin/js/content-publisher.js');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');

  const requiredHtml = [
    'data-action="refresh"',
    'data-game-field="title"',
    'data-game-field="slug"',
    'data-game-field="id"'
  ];
  for (const needle of requiredHtml) {
    if (!html.includes(needle)) failures.push(`admin/content-publisher.html: required interactive control ${needle} is missing.`);
  }

  const interactionChecks = [
    [/el\.refresh\?\.addEventListener\(['"]click['"],\s*refreshLiveData\)/, 'Refresh Live Data click binding'],
    [/data-game-field=\\?['"]title\\?['"][\s\S]{0,160}addEventListener\(['"]input['"],\s*onGameTitleInput\)/, 'title input binding'],
    [/function\s+onGameTitleInput\s*\(\)\s*\{[\s\S]*?setGameValue\(['"]slug['"],\s*slugify\(title\)\)[\s\S]*?setGameValue\(['"]id['"],\s*idify\(title\)\)/, 'automatic slug and ID generation']
  ];

  for (const [pattern, label] of interactionChecks) {
    if (!pattern.test(js)) failures.push(`admin/js/content-publisher.js: ${label} is missing or no longer wired.`);
  }
}

auditAdminBootstrap();
auditContentPublisherInteractionContract();

if (failures.length) {
  console.error('Admin runtime bootstrap audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Admin runtime bootstrap audit passed.');
