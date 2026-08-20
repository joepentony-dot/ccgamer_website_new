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
  'game/sprite-runtime.js',
  'game/stages.js',
  'game/audio.js',
  'game/achievements.js',
  'game/main-v2.js',
].forEach((src) => expectContains('arcade/quest/index.html', gameIndex, `src="${src}"`, `script ${src}`));

expectContains('arcade/index.html', arcadeIndex, '/arcade/quest/', 'Quest launch link');
expectContains('arcade/quest/game/main-v2.js', main, 'hydrateRemoteAssets', 'remote asset hydration before startup');
expectContains('arcade/quest/game/main-v2.js', main, "input.down('ArrowDown','KeyS')", 'duck control');
expectContains('arcade/quest/game/main-v2.js', main, "lane==='duck')return Q.GROUND-P.h-10", 'raised but still mandatory duck-hazard lane');
expectContains('arcade/quest/game/main-v2.js', main, 'hazardReleaseAt', 'hazard release spacing gate');
expectContains('arcade/quest/game/main-v2.js', main, 'sy=P.duck&&P.ground?P.y+103:P.y+58', 'low firing while ducking');
expectContains('arcade/quest/game/main-v2.js', main, "variant:low?'low':'normal'", 'low 8-bit enemy type');
expectContains('arcade/quest/game/main-v2.js', main, 'LOW 8BIT', 'low enemy visual treatment');
expectContains('arcade/quest/game/main-v2.js', main, "fighterPlayerAttack('punch')", 'fighter punch state');
expectContains('arcade/quest/game/main-v2.js', main, "fighterPlayerAttack('kick')", 'fighter kick state');
expectContains('arcade/quest/game/main-v2.js', main, 'chooseFighterAI', 'adaptive fighter AI');
expectContains('arcade/quest/game/main-v2.js', main, 'fighterAttackBox', 'frame-aware fighter hitboxes');
expectContains('arcade/quest/game/main-v2.js', main, '22+72*kk', 'reduced Tier-Tex kick visual extension');
expectContains('arcade/quest/game/main-v2.js', main, '48+58*pn', 'reduced Tier-Tex punch visual extension');
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
expectContains('arcade/quest/game/main-v2.js', main, 'S.enemySpawn-=dt', 'additional ambient 8-bit enemies');
expectContains('arcade/quest/game/main-v2.js', main, "input.tap('KeyZ','ControlLeft')&&P.fire<=0", 'single-press player firing');
expectContains('arcade/quest/game/main-v2.js', main, "if(input.tap('KeyZ','ControlLeft')&&g.fire<=0)", 'single-press Alien Formation firing');
expectContains('arcade/quest/game/main-v2.js', main, 'leftMarks=[5.5,10.5,15.5,20.5,24.5]', 'five scheduled left-side Electric Bead attacks');
expectContains('arcade/quest/game/main-v2.js', main, 'enemyCool:.58', 'faster opening Alien Formation fire');
expectContains('arcade/quest/game/main-v2.js', main, 'dir:1,speed:72,aliens', 'slower Alien Formation base movement');
expectContains('arcade/quest/game/main-v2.js', main, 'spd=g.speed+ratio*145', 'slower Alien Formation late-wave movement');
expectContains('arcade/quest/game/main-v2.js', main, 'g.enemyCool=rand(Math.max(.22,.54-ratio*.18)', 'shorter Alien Formation firing gaps');

expectContains('arcade/quest/game/main-v2.js', main, 'startInvaders', 'Alien Formation interlude');
expectContains('arcade/quest/game/main-v2.js', main, 'r<5;r++)for(let c=0;c<9', '45-alien tougher formation');
expectContains('arcade/quest/game/main-v2.js', main, 'bunkers=[330,650,970,1290]', 'destructible Alien Formation cover');
expectContains('arcade/quest/game/main-v2.js', main, 'count=ratio>.5?3:ratio>.12?2:1', 'stronger multi-shot Alien Formation pressure');
expectContains('arcade/quest/game/main-v2.js', main, 'vy=270+ratio*125,vx=0', 'straight-down slower Alien Formation shots');
expectContains('arcade/quest/game/main-v2.js', main, "assets.get('invader_alien'+(a.row+1))", 'custom Alien Formation row sprites');
expectContains('arcade/quest/game/main-v2.js', main, "assets.get('invader_ship')", 'custom Alien Formation ship sprite');

expectContains('arcade/quest/game/main-v2.js', main, 'startMaze', 'Dot-Maze interlude');
expectContains('arcade/quest/game/main-v2.js', main, 'target:110', 'extended Dot-Maze target');
expectContains('arcade/quest/game/main-v2.js', main, 'mazeDistance', 'pathfinding-aware Dot-Maze bug AI');
expectContains('arcade/quest/game/main-v2.js', main, "role:'ambush'", 'Dot-Maze ambush bug role');
expectContains('arcade/quest/game/main-v2.js', main, "role:'pincer'", 'Dot-Maze pincer bug role');
expectContains('arcade/quest/game/main-v2.js', main, "role:'guard'", 'Dot-Maze power-cell guard bug role');
expectContains('arcade/quest/game/main-v2.js', main, 'm.powered=4.2', 'shorter Dot-Maze power effect');
expectContains('arcade/quest/game/main-v2.js', main, 'damage=powered?12:30', 'enemy contact always has consequences in Dot-Maze');
expectContains('arcade/quest/game/main-v2.js', main, 'CONTACT STILL HURTS', 'Dot-Maze power-state warning');

expectContains('arcade/quest/game/main-v2.js', main, 'beadLeftShots', 'left-side Electric Bead attacks');
expectContains('arcade/quest/game/main-v2.js', main, 'w:44,h:44', 'smaller Electric Beads');
expectContains('arcade/quest/game/main-v2.js', main, 'S.beadEnemyTimer-=dt', '8-bit enemies in Electric Bead Run');
expectContains('arcade/quest/game/main-v2.js', main, 'speed=rand(360,455)', 'slightly slower Electric Bead speed');
expectContains('arcade/quest/game/main-v2.js', main, 'updatePlayer(dt,true)', 'shooting enabled in Electric Bead Run');

expectContains('arcade/quest/game/main-v2.js', main, 'player_avatar', 'member avatar head rendering');
expectContains('arcade/quest/game/main-v2.js', main, "assets.get('sheet_player')", 'player sprite sheet renderer');
expectContains('arcade/quest/game/main-v2.js', main, "assets.get('sheet_fighter')", 'Tier-Tex sprite sheet renderer');
expectContains('arcade/quest/game/main-v2.js', main, "assets.get('sheet_enemy')", '8-bit enemy sprite sheet renderer');
expectContains('arcade/quest/game/main-v2.js', main, "drawLayer(id,'Back')", 'layered background renderer');
expectContains('arcade/quest/game/main-v2.js', main, "foreground(id)", 'foreground scenery renderer');
expectContains('arcade/quest/game/main-v2.js', main, 'vx=930*dir', 'manual straight player fire contract');
expectContains('arcade/quest/game/main-v2.js', main, '28 SECONDS', 'extended Electric Bead Run');
expectContains('arcade/quest/game/main-v2.js', main, 'NEXT:', 'next-level HUD indicator');

expectContains('arcade/quest/game/remote-assets.js', remote, ".from('arcade_assets')", 'Supabase arcade asset manifest query');
expectContains('arcade/quest/game/remote-assets.js', remote, "get_my_public_profile_preview", 'signed-in member avatar profile query');
expectContains('arcade/quest/game/remote-assets.js', remote, 'avatar_url', 'member avatar URL hydration');
expectContains('arcade/quest/game/assets-config.js', config, 'CUSTOM_ASSETS', 'custom asset configuration');
expectContains('arcade/quest/game/assets-config.js', config, 'avatar:null', 'runtime player avatar slot');
expectContains('arcade/quest/game/assets-config.js', config, 'invaders:{alien1:null', 'Alien Formation sprite asset group');
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

['alien1', 'alien2', 'alien3', 'alien4', 'alien5', 'ship', 'bunker', 'enemyShot', 'playerShot'].forEach((slot) => {
  expectContains('arcade/quest/game/assets-config.js', config, `${slot}:null`, `Alien Formation ${slot} asset slot`);
  expectContains('admin/js/arcade-assets.js', adminJs, `'${slot}'`, `Alien Formation ${slot} admin upload slot`);
});
expectContains('admin/js/arcade-assets.js', adminJs, 'Alien Formation Sprites', 'Alien Formation sprite admin group');

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
