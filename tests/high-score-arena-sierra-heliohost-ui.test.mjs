import test from 'node:test';
import assert from 'node:assert/strict';
import { mountCrossfirePreview } from '../js/ccg-c64/arena-preview.js';
import {SIERRA_CROSSFIRE_CRT} from '../js/ccg-c64/game-catalog.js';
const ORIGIN='https://www.cheekycommodoregamer.co.uk';
const entry={...SIERRA_CROSSFIRE_CRT,approved:true,preferOverOtherFormats:true};
const bytes=new Uint8Array(entry.bytes);
const digest=Buffer.from(entry.sha256,'hex');
const subtle={digest:async()=>digest.buffer.slice(digest.byteOffset,digest.byteOffset+digest.byteLength)};
const link='?game='+entry.id+'&autoplay=1&start=1&scores=1';
class Element {
 constructor(doc,tag){this.ownerDocument=doc;this.tag=tag;this.textContent='';this.children=[];this.events=new Map();this.attributes={};this.removed=false;}
 setAttribute(a,v){this.attributes[a]=String(v);}
 removeAttribute(a){delete this.attributes[a];}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
 insertAdjacentElement(_,node){this.after=node;}
 addEventListener(e,cb){this.events.set(e,cb);}
 removeEventListener(e){this.events.delete(e);}
 closest(){return null;}
 remove(){this.removed=true;}
 find(fn){
  if(fn(this))return this;
  for(const item of this.children){const r=item.find(fn);if(r)return r;}
  return null;
 }
}
function fakeDocument(){
 const doc={createElement:t=>new Element(doc,t),createElementNS:(_ns,t)=>new Element(doc,t)};
 doc.head=doc.createElement('head');
 return doc;
}
function ram(score=0,gameOver=false){
 const b=new Uint8Array(65536);
 for(const [row,glyph] of [[0,20],[1,21],[3,22],[4,23],[13,20],
  [14,21],[16,22],[17,23]])b[0x400+row*40+39]=glyph;
 b.set([126,255,231,231,231,255,126,0],0x2800);
 b.set([126,231,231,126,231,231,126,0],0x2840);
 for(const start of [6,19])String(score).padStart(6,'0').split('').forEach((v,i)=>{
  b[0x400+(start+i)*40+39]=Number(v);
 });
 if(gameOver)for(const [col,v] of [[10,19],[11,10],[12,252],[13,10],
  [14,253],[15,10],[16,23],[20,0],[21,10],[22,254],
  [23,10],[24,23],[25,10],[26,22]])b[0x400+13*40+col]=v;
 return b;
}
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function reply(data){
 return {ok:true,headers:{get:()=>'application/json'},text:async()=>JSON.stringify(data)};
}
test('actual Sierra HUD F1/gameover drives two authenticated HelioHost POSTs only, with pending receipt',async()=>{
 const requests=[];
 const fetchImpl=async (url,options)=>{
  const json=options.body?JSON.parse(options.body):null;
  requests.push({url,method:options.method,headers:options.headers,body:json});
  if(url.endsWith('/v1/member/me'))return reply({account:{id:'01234567-89ab-4abc-8def-0123456789ab'}});
  if(url.endsWith('/v1/member/csrf'))return reply({csrf:'b'.repeat(64)});
  if(url.includes('/leaderboard'))return reply({ok:true,gameKey:'c64-crossfire-sierra-online',board:'alltime',challengeSlug:null,status:'available',records:[]});
  if(json?.action==='start')return reply({
   ok:true,status:'started',attemptId:'01234567-89ab-4abc-8def-0123456789ab',
   nonce:'a'.repeat(64),publicRankingUpdated:false,reviewRequired:true
  });
  if(json?.action==='finish')return reply({
   ok:true,status:'pending-review',scoreReceived:170,
   publicRankingUpdated:false,reviewRequired:true
  });
  throw Error('Unexpected HTTP request: '+url);
 };
 const doc=fakeDocument(),stage=doc.createElement('div');
 const controller=await mountCrossfirePreview({
  entry,bytes,stage,doc,subtle,
  launchQuery:link,scoreQuery:link,websiteOrigin:ORIGIN,scoreFetchImpl:fetchImpl
 });
 assert(controller);
 const panel=stage.after;
 assert(panel.find(x=>x.tag==='p'&&x.textContent==='SIERRA ONLINE CRT · HELIOHOST SUBMISSION REQUESTED'));
 // The happy-path driver must wait on the explicit bridge readiness promise,
 // then yield once so the dynamic import/status update is observable before
 // any synthetic F1/game-over frames are delivered.
 const ready=await controller.whenHelioHostReady();
 await turn();
 assert.equal(ready,true);
 assert(panel.find(x=>x.tag==='p'&&x.textContent==='SIGNED IN · START A NEW GAME TO REQUEST SCORE'));
 controller.observe(ram(0,true));
 assert.equal(controller.armFromUserF1(),true);
 controller.observe(ram(0));
 await turn();await turn();
 controller.observe(ram(10));
 controller.observe(ram(170));
 for(let i=0;i<25;i++)controller.observe(ram(170,true));
 await turn();await turn();
 const writes=requests.filter(x=>x.method==='POST');
 assert.deepEqual(writes.map(x=>x.body.action),['start','finish']);
 assert.equal(writes[0].body.gameKey,'c64-crossfire-sierra-online');
 assert.equal(writes[1].body.score,170);
 assert.equal(writes[1].body.diagnostic.stableGameOverFrames,25);
 assert.equal(writes[1].headers['X-CCG-CSRF'],'b'.repeat(64));
 assert(!writes.some(x=>x.body.accountId||x.body.email));
 assert(panel.find(x=>x.tag==='p'&&x.textContent==='SCORE 000170 RECEIVED · PENDING REVIEW'));
 assert(panel.find(x=>x.tag==='p'&&x.textContent==='GAME OVER · SCORE SUBMITTED FOR REVIEW'));
 controller.dispose();
});
test('without score opt-in, visitor and wrong-origin browser make no HelioHost request',async()=>{
 for(const [query,origin] of [
  ['',ORIGIN],['?game='+entry.id+'&autoplay=1&start=1',ORIGIN],
  [link,'https://example.invalid'],['?game='+entry.id+'&scores=0',ORIGIN],
  ['?game='+entry.id+'&scores=1&scores=1',ORIGIN]
 ]){
  let count=0;
  const doc=fakeDocument(),stage=doc.createElement('div');
  const controller=await mountCrossfirePreview({
   entry,bytes,stage,doc,subtle,scoreQuery:query,
   websiteOrigin:origin,scoreFetchImpl:async()=>{count++;throw Error('Forbidden');}
  });
  assert.equal(await controller.whenHelioHostReady(),false);
  controller.observe(ram(0,true));
  controller.armFromUserF1();
  controller.observe(ram(0));
  controller.observe(ram(170));
  for(let i=0;i<25;i++)controller.observe(ram(170,true));
  await turn();await turn();
  assert.equal(count,0,'No HTTP without exact same-origin explicit opt-in: '+query);
  controller.dispose();
 }
});
test('authenticated session failure does not forge submitted receipt or alter local score',async()=>{
 const calls=[];const doc=fakeDocument(),stage=doc.createElement('div');
 const controller=await mountCrossfirePreview({
  entry,bytes,stage,doc,subtle,scoreQuery:link,websiteOrigin:ORIGIN,
  scoreFetchImpl:async(url,options)=>{
   calls.push({url,method:options.method});
   return {ok:false,headers:{get:()=> 'application/json'},text:async()=>''};
  }
 });
 assert.equal(await controller.whenHelioHostReady(),false);
 controller.observe(ram(0,true));
 controller.armFromUserF1();
 controller.observe(ram(0));
 controller.observe(ram(150));
 for(let i=0;i<25;i++)controller.observe(ram(150,true));
 await turn();await turn();
 const p=stage.after;
 assert(p.find(x=>x.tag==='strong'&&x.textContent==='000150'));
 assert.equal(calls.filter(c=>c.method==='POST').length,0);
 assert(p.find(x=>x.tag==='p'&&x.textContent.includes('SCORE LOCAL ONLY')));
 assert(!p.find(x=>x.tag==='p'&&x.textContent.includes('RECEIVED · PENDING REVIEW')));
 controller.dispose();
});

test('score-enabled Sierra displays approved public ranking without member sign-in or score POST',async()=>{
 const requests=[];const doc=fakeDocument(),stage=doc.createElement('div');
 const controller=await mountCrossfirePreview({
  entry,bytes,stage,doc,subtle,scoreQuery:link,websiteOrigin:ORIGIN,
  scoreFetchImpl:async(url,options)=>{
   requests.push({url,method:options.method,credentials:options.credentials});
   if(url.includes('/leaderboard'))return reply({
    ok:true,gameKey:'c64-crossfire-sierra-online',board:'alltime',
    challengeSlug:null,status:'available',
    records:[{playerName:'Approved Player',score:170}]
   });
   return {ok:false,headers:{get:()=> 'application/json'},text:async()=>''};
  }
 });
 assert.equal(await controller.whenHelioHostReady(),false);
 await turn();
 const panel=stage.after;
 assert(panel.find(x=>x.tag==='span'&&x.textContent==='#1 Approved Player'));
 assert(panel.find(x=>x.tag==='span'&&x.textContent==='Approved Player, 170 points'));
 assert(requests.some(x=>x.url.includes('/leaderboard') &&
   x.method==='GET' && x.credentials==='omit'));
 assert(requests.some(x=>x.url.endsWith('/v1/member/me')&&x.method==='GET'));
 assert(!requests.some(x=>x.method==='POST'));
 controller.dispose();
});

test('one-click F1 waits for real asynchronous member readiness',async()=>{
 let releaseMember;
 const keys=[],posts=[];
 const transport=async(url,options)=>{
  if(url.endsWith('/v1/member/me'))return new Promise(resolve=>{releaseMember=resolve;});
  if(url.endsWith('/v1/member/csrf'))return reply({csrf:'b'.repeat(64)});
  if(url.includes('/leaderboard'))return reply({ok:true,gameKey:'c64-crossfire-sierra-online',board:'alltime',status:'available',challengeSlug:null,records:[]});
  const body=JSON.parse(options.body);posts.push(body);
  if(body.action==='start')return reply({ok:true,status:'started',attemptId:'01234567-89ab-4abc-8def-0123456789ab',nonce:'a'.repeat(64),reviewRequired:true,publicRankingUpdated:false});
  if(body.action==='finish')return reply({ok:true,status:'pending-review',scoreReceived:10,reviewRequired:true,publicRankingUpdated:false});
  throw Error('Unexpected score operation');
 };
 const doc=fakeDocument(),stage=doc.createElement('div');
 const player=await mountCrossfirePreview({entry,bytes,stage,doc,subtle,launchQuery:link,scoreQuery:link,websiteOrigin:ORIGIN,scoreFetchImpl:transport,
  startF1:()=>{keys.push('press');return true;},releaseF1:()=>keys.push('release')});
 for(let i=0;i<100&&!releaseMember;i++)await turn();
 assert.equal(typeof releaseMember,'function');
 for(let i=0;i<60;i++)player.observe(ram(0,true));
 assert.deepEqual(keys,[]);
 releaseMember(reply({account:{id:'01234567-89ab-4abc-8def-0123456789ab'}}));
 assert.equal(await player.whenHelioHostReady(),true);
 player.observe(ram(0,true));
 for(let i=0;i<8;i++)player.observe(ram(0,true));
 assert.deepEqual(keys,['press','release']);
 player.observe(ram(0));await turn();
 player.observe(ram(10));
 for(let i=0;i<25;i++)player.observe(ram(10,true));
 await turn();await turn();
 assert.deepEqual(posts.map(p=>p.action),['start','finish']);
 assert(stage.after.find(n=>n.tag==='p'&&n.textContent.includes('RECEIVED · PENDING REVIEW')));
 player.dispose();
});

test('offline handshake permits local one-click F1 with zero HelioHost POSTs',async()=>{
 const keys=[],calls=[];
 const doc=fakeDocument(),stage=doc.createElement('div');
 const player=await mountCrossfirePreview({entry,bytes,stage,doc,subtle,launchQuery:link,scoreQuery:link,websiteOrigin:ORIGIN,
  scoreFetchImpl:async(url,options)=>{calls.push(options.method);return {ok:false};},
  startF1:()=>{keys.push('press');return true;},releaseF1:()=>keys.push('release')});
 assert.equal(await player.whenHelioHostReady(),false);
 for(let i=0;i<34;i++)player.observe(ram(0,true));
 assert.deepEqual(keys,['press','release']);
 player.observe(ram(0));player.observe(ram(30));
 for(let i=0;i<25;i++)player.observe(ram(30,true));
 assert(!calls.includes('POST'));
 assert(!stage.after.find(n=>n.tag==='p'&&n.textContent.includes('RECEIVED · PENDING REVIEW')));
 player.dispose();
});

test('a hung HelioHost member request times out without holding the game hostage',async()=>{
 let late;const keys=[],calls=[];
 const doc=fakeDocument(),stage=doc.createElement('div');
 const player=await mountCrossfirePreview({entry,bytes,stage,doc,subtle,launchQuery:link,scoreQuery:link,websiteOrigin:ORIGIN,
  scoreFetchImpl:async(url,options)=>{
   calls.push(options.method);
   if(url.endsWith('/v1/member/me'))return new Promise(resolve=>{late=resolve});
   return {ok:false};
  },
  startF1:()=>{keys.push('press');return true;},releaseF1:()=>keys.push('release')});
 for(let i=0;i<100&&!late;i++)await turn();
 assert.equal(typeof late,'function');
 for(let i=0;i<292;i++)player.observe(ram(0,true));
 assert.deepEqual(keys,['press','release']);
 assert.equal(await player.whenHelioHostReady(),false);
 late(reply({account:{id:'01234567-89ab-4abc-8def-0123456789ab'}}));
 await turn();await turn();
 player.observe(ram(0));player.observe(ram(20));
 for(let i=0;i<25;i++)player.observe(ram(20,true));
 assert(!calls.includes('POST'));
 assert(stage.after.find(n=>n.tag==='p'&&String(n.textContent).includes('TIMED OUT')));
 player.dispose();
});

test('mobile Arena keeps a compact score strip and an independently scrolling expanded panel',async()=>{
 const css=await (await import('node:fs/promises')).readFile(
  new URL('../resources/css/ccg-high-score-arena-preview.css',import.meta.url),'utf8'
 );
 for(const expected of [
  '.ccg-c64-console.is-mobile-playing',
  '.ccg-c64-console.is-mobile-playing > .ccg-arena-preview {',
  'flex: 0 0 auto;',
  '.ccg-arena-preview__run {',
  '.ccg-arena-preview.is-mobile-open {',
  'overflow: auto;',
  'overscroll-behavior: contain;',
  '"game arena" minmax(0, 1fr)',
  '.ccg-c64-screen-stage[data-ccg-arena-frame="crossfire"]',
  'crossfire-original-frame.webp'
 ])assert(css.includes(expected),'Missing mobile Arena contract: '+expected);
 const doc=fakeDocument(),stage=doc.createElement('div');
 const controller=await mountCrossfirePreview({entry,bytes,stage,doc,subtle});
 assert(controller);
 assert.equal(stage.after.attributes['data-ccg-arena-mobile-status'],'compact');
 controller.dispose();
});
