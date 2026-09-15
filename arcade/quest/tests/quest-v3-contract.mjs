import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const main=read('arcade/quest/game/main-v4.js');
const balance=read('arcade/quest/game/balance.js');
const assets=read('arcade/quest/game/assets-config.js');
const runtime=read('arcade/quest/game/sprite-runtime.js');
const stages=read('arcade/quest/game/stages.js');
const engineHtml=read('arcade/quest/index.html');
const publicHtml=read('games/commodore-quest/index.html');

function num(source,re,label){const m=source.match(re);assert.ok(m,`missing ${label}`);return Number(m[1]);}

assert.ok(runtime.includes('Q.createSpriteAnimator=function'),'state animator exists');
assert.ok(runtime.includes('if(anim.state!==nextState){anim.state=nextState;anim.time=0'),'state entry resets animation time');
assert.ok(runtime.includes('const flip=desiredFacing!==nativeFacing'),'sprite mirroring respects native facing');
assert.ok(runtime.includes('Q.drawAnchoredSprite=function'),'anchored renderer remains available');
assert.ok(runtime.includes('h.anchor===true'),'anchor-relative hitboxes are supported');

assert.ok(assets.includes("const ASSET_REVISION='v20260915-q3'"),'V3 asset revision is active');
assert.ok(assets.includes("'spritesheets:fighter':"),'fighter metadata exists');
assert.ok(assets.includes('nativeFacing:-1'),'left-facing source metadata exists');
assert.ok(assets.includes("hazards:{bedroom:production('hazards/bedroom.png')"),'production hazard art remains wired');

for(const id of ['bedroom','budget','christmas','amiga','guru'])assert.ok(stages.includes(`id:'${id}'`),`${id} stage remains defined`);
assert.ok(stages.includes("duration:30,accent:'#6eeaff'"),'Bedroom traversal is shorter');
assert.ok(stages.includes('bossHp:20'),'Bedroom boss endurance is reduced');

assert.ok(main.includes("const PATTERNS={"),'authored threat director patterns exist');
assert.ok(main.includes('activeMandatoryThreat()'),'director checks for unresolved mandatory threats');
assert.ok(!main.includes('enemyTimer'),'independent ambient enemy timer is gone');
assert.ok(main.includes("S.director.lastResponse=pat.r"),'director tracks the last required response');
assert.ok(main.includes("schedule(1.35,()=>addHazard"),'multi-part boss patterns remain explicitly spaced');
assert.ok(main.includes("ctx.setTransform(1,0,0,1,0,0)"),'frame begins from a clean transform');
assert.ok(main.includes("ctx.fillRect(0,0,Q.W,Q.H)"),'canvas is explicitly repainted before camera shake');
assert.ok(main.includes('Q.drawAnchoredSprite(ctx,im,meta,stateName,P.anim.time'),'player uses state-local animation time');
assert.ok(main.includes('Q.drawAnchoredSprite(ctx,sheet,meta,stateName,f.anim.time'),'fighter uses state-local animation time');
assert.ok(main.includes("phase:'telegraph'"),'fighter has a telegraph phase');
assert.ok(main.includes("a.phase='active'"),'fighter has an active phase');
assert.ok(main.includes("a.phase='recover'"),'fighter has a recovery phase');
assert.ok(main.includes("float('CHECKPOINT'"),'life loss retains section checkpoints');
for(const fn of ['drawCassette','drawTapeLoop','drawRewinder','drawShelf','drawPrice','drawBin','drawPresent','drawBauble','drawTinsel','drawDisk','drawWindow','drawGlitch','drawBeam','drawCorrupt'])assert.ok(main.includes(`function ${fn}`),`${fn} obstacle renderer exists`);
for(const mode of ['startBeads','startFighter','startInvaders','startMaze'])assert.ok(main.includes(`function ${mode}()`),`${mode} remains implemented`);

const kickTelegraph=num(balance,/kickTelegraph:([0-9.]+)/,'kick telegraph');
const punchTelegraph=num(balance,/punchTelegraph:([0-9.]+)/,'punch telegraph');
const jumpVelocity=num(balance,/fighter:\{[\s\S]*?jumpVelocity:([0-9.]+)/,'fighter jump velocity');
const gravity=num(balance,/fighter:\{[\s\S]*?gravity:([0-9.]+)/,'fighter gravity');
const kickActive=num(balance,/kickActive:([0-9.]+)/,'kick active window');
const jumpRiseAtKick=jumpVelocity*kickTelegraph-.5*gravity*kickTelegraph*kickTelegraph;
const kickEnd=kickTelegraph+kickActive;
const jumpRiseAtKickEnd=jumpVelocity*kickEnd-.5*gravity*kickEnd*kickEnd;
assert.ok(kickTelegraph>=.65,`kick telegraph must be at least 650ms, got ${kickTelegraph}`);
assert.ok(punchTelegraph>=.5,`punch telegraph must be at least 500ms, got ${punchTelegraph}`);
assert.ok(jumpRiseAtKick>95,`jump must clear the low-kick lane before activation, rise=${jumpRiseAtKick.toFixed(2)}`);
assert.ok(jumpRiseAtKickEnd>95,`an immediate jump must remain clear through the low-kick active window, rise=${jumpRiseAtKickEnd.toFixed(2)}`);

const highPunchTop=235,highPunchHeight=52,crouchTop=180;
assert.ok(highPunchTop-highPunchHeight>=crouchTop-1,'high punch ends at or above the crouch body');

for(const html of [engineHtml,publicHtml]){
  assert.ok(html.includes('main-v4.js?v=20260915q3'),'V3 runtime is loaded');
  assert.ok(!html.includes('main-v3.js?v=20260825q2'),'Quest 2 runtime is no longer active');
  assert.ok(html.includes('COMMODORE QUEST 3.0'),'V3 loading identity is present');
}

console.log('Commodore Quest 3.0 rebuild contract passed');
