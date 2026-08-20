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
const main = read('arcade/quest/game/main-v2.js');
const remote = read('arcade/quest/game/remote-assets.js');
const config = read('arcade/quest/game/assets-config.js');
const stages = read('arcade/quest/game/stages.js');
const achievements = read('arcade/quest/game/achievements.js');
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
  'game/main-v2.js',
].forEach((src) => expectContains('arcade/quest/index.html', gameIndex, `src="${src}"`, `script ${src}`));

expectContains('arcade/index.html', arcadeIndex, '/arcade/quest/', 'Quest launch link');
expectContains('arcade/quest/game/main-v2.js', main, 'hydrateRemoteAssets', 'remote asset hydration before startup');
expectContains('arcade/quest/game/main-v2.js', main, "input.down('ArrowDown','KeyS')", 'duck control');
expectContains('arcade/quest/game/main-v2.js', main, "lane==='duck'", 'real duck-height hazard lane');
expectContains('arcade/quest/game/main-v2.js', main, 'hazardReleaseAt', 'hazard release spacing gate');
expectContains('arcade/quest/game/main-v2.js', main, "fighterPlayerAttack('punch')", 'fighter punch state');
expectContains('arcade/quest/game/main-v2.js', main, "fighterPlayerAttack('kick')", 'fighter kick state');
expectContains('arcade/quest/game/main-v2.js', main, 'chooseFighterAI', 'adaptive fighter AI');
expectContains('arcade/quest/game/main-v2.js', main, "f.vx=f.face*155", 'Tier-Tex attack step-in pressure');
expectContains('arcade/quest/game/main-v2.js', main, "r<.88", 'aggressive close-range Tier-Tex pressure');
expectContains('arcade/quest/game/main-v2.js', main, 'BOSS_PROFILE', 'progressive boss difficulty profiles');
expectContains('arcade/quest/game/main-v2.js', main, "speed:375,warn:.9", 'harder Amiga boss profile');
expectContains('arcade/quest/game/stages.js', stages, "bossHp:24", 'Bedroom boss health increase');
expectContains('arcade/quest/game/stages.js', stages, "bossHp:48", 'Amiga boss health increase');
expectContains('arcade/quest/game/stages.js', stages, "bossHp:46", 'final Guru boss health preserved');
expectContains('arcade/quest/game/main-v2.js', main, 'guruBeam(false)', 'two-second Guru stage beam contract');
expectContains('arcade/quest/game/main-v2.js', main, 'guruBeam(true)', 'separate final-boss Guru hazard contract');
expectContains('arcade/quest/game/main-v2.js', main, 'GURU BOX — JUMP', 'additional Guru box hazard');
expectContains('arcade/quest/game/main-v2.js', main, 'MEMORY BOX', 'secondary Guru box encounter');
expectContains('arcade/quest/game/main-v2.js', main, "if(S.stage>=2)", 'later-stage bidirectional enemy spawns');
expectContains('arcade/quest/game/main-v2.js', main, "S.stage===2?.7:.5", 'Christmas left-side spawn bias');
expectContains('arcade/quest/game/main-v2.js', main, 'startInvaders', 'Alien Formation interlude');
expectContains('arcade/quest/game/main-v2.js', main, 'startMaze', 'Dot-Maze interlude');
expectContains('arcade/quest/game/main-v2.js', main, 'target:110', 'extended Dot-Maze target');
expectContains('arcade/quest/game/main-v2.js', main, 'COLLECT 110 DOTS', 'extended Dot-Maze instructions');
expectContains('arcade/quest/game/main-v2.js', main, 'player_avatar', 'member avatar head rendering');
expectContains('arcade/quest/game/main-v2.js', main, 'vx=930*dir', 'manual straight player fire contract');
expectContains('arcade/quest/game/main-v2.js', main, '28 SECONDS', 'extended Electric Bead Run');
expectContains('arcade/quest/game/main-v2.js', main, 'NEXT:', 'next-level HUD indicator');

expectContains('arcade/quest/game/remote-assets.js', remote, ".from('arcade_assets')", 'Supabase arcade asset manifest query');
expectContains('arcade/quest/game/remote-assets.js', remote, "get_my_public_profile_preview", 'signed-in member avatar profile query');
expectContains('arcade/quest/game/remote-assets.js', remote, 'avatar_url', 'member avatar URL hydration');
expectContains('arcade/quest/game/assets-config.js', config, 'CUSTOM_ASSETS', 'custom asset configuration');
expectContains('arcade/quest/game/assets-config.js', config, 'avatar:null', 'runtime player avatar slot');
expectContains('arcade/quest/game/stages.js', stages, "['invaders','Alien Formation']", 'Alien Formation level select entry');
expectContains('arcade/quest/game/stages.js', stages, "['maze','Dot-Maze Run']", 'Dot-Maze level select entry');
expectContains('arcade/quest/game/achievements.js', achievements, 'Formation Breaker', 'Alien Formation achievement');
expectContains('arcade/quest/game/achievements.js', achievements, 'Dot Gobbler', 'Dot-Maze achievement');

['bedroom', 'beads', 'budget', 'fighter', 'invaders', 'christmas', 'maze', 'amiga', 'guru'].forEach((scene) => {
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

['invaders', 'maze'].forEach((slot) => {
  expectContains('arcade/quest/game/assets-config.js', config, `${slot}:null`, `${slot} custom asset slot`);
  expectContains('admin/js/arcade-assets.js', adminJs, `'${slot}'`, `${slot} admin upload slot`);
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
