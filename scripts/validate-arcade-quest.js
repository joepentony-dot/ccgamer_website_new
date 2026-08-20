#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const errors = [];

function fail(message) {
  errors.push(message);
}

function read(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    fail(`Missing required file: ${rel}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function expectContains(rel, source, needle, description = needle) {
  if (!source.includes(needle)) fail(`${rel} is missing ${description}`);
}

const gameIndex = read('arcade/quest/index.html');
const arcadeIndex = read('arcade/index.html');
const main = read('arcade/quest/game/main.js');
const remote = read('arcade/quest/game/remote-assets.js');
const config = read('arcade/quest/game/assets-config.js');
const adminPage = read('admin/arcade-assets.html');
const adminJs = read('admin/js/arcade-assets.js');
const adminNav = read('admin/js/admin-nav.js');
const migration = read('supabase/migrations/20260820_arcade_asset_manager.sql');

[
  'game/core.js',
  'game/assets-config.js',
  'game/remote-assets.js',
  'game/stages.js',
  'game/audio.js',
  'game/achievements.js',
  'game/main.js',
].forEach((src) => expectContains('arcade/quest/index.html', gameIndex, `src="${src}"`, `script ${src}`));

expectContains('arcade/index.html', arcadeIndex, '/arcade/quest/', 'Quest launch link');
expectContains('arcade/quest/game/main.js', main, 'hydrateRemoteAssets', 'remote asset hydration before startup');
expectContains('arcade/quest/game/main.js', main, "input.down('ArrowDown', 'KeyS')", 'duck control');
expectContains('arcade/quest/game/main.js', main, "fighterPlayerAttack('punch')", 'fighter punch state');
expectContains('arcade/quest/game/main.js', main, "fighterPlayerAttack('kick')", 'fighter kick state');
expectContains('arcade/quest/game/main.js', main, 'bossAttack()', 'boss attack state machine');
expectContains('arcade/quest/game/main.js', main, 'Player fire is deliberately straight', 'manual straight player fire contract');
expectContains('arcade/quest/game/main.js', main, '24 SECONDS', 'extended Electric Bead Run');
expectContains('arcade/quest/game/main.js', main, 'GLITCH IN', 'Guru warning countdown');
expectContains('arcade/quest/game/main.js', main, 'THREE-WAY FAN', 'final boss fan attack');
expectContains('arcade/quest/game/main.js', main, 'Final boss crosses the whole arena', 'final boss arena traversal');
expectContains('arcade/quest/game/main.js', main, 'Christmas attacks from the left', 'reversed Christmas flow');
expectContains('arcade/quest/game/main.js', main, 'Keep fighters apart enough', 'fighter spacing / anti-button-mash contract');
expectContains('arcade/quest/game/main.js', main, 'NEXT:', 'next-level HUD indicator');
expectContains('arcade/quest/game/main.js', main, "Use only the mascot's head/cap/face", 'articulated mascot rig source crop');
expectContains('arcade/quest/game/remote-assets.js', remote, ".from('arcade_assets')", 'Supabase arcade asset manifest query');
expectContains('arcade/quest/game/assets-config.js', config, 'CUSTOM_ASSETS', 'custom asset configuration');

['bedroom', 'beads', 'budget', 'fighter', 'christmas', 'amiga', 'guru'].forEach((scene) => {
  read(`arcade/quest/assets/backgrounds/${scene}.svg`);
});

['head', 'body', 'arm', 'leg'].forEach((part) => {
  expectContains('arcade/quest/game/assets-config.js', config, `${part}:null`, `player ${part} asset slot`);
  expectContains('admin/js/arcade-assets.js', adminJs, `'${part}'`, `admin player ${part} upload slot`);
});

['enemyPunch', 'enemyKick', 'enemyHit'].forEach((part) => {
  expectContains('arcade/quest/game/assets-config.js', config, `${part}:null`, `fighter ${part} asset slot`);
  expectContains('admin/js/arcade-assets.js', adminJs, `'${part}'`, `admin fighter ${part} upload slot`);
});

expectContains('admin/arcade-assets.html', adminPage, 'arcade-assets.js', 'Arcade Asset Manager controller');
expectContains('admin/js/arcade-assets.js', adminJs, "ensureRole(['admin', 'superadmin'])", 'admin/superadmin access check');
expectContains('admin/js/arcade-assets.js', adminJs, "const BUCKET = 'ccg-arcade-assets'", 'arcade storage bucket');
expectContains('admin/js/admin-nav.js', adminNav, '/admin/arcade-assets.html', 'Arcade Asset Manager navigation link');

expectContains('supabase/migrations/20260820_arcade_asset_manager.sql', migration, 'CREATE TABLE IF NOT EXISTS public.arcade_assets', 'arcade_assets table');
expectContains('supabase/migrations/20260820_arcade_asset_manager.sql', migration, "'ccg-arcade-assets'", 'ccg-arcade-assets storage bucket');
expectContains('supabase/migrations/20260820_arcade_asset_manager.sql', migration, "public.current_user_role() IN ('admin','superadmin')", 'admin-only mutation policy');

if (errors.length) {
  console.error('Arcade Quest validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Arcade Quest foundation validation passed.');
