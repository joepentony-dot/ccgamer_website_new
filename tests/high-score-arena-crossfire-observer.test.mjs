import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readCrossfireScreenScore, readCrossfireScreenLives
} from '../scripts/high-score-arena/read-crossfire-screen-score.mjs';
import {
  CROSSFIRE_GAME_ID, CROSSFIRE_PRG_SHA256,
  isCrossfireGameOverScreen, CrossfireRunObserver
} from '../scripts/high-score-arena/observe-crossfire-run.mjs';

// Real 80-byte screen RAM evidence from an identical, checksum-pinned PRG.
// Scores/lives: GitHub run 43938124747, job 133548043835.
// Independent no-hit grave + title: run 43940211417, job 133555418817.
const observed = {
  zero: '01010101010101010101010101010101010101010101010101010101010101010101010101010101010c0d000809000000000000000000000004052c1415101100000004050405040504050405040501',
  score775: '01010101010101010101010101010101010101010101010101010101010101010101010101010101010c0d000809000000000000000000000004052c1415080900000004050405040520212021181901',
  life1: '01010101010101010101010101010101010101010101010101010101010101010101010101010101010809000809000000000000000000000004052c1415080900000004050405040520212021181901',
  score1550: '01010101010101010101010101010101010101010101010101010101010101010101010101010101010809000809000000000000000000000004052c1415080900000004050405080918191819040501',
  life0: '01010101010101010101010101010101010101010101010101010101010101010101010101010101010405000809000000000000000000000004052c1415080900000004050405080918191819040501',
  score2325: '01010101010101010101010101010101010101010101010101010101010101010101010101010101010405000809000000000000000000000004052c14150809000000040504050c0d10110c0d181901',
  grave2325: '0303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030333340235360303',
  graveZero: '0303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030333340235360303',
  title: '0303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303120405060303030303030303030303030303030303'
};
function ram(hex) {
  const result = new Uint8Array(65536);
  const pairs=hex.match(/../g);
  assert.equal(pairs.length,80,'fixture is an exact 80-byte game capture');
  result.set(pairs.map(b=>parseInt(b,16)),0x7400);
  return result;
}
const exact = () => new CrossfireRunObserver({
  gameId:CROSSFIRE_GAME_ID,prgSHA256:CROSSFIRE_PRG_SHA256
});

test('actual normal-game HUD observations decode cumulative 0, 775, 1550, 2325',()=>{
  assert.equal(readCrossfireScreenScore(ram(observed.zero)),0);
  assert.equal(readCrossfireScreenScore(ram(observed.score775)),775);
  assert.equal(readCrossfireScreenScore(ram(observed.score1550)),1550);
  assert.equal(readCrossfireScreenScore(ram(observed.score2325)),2325);
});
test('actual lives counter decodes 2, 1, 0 without treating zero as gameover',()=>{
  assert.equal(readCrossfireScreenLives(ram(observed.zero)),2);
  assert.equal(readCrossfireScreenLives(ram(observed.life1)),1);
  assert.equal(readCrossfireScreenLives(ram(observed.life0)),0);
  assert.equal(readCrossfireScreenLives(ram(observed.title)),null);
});
test('real gameover art is identical with zero and 2325 but not title or HUD',()=>{
  assert.equal(observed.grave2325,observed.graveZero);
  for(const key of ['grave2325','graveZero']) {
    assert.equal(isCrossfireGameOverScreen(ram(observed[key])),true);
  }
  for(const key of ['title','zero','score775','life0']) {
    assert.equal(isCrossfireGameOverScreen(ram(observed[key])),false);
  }
});
test('normal three-life 2325-point run produces one result after 20 grave frames',()=>{
  const observer=exact();
  for(const key of ['zero','score775','life1','score1550','life0','score2325']) {
    assert.equal(observer.observe(ram(observed[key])),null,key);
  }
  for(let i=0;i<19;i++)assert.equal(observer.observe(ram(observed.grave2325)),null);
  const result=observer.observe(ram(observed.grave2325));
  assert.deepEqual(result,{
    kind:'diagnostic-final-score-candidate', gameId:'archive-02121',
    score:2325,livesAtLastHud:0,stableGraveFrames:20,
    trust:'unverified-client-session'
  });
  assert.equal(observer.observe(ram(observed.grave2325)),null,'no duplicate');
});
test('zero-score game can end but a transient HUD loss cannot submit a result',()=>{
  const observer=exact();
  for(const key of ['zero','life1','life0'])assert.equal(observer.observe(ram(observed[key])),null);
  assert.equal(observer.observe(ram(observed.title)),null,'title is not grave');
  assert.equal(observer.observe(ram(observed.graveZero)),null);
  assert.equal(observer.observe(ram(observed.life0)),null,'recovered HUD resets frame stability');
  for(let i=0;i<19;i++)assert.equal(observer.observe(ram(observed.graveZero)),null);
  assert.equal(observer.observe(ram(observed.graveZero))?.score,0);
});
test('rejects spoofed media claims, mid-run restores and incomplete life history',()=>{
  for(const cfg of [{gameId:'archive-02122',prgSHA256:CROSSFIRE_PRG_SHA256},
    {gameId:CROSSFIRE_GAME_ID,prgSHA256:'bad'}]) {
    const observer=new CrossfireRunObserver(cfg);
    assert.equal(observer.observe(ram(observed.zero)),null);
    assert.equal(observer.observe(ram(observed.life0)),null);
    for(let i=0;i<30;i++)assert.equal(observer.observe(ram(observed.grave2325)),null);
  }
  const resumed=exact();
  assert.equal(resumed.observe(ram(observed.score2325)),null);
  for(let i=0;i<30;i++)assert.equal(resumed.observe(ram(observed.grave2325)),null);
  const skipped=exact();
  assert.equal(skipped.observe(ram(observed.zero)),null);
  assert.equal(skipped.observe(ram(observed.life0)),null);
  for(let i=0;i<30;i++)assert.equal(skipped.observe(ram(observed.grave2325)),null);
  assert.throws(()=>new CrossfireRunObserver({stableFrames:1}),/20-500/);
});
