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

const main='arcade/quest/game/main-v4.js';
const config='arcade/quest/game/assets-config.js';
const runtime='arcade/quest/game/sprite-runtime.js';
const balance='arcade/quest/game/balance.js';
const stages='arcade/quest/game/stages.js';

has(config,"const ASSET_REVISION='v20260915-q3'",'Quest 3.0 asset revision');
has(config,"player:production('player/cheeky-main-sheet.png')",'raster main sprite');
has(config,"playerFight:production('player/cheeky-fight-sheet.png')",'raster fight sprite');
has(config,'stateMeta:mainState','main state metadata');
has(config,'stateMeta:fightState','player fighter metadata');
has(config,'stateMeta:retsuState','Retsu fighter metadata');
has(config,"'spritesheets:fighter':{frameWidth:248",'Retsu sheet metadata');
has(config,'nativeFacing:-1','native left-facing Retsu metadata');
has(config,"hazards:{bedroom:production('hazards/bedroom.png')",'production hazard artwork wiring');
has(config,'retsu-sheet.png');has(config,'alien-row-5.png');
has(config,"backgrounds:{\n      bedroom:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/bedroom/1787232895204-bedroom.webp'",'remote background baseline');

has(runtime,'Q.createSpriteAnimator=function','state-local animation clocks');
has(runtime,'if(anim.state!==nextState){anim.state=nextState;anim.time=0','animation reset on state entry');
has(runtime,'Q.spriteStateProfile=function','state profile runtime');
has(runtime,'Q.spriteWorldRect=function','ground-anchor runtime');
has(runtime,'Q.spriteHitbox=function','state-specific hitbox runtime');
has(runtime,'h.anchor===true','anchor-relative hitbox runtime');
has(runtime,'const flip=desiredFacing!==nativeFacing','native-facing mirror guard');
has(runtime,'Q.drawAnchoredSprite=function','anchored sprite renderer');

has(balance,'jumpVelocity:900','main jump tuning');
has(balance,'coyoteTime:.13','coyote-time tuning');
has(balance,'minimumDecisionGap:.78','decision spacing guard');
has(balance,'duration:22','short Electric Bead Run');
has(balance,'punchTelegraph:.52','readable punch warning');
has(balance,'kickTelegraph:.68','readable kick warning');
has(balance,'jumpVelocity:780,gravity:1500','fighter jump stays clear through low-kick active window');
has(balance,'rows:4,cols:8','reduced Alien Formation density');
not(balance,'Array.prototype.push','old global Array monkeypatch');
not(balance,'fireOnly','old fire-input monkeypatch');

for(const id of ['bedroom','budget','christmas','amiga','guru'])has(stages,`id:'${id}'`,`${id} stage definition`);
for(const mechanic of ["mechanic:'loading'","mechanic:'rack'","mechanic:'reverse'","mechanic:'workbench'","mechanic:'glitch'"])has(stages,mechanic);
has(stages,"duration:30,accent:'#6eeaff'",'shorter Bedroom duration');
has(stages,'bossHp:20','reduced Bedroom boss endurance');

has(main,"const PATTERNS={",'single authored threat-pattern table');
has(main,'function activeMandatoryThreat()','unresolved-threat guard');
not(main,'enemyTimer','independent ambient enemy timer');
has(main,"S.director.lastResponse=pat.r",'director response tracking');
has(main,"ctx.setTransform(1,0,0,1,0,0)",'frame transform reset');
has(main,"ctx.fillRect(0,0,Q.W,Q.H)",'explicit frame repaint');
has(main,"Q.drawAnchoredSprite(ctx,im,meta,stateName,P.anim.time",'state-local main sprite rendering');
has(main,"Q.drawAnchoredSprite(ctx,sheet,meta,stateName,f.anim.time",'state-local fighter rendering');
has(main,"phase:'telegraph'",'fighter telegraph phase');
has(main,"a.phase='active'",'fighter active phase');
has(main,"a.phase='recover'",'fighter recovery phase');
has(main,"float('CHECKPOINT'",'section checkpoint respawn feedback');
has(main,'forceFighterAttack','browser-test fighter hook');
for(const fn of ['drawCassette','drawTapeLoop','drawRewinder','drawShelf','drawPrice','drawBin','drawPresent','drawBauble','drawTinsel','drawDisk','drawWindow','drawGlitch','drawBeam','drawCorrupt'])has(main,`function ${fn}`,`${fn} detailed hazard renderer`);
for(const mode of ['startBeads','startFighter','startInvaders','startMaze'])has(main,`function ${mode}()`,`${mode} arcade section`);
has(main,"text('QUEST 3.0 REBUILD'",'Quest 3.0 title treatment');
not(main,"return P.duck&&P.ground?{x:P.x+4,y:P.y-4,w:70,h:131}",'legacy shallow crouch geometry');

has('arcade/quest/index.html','main-v4.js?v=20260915q3');
not('arcade/quest/index.html','main-v3.js?v=20260825q2','active Quest 2 engine include');
has('games/commodore-quest/index.html','main-v4.js?v=20260915q3');
not('games/commodore-quest/index.html','main-v3.js?v=20260825q2','active public Quest 2 engine include');
has('arcade/quest/index.html','class="rotate-prompt"');
has('games/commodore-quest/index.html','class="rotate-prompt"');
has('games/commodore-quest/index.html',"Cheeky's Commodore Quest 3.0 | Free C64 &amp; Amiga Browser Game",'public Quest 3.0 SEO title');
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
exists('arcade/quest/QUEST-3-REBUILD-SPEC.md');
exists('arcade/quest/tests/quest-v3-contract.mjs');
exists('arcade/quest/tests/quest-v3-browser.mjs');

has('arcade/quest/game/remote-assets.js',"REMOTE_GROUPS=new Set(['backgrounds','music','sfx'])");
has('arcade/quest/game/remote-assets.js','REMOTE_GROUPS.has(group)');
has('admin/js/arcade-assets.js',".in('asset_group',['backgrounds','music','sfx'])");
not('admin/js/arcade-assets.js','Tier-Tex Animation Sheet');
not('admin/js/arcade-assets.js','Alien Formation Sprites');
has('admin/arcade-assets.html','Gameplay art is protected');

if(errors.length){console.error('Arcade Quest 3.0 validation failed:');errors.forEach(e=>console.error('- '+e));process.exit(1);}console.log('Arcade Quest 3.0 rebuild validation passed.');
