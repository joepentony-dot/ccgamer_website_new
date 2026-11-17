import test from 'node:test';
import assert from 'node:assert/strict';
import {
  displayArenaScore, normaliseArenaBoard, SEVEN_SEGMENTS
} from '../js/high-score-arena/arena-board.mjs';

test('pinball digit presentation covers verified Crossfire points',()=>{
  assert.equal(displayArenaScore(0),'000000');
  assert.equal(displayArenaScore(775),'000775');
  assert.equal(displayArenaScore(1550),'001550');
  assert.equal(displayArenaScore(2325),'002325');
  assert.equal(displayArenaScore(-1),'------');
  assert.equal(displayArenaScore(1234567),'------');
  assert.equal(SEVEN_SEGMENTS['8'],'abcdefg');
  assert.throws(()=>displayArenaScore(10,10),/digit width/);
});

test('unpublished and mismatched board data cannot show any score',()=>{
  const expected={gameKey:'c64-crossfire-atlantis',board:'alltime'};
  assert.deepEqual(normaliseArenaBoard(null,expected),{status:'unavailable',rows:[]});
  assert.deepEqual(normaliseArenaBoard({
    ok:true,status:'unavailable',gameKey:expected.gameKey,board:'alltime',
    records:[{playerName:'Test',score:999999}]
  },expected),{status:'unavailable',rows:[]});
  assert.deepEqual(normaliseArenaBoard({
    ok:true,status:'available',gameKey:'crossfire-tron',board:'alltime',
    records:[{playerName:'Test',score:999999}]
  },expected),{status:'unavailable',rows:[]});
});

test('public renderer model copies only player name and score',()=>{
  const expected={gameKey:'c64-crossfire-atlantis',board:'alltime'};
  const value=normaliseArenaBoard({
    ok:true,status:'available',gameKey:expected.gameKey,board:'alltime',
    records:[{playerName:'Test',score:775,email:'secret@example.com',user_id:'private'}]
  },expected);
  assert.deepEqual(value,{status:'ranked',rows:[{rank:1,name:'Test',score:775}]});
  assert.equal(JSON.stringify(value).includes('secret@example.com'),false);
});

test('challenge boards are pinned to their own selected slug',()=>{
  const expected={gameKey:'c64-crossfire-atlantis',board:'challenge',challengeSlug:'crossfire-week-one'};
  const value=normaliseArenaBoard({
    ok:true,status:'available',gameKey:expected.gameKey,board:'challenge',challengeSlug:'wrong',
    records:[{playerName:'Test',score:775}]
  },expected);
  assert.deepEqual(value,{status:'unavailable',rows:[]});
});
