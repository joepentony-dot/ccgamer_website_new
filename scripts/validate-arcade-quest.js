#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),ROOT=path.resolve(__dirname,'..'),errors=[];
const full=r=>path.join(ROOT,r);
const read=r=>{const p=full(r);if(!fs.existsSync(p)){errors.push(`Missing ${r}`);return'';}return fs.readFileSync(p,'utf8');};
const has=(r,s,n=s)=>{const t=read(r);if(!t.includes(s))errors.push(`${r} missing ${n}`);};
const not=(r,s,n=s)=>{const t=read(r);if(t.includes(s))errors.push(`${r} still contains ${n}`);};
const exists=r=>{if(!fs.existsSync(full(r)))errors.push(`Missing ${r}`);};
const absent=r=>{if(fs.existsSync(full(r)))errors.push(`Expected sorted asset to be absent: ${r}`);};
function png(r,w,h){const p=full(r);if(!fs.existsSync(p)){errors.push(`Missing ${r}`);return;}const b=fs.readFileSync(p);if(b.readUInt32BE(16)!==w||b.readUInt32BE(20)!==h)errors.push(`${r} wrong size`);}

const main='arcade/quest/game/main-v3.js';
const config='arcade/quest/game/assets-config.js';
const runtime='arcade/quest/game/sprite-runtime.js';
const balance='arcade/quest/game/balance.js';
const stages='arcade/quest/game/stages.js';

has(config,"const ASSET_REVISION='v20260825-q2c'",'balanced Quest 2.0 asset revision');
has(config,"player:production('player/cheeky-main-sheet.png')",'restored raster main sprite');
has(config,"playerFight:production('player/cheeky-fight-sheet.png')",'restored raster fight sprite');
has(config,'stateMeta:mainState','main state metadata');
has(config,'stateMeta:fightState','fighter state metadata');
has(config,"duck:{drawWidth:166,drawHeight:166",'natural crouch display profile');
has(config,"duck:{drawWidth:238,drawHeight:244",'natural fighter crouch profile');
has(config,"animations:{idle:[0,1],walk:[2],run:[2],guard:[3],duck:[3],punch:[4],kick:[5],hit:[6],victory:[7],jump:[2]}",'restored fight-sheet mapping');
has(config,'retsu-sheet.png');has(config,'alien-row-5.png');
has(config,"backgrounds:{bedroom:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/bedroom/1787232895204-bedroom.webp'",'remote background baseline');

has(runtime,'Q.spriteStateProfile=function','state profile runtime');
has(runtime,'Q.spriteWorldRect=function','ground-anchor runtime');
has(runtime,'Q.spriteHitbox=function','state-specific hitbox runtime');
has(runtime,'Q.drawAnchoredSprite=function','anchored sprite renderer');

has(balance,'jumpVelocity:955','reachable high-lane jump tuning');
has(balance,'crouchHeight:90','natural crouch tuning');
has(balance,'a>=2.5&&b<=6.5?value*1.35:value','main-stage pacing guard');
has(balance,'duration:27','reduced Electric Bead Run duration');
has(balance,'playerCooldown:.31','Alien Formation fire tuning');
not(balance,'Array.prototype.push','old global Array monkeypatch');
not(balance,'fireOnly','old fire-input monkeypatch');

for(const id of ['bedroom','budget','christmas','amiga','guru'])has(stages,`id:'${id}'`,`${id} stage definition`);
for(const mechanic of ["mechanic:'loading'","mechanic:'rack'","mechanic:'reverse'","mechanic:'workbench'","mechanic:'glitch'"])has(stages,mechanic);
has(stages,"duration:38,accent:'#6eeaff'",'shorter Bedroom duration');
has(stages,"bossHp:28",'reduced Bedroom boss endurance');

has(main,"assets.image('sheet_'+key",'required sprite-sheet loading');
has(main,'function playerBox(){const meta=playerMeta()','metadata-driven player collision');
has(main,"if(P.duck&&P.ground)return'duck'",'fighter crouch state');
has(main,"return P.fire>0?'duckFire':'duck'",'main crouch and crouch-fire states');
has(main,'function bedroomPattern()','Bedroom benchmark pattern system');
has(main,'function budgetPattern()','Budget Rack pattern system');
has(main,'function christmasPattern()','Christmas pattern system');
has(main,'function amigaPattern()','Amiga pattern system');
has(main,'function guruPattern()','Guru pattern system');
has(main,'function bossAttack()','stage-specific boss attacks');
has(main,"if(id==='bedroom')",'Bedroom boss branch');
has(main,"else if(id==='budget')",'Budget boss branch');
has(main,"else if(id==='christmas')",'Christmas boss branch');
has(main,"else if(id==='amiga')",'Amiga boss branch');
has(main,'function startBeads()','Electric Bead Run');
has(main,'function startFighter()','36% Conversion Bout');
has(main,'function startInvaders()','Alien Formation');
has(main,'function startMaze()','Dot-Maze Run');
has(main,"text('QUEST 2.0'",'Quest 2.0 title treatment');
has(main,'Q.drawAnchoredSprite(ctx,im,meta,stateName','anchored main sprite rendering');
has(main,'T.beads.duration','bead tuning');
has(main,'T.maze.target','maze tuning');
not(main,"return P.duck&&P.ground?{x:P.x+4,y:P.y-4,w:70,h:131}",'legacy shallow crouch geometry');

has('arcade/quest/index.html','main-v3.js?v=20260825q2');
not('arcade/quest/index.html','main-v2.js','legacy main engine include');
has('games/commodore-quest/index.html','main-v3.js?v=20260825q2');
not('games/commodore-quest/index.html','main-v2.js','legacy public wrapper engine include');
has('arcade/quest/index.html','class="rotate-prompt"');
has('games/commodore-quest/index.html','class="rotate-prompt"');
has('arcade/quest/styles.css','(orientation:portrait)');has('arcade/quest/styles.css','(orientation:landscape)');has('arcade/quest/styles.css','100dvh');

png('arcade/quest/assets/production/player/cheeky-main-sheet.png',1024,1280);
png('arcade/quest/assets/production/player/cheeky-fight-sheet.png',992,632);
png('arcade/quest/assets/production/fighter/retsu-sheet.png',992,632);
png('arcade/quest/assets/production/enemies/8bit-enemy-sheet.png',512,256);
for(const b of ['bedroom','budget','christmas','amiga','guru'])png(`arcade/quest/assets/production/bosses/${b}-sheet.png`,1024,448);

for(const r of ['collectibles/tape.png','collectibles/disk.png','collectibles/zzap.png','collectibles/joystick.png','powers/shield.png','powers/speed.png','powers/double.png','hazards/bedroom.png','hazards/budget.png','hazards/christmas.png','hazards/amiga.png','hazards/guru.png','invaders/alien-row-1.png','invaders/alien-row-2.png','invaders/alien-row-3.png','invaders/alien-row-4.png','invaders/alien-row-5.png','invaders/player-ship.png','invaders/bunker.png','invaders/enemy-shot.png','invaders/player-shot.png'])exists(`arcade/quest/assets/production/${r}`);
for(const r of ['cheeky-head.png','cheeky-body.png','cheeky-arm.png','cheeky-leg.png','cheeky-mascot.png'])exists(`arcade/quest/assets/source/player-parts/${r}`);
for(const r of ['cheeky-head.png','cheeky-body.png','cheeky-arm.png','cheeky-leg.png','cheeky-mascot.png'])absent(`arcade/quest/assets/production/player/${r}`);
exists('arcade/quest/assets/archive/recovered/recovered-assets-manifest.json');
absent('arcade/quest/assets/production/recovered-assets-manifest.json');
exists('arcade/quest/assets/archive/superseded/fighter/tiertex-kick-copy.png');
absent('arcade/quest/assets/production/fighter/tiertex-kick copy.png');
exists('arcade/quest/assets/asset-manifest.json');
exists('arcade/quest/assets/README.md');
exists('arcade/quest/QUEST-2-OVERHAUL-SPEC.md');
exists('arcade/quest/SPRITE-SPEC-V2.md');

has('arcade/quest/game/remote-assets.js',"REMOTE_GROUPS=new Set(['backgrounds','music','sfx'])");
has('arcade/quest/game/remote-assets.js','REMOTE_GROUPS.has(group)');
has('admin/js/arcade-assets.js',".in('asset_group',['backgrounds','music','sfx'])");
not('admin/js/arcade-assets.js','Tier-Tex Animation Sheet');
not('admin/js/arcade-assets.js','Alien Formation Sprites');
has('admin/arcade-assets.html','Gameplay art is protected');

if(errors.length){console.error('Arcade Quest 2.0 validation failed:');errors.forEach(e=>console.error('- '+e));process.exit(1);}console.log('Arcade Quest 2.0 balanced-pass validation passed.');
