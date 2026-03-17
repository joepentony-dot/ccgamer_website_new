#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { applyTemplate, readTemplate } = require('./template-engine');

const repoRoot = path.resolve(__dirname, '..');
const gamesJsonPath = path.join(repoRoot, 'games', 'games.json');
const templatePath = path.join(repoRoot, 'templates', 'game-template.html');
const gamesRoot = path.join(repoRoot, 'games');

function fail(message) {
  console.error(`[rebuild-games] ${message}`);
  process.exit(1);
}

function runNodeScript(scriptName) {
  const scriptPath = path.join(__dirname, scriptName);
  const result = spawnSync(process.execPath, [scriptPath], { cwd: repoRoot, stdio: 'inherit' });
  if (result.status !== 0) {
    fail(`${scriptName} failed with status ${result.status ?? 1}.`);
  }
}

function ensureInputs() {
  if (!fs.existsSync(gamesJsonPath)) fail('games/games.json does not exist.');
  if (!fs.existsSync(templatePath)) fail('templates/game-template.html does not exist.');
}

function readGames() {
  try {
    const raw = fs.readFileSync(gamesJsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) fail('games/games.json must contain an array.');
    return parsed;
  } catch (error) {
    fail(`games.json parse failed: ${error.message}`);
  }
}

function clean(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstCredit(game, key) {
  const value = game?.credits?.[key];
  if (Array.isArray(value) && value[0]) return value[0];
  if (typeof value === 'string') return value;
  return '';
}

function buildDescription(game) {
  const value = String(game?.description || '').trim();
  if (value) return value;
  return `${String(game?.title || '').trim()} on Cheeky Commodore Gamer.`;
}

function buildFbMeta() {
  const appId = String(process.env.FACEBOOK_APP_ID || '').trim();
  if (!appId) return '';
  return `<meta property="fb:app_id" content="${clean(appId)}">`;
}

function normalizeThumbnail(game, slug) {
  const raw = String(game?.thumbnail || '').trim();
  if (!raw) return `${slug}.jpg`;
  return raw.split('/').pop() || `${slug}.jpg`;
}

function rebuild() {
  ensureInputs();

  const template = readTemplate(templatePath);
  const games = readGames();
  const fbMeta = buildFbMeta();

  let count = 0;
  games.forEach((game) => {
    const slug = String(game?.slug || '').trim();
    if (!slug) return;

    const title = String(game?.title || '').trim();
    const year = String(game?.year ?? '').trim();
    const publisher = firstCredit(game, 'publisher') || 'Cheeky Commodore Gamer';
    const thumbnailFilename = normalizeThumbnail(game, slug);

    const html = applyTemplate(template, {
      GAME_NAME: clean(title),
      SLUG: clean(slug),
      YEAR: clean(year),
      PUBLISHER: clean(publisher),
      DESCRIPTION: clean(buildDescription(game)),
      THUMBNAIL: clean(thumbnailFilename),
      FB_APP_ID_META: fbMeta
    });

    const outDir = path.join(gamesRoot, slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    count += 1;
  });

  console.log(`[rebuild-games] Rebuilt ${count} game page(s).`);
  runNodeScript('build-games.js');
  runNodeScript('generate-sitemaps.js');
  console.log('[rebuild-games] Regenerated games indexes, music hub/composer pages, and sitemaps.');
}

rebuild();
