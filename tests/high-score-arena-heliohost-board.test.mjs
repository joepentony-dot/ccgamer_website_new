import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arenaLeaderboardUrl,readHelioHostArenaBoard
} from '../scripts/high-score-arena/client/heliohost-board.mjs';

const GAME='c64-crossfire-atlantis';
function jsonReply(data) {
  return {ok:true,headers:{get:()=> 'application/json; charset=utf-8'},
    text:async()=>JSON.stringify(data)};
}
test('Crossfire-only GET URL and bounded challenge selectors',()=>{
  const alltime=arenaLeaderboardUrl();
  assert.equal(new URL(alltime).hostname,'api.cheekycommodoregamer.co.uk');
  assert.equal(new URL(alltime).pathname,'/v1/arena/crossfire/leaderboard');
  assert.equal(new URL(alltime).searchParams.get('gameKey'),GAME);
  assert.equal(new URL(alltime).searchParams.get('board'),'alltime');
  assert.equal(arenaLeaderboardUrl({board:'alltime',challengeSlug:'fake'}),null);
  assert.equal(arenaLeaderboardUrl({board:'challenge',challengeSlug:'WRONG'}),null);
  assert.equal(arenaLeaderboardUrl({board:'challenge',challengeSlug:'crossfire-week-one'})
    .includes('challengeSlug=crossfire-week-one'),true);
  assert.equal(new URL(arenaLeaderboardUrl({board:'challenge'}))
    .searchParams.has('challengeSlug'),false);
});
test('reader is disabled unless explicitly activated; no browser cookies or POST',async()=>{
  let calls=0;
  const fake=async()=>{calls++;throw new Error('no requests expected');};
  assert.deepEqual(await readHelioHostArenaBoard({fetchImpl:fake}),
    {status:'unavailable',rows:[]});
  assert.deepEqual(await readHelioHostArenaBoard({enabled:true,board:'other',fetchImpl:fake}),
    {status:'unavailable',rows:[]});
  assert.equal(calls,0);
});
test('approved five-only HelioHost records render, never private identity fields',async()=>{
  const calls=[];
  const data={
    ok:true,gameKey:GAME,board:'alltime',challengeSlug:null,status:'available',
    records:Array.from({length:7},(_,i)=>({
      playerName:'Player '+i,score:2325-i,accountId:'private',email:'private@test.invalid'
    }))
  };
  const result=await readHelioHostArenaBoard({
    enabled:true,fetchImpl:async(url,opts)=>{calls.push({url,opts});return jsonReply(data);}
  });
  assert.equal(result.status,'ranked');
  assert.equal(result.rows.length,5);
  assert.deepEqual(result.rows[0],{rank:1,name:'Player 0',score:2325});
  assert.equal(JSON.stringify(result).includes('private'),false);
  assert.equal(calls.length,1);
  assert.equal(calls[0].opts.method,'GET');
  assert.equal(calls[0].opts.credentials,'omit');
  assert.equal(calls[0].opts.cache,'no-store');
  assert.equal(calls[0].opts.redirect,'error');
});
test('auto-discovered current challenge is accepted but wrong event is rejected',async()=>{
  const data={ok:true,gameKey:GAME,board:'challenge',challengeSlug:'crossfire-week-one',
    status:'available',records:[{playerName:'Player',score:775}]};
  const get=async()=>jsonReply(data);
  assert.deepEqual(await readHelioHostArenaBoard({
    enabled:true,board:'challenge',fetchImpl:get
  }),{status:'ranked',rows:[{rank:1,name:'Player',score:775}]});
  assert.deepEqual(await readHelioHostArenaBoard({
    enabled:true,board:'challenge',challengeSlug:'crossfire-week-two',fetchImpl:get
  }),{status:'unavailable',rows:[]});
  assert.deepEqual(await readHelioHostArenaBoard({
    enabled:true,board:'challenge',fetchImpl:async()=>jsonReply({
      ...data,challengeSlug:null,status:'no-published-challenge',records:[]
    })
  }),{status:'no-challenge',rows:[]});
});
test('pilot/unavailable, wrong edition, offline, invalid JSON and oversized response fail closed',async()=>{
  const valid={ok:true,gameKey:GAME,board:'alltime',status:'available',
    records:[{playerName:'Player',score:775}]};
  for(const response of [
    {ok:false,text:async()=>JSON.stringify(valid)},
    jsonReply({...valid,gameKey:'crossfire-tron'}),
    jsonReply({...valid,status:'unavailable'}),
    jsonReply({...valid,records:[{playerName:'Cheat',score:-100}]}),
    {ok:true,text:async()=>'{not-json'},
    {ok:true,text:async()=>'{'.repeat(5000)},
    {ok:true,headers:{get:()=> 'text/html'},text:async()=>JSON.stringify(valid)}
  ]) {
    const model=await readHelioHostArenaBoard({enabled:true,fetchImpl:async()=>response});
    assert.equal(model.rows.length,0);
  }
  assert.deepEqual(await readHelioHostArenaBoard({
    enabled:true,fetchImpl:async()=>{throw new Error('offline');}
  }),{status:'unavailable',rows:[]});
});
