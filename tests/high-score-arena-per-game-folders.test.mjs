import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const load = slug => JSON.parse(readFileSync(new URL(`../js/ccg-c64/arena/games/${slug}/profile.json`,import.meta.url),'utf8'));
test('each game keeps a separate score profile without activating unverified games',()=>{
  const [crossfire,dropzone,taxi]=['crossfire','dropzone','space-taxi'].map(load);
  assert.equal(new Set([crossfire.gameKey,dropzone.gameKey,taxi.gameKey]).size,3);
  assert.equal(dropzone.media.file,'dropzone.crt');
  assert.equal(dropzone.media.byteLength,82144);
  assert.equal(dropzone.media.sha256,'0bed973b322510b8a8b717fc7305ec54246dc3b00c0aa0f701702864c92253c7');
  assert.equal(dropzone.controls.joystickPort,2);
  assert.equal(dropzone.score.hudLocation,'bottom-left');
  assert.equal(dropzone.score.screenMemoryBase,"0xB800");
  assert.equal(dropzone.score.reader,"./score-reader.mjs");
  assert.equal(dropzone.score.runObserver,"./run-observer.mjs");
  assert.equal(dropzone.rollout.publicSubmissionEnabled,false);
  assert.equal(taxi.media.sha256,null);
  assert.equal(taxi.score.reader,null);
  assert.equal(taxi.rollout.runtimeWired,false);
  assert.equal(crossfire.overlay.path,'/resources/images/high-score-arena/crossfire-original-frame.webp');
});

import { createHash } from 'node:crypto';
import { readFileSync as readBinary } from 'node:fs';
test('real Dropzone art and owner-supplied evidence match pinned SHA-256',()=>{
 const dropzone=load('dropzone');
 const root = new URL('../',import.meta.url);
 const digest=p=>createHash('sha256').update(readBinary(new URL(p,root))).digest('hex');
 const art=readBinary(new URL('resources/images/high-score-arena/dropzone/overlay.webp',root));
 assert.equal(art.toString('ascii',0,4),'RIFF');
 assert.equal(art.toString('ascii',8,12),'WEBP');
 assert.equal(art.length,354446);
 assert.equal(dropzone.overlay.sha256,digest('resources/images/high-score-arena/dropzone/overlay.webp'));
 assert.equal(dropzone.overlay.status,'visual-frame-wired-draft-only');
 for(const item of dropzone.evidence.screenshots){
   const path=item.path.slice(1);
   const png=readBinary(new URL(path,root));
   assert.equal(png.readUInt32BE(16),320);
   assert.equal(png.readUInt32BE(20),200);
   assert.equal(item.sha256,digest(path));
 }
 assert.deepEqual(dropzone.score.screenPixelRectangle,{x:26,y:162,width:30,height:7,coordinateSpace:'320x200 user screenshot',meaning:'yellow four-digit current score; not a RAM address'});
 assert.equal(dropzone.score.gameOverSignature.requireConsecutiveFrames,25);
 assert.equal(dropzone.score.reader,"./score-reader.mjs");
 assert.equal(dropzone.score.runObserver,"./run-observer.mjs");
 assert.equal(dropzone.rollout.runtimeWired,true);
 assert.equal(dropzone.rollout.publicSubmissionEnabled,false);
});

test('Dropzone visual wiring is exact-media-only and cannot post unverified scores', async()=>{
  const {verifyDropzoneMedia,DROPZONE_CRT}=await import('../js/ccg-c64/arena/games/dropzone/preview.mjs');
  const {webcrypto}=await import('node:crypto');
  const match={...DROPZONE_CRT,approved:true};
  assert.equal(await verifyDropzoneMedia(match,new Uint8Array(82144),webcrypto.subtle),false);
  assert.equal(await verifyDropzoneMedia({...match,sha256:'0'.repeat(64)},new Uint8Array(82144),webcrypto.subtle),false);
  assert.equal(await verifyDropzoneMedia({...match,bytes:1},new Uint8Array(82144),webcrypto.subtle),false);
  const fs=await import('node:fs');
  const app=fs.readFileSync(new URL('../js/ccg-c64/app.js',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('../resources/css/ccg-high-score-arena-dropzone.css',import.meta.url),'utf8');
  const mod=fs.readFileSync(new URL('../js/ccg-c64/arena/games/dropzone/preview.mjs',import.meta.url),'utf8');
  assert.match(app,/isDropzoneArenaEntry\(entry\)/);
  assert.match(css,/data-ccg-arena-frame="dropzone"/);
  assert.match(css,/\/high-score-arena\/dropzone\/overlay.webp/);
  assert.doesNotMatch(mod,/\b(fetch|XMLHttpRequest|sendBeacon)\s*\(/);
  assert.equal(load('dropzone').rollout.publicSubmissionEnabled,false);
});


test("Dropzone local HUD decoder reproduces real-ROM 0 and 10 transitions and rejects title RAM",async()=>{
  const {readDropzoneHudScore,DROPZONE_SCORE_LAYOUT}=await import("../js/ccg-c64/arena/games/dropzone/score-reader.mjs");
  const capture=JSON.parse(readFileSync(new URL("../tests/fixtures/high-score-arena/dropzone/real-ram-score-observations.json",import.meta.url),"utf8"));
  assert.equal(DROPZONE_SCORE_LAYOUT.firstAddress,0xBB20);
  assert.equal(DROPZONE_SCORE_LAYOUT.lastAddress,0xBB26);
  for(const observation of capture.observations){
    const ram=new Uint8Array(65536);
    ram.set(observation.rawScreen16,0xBB20);
    const actual=readDropzoneHudScore(ram,{screenBase:observation.screenBase??capture.screenBase});
    assert.equal(actual,observation.expectedScore,observation.label);
  }
  const ram=new Uint8Array(65536);ram.set(capture.observations[1].rawScreen16,0xBB20);
  assert.equal(readDropzoneHudScore(ram,{screenBase:0xF000}),null);
  assert.equal(readDropzoneHudScore(ram.subarray(0,100),{screenBase:0xB800}),null);
  ram[0xBB2A]=0;
  assert.equal(readDropzoneHudScore(ram,{screenBase:0xB800}),null);
  ram.set(capture.observations[1].rawScreen16,0xBB20);
  ram[0xBB21]=11;
  assert.equal(readDropzoneHudScore(ram,{screenBase:0xB800}),null);
  assert.equal(load("dropzone").rollout.publicSubmissionEnabled,false);
  assert.equal(load("dropzone").score.runObserver,"./run-observer.mjs");
});

test("Dropzone original-ROM terminal screen requires stable video and a real zero-to-positive score",async()=>{
  const {dropzoneGameOverVisible,DropzoneLocalRunObserver}=await import("../js/ccg-c64/arena/games/dropzone/run-observer.mjs");
  const evidence=JSON.parse(readFileSync(new URL("../tests/fixtures/high-score-arena/dropzone/terminal-video-evidence.json",import.meta.url),"utf8"));
  function frame(sample){
    const ram=new Uint8Array(65536);
    ram.set(sample.hud,0xBB20);
    const frameBuffer=new Uint8ClampedArray(384*272*4);
    evidence.bands.forEach((b,g)=>{
      const packed=Uint8Array.from(sample.bands[g].match(/../g),x=>Number.parseInt(x,16));
      let n=0;
      for(let y=b.y0;y<b.y1;y++)for(let x=b.x0;x<b.x1;x+=2){
        if(packed[n>>3]&(128>>(n&7))){
          const p=(y*384+x)*4;
          frameBuffer[p]=frameBuffer[p+1]=frameBuffer[p+2]=255;
        }
        n++;
      }
      assert.equal(n,b.bits);
    });
    return {ram,frameBuffer,screenBase:sample.screenBase};
  }
  const byName=name=>frame(evidence.samples.find(x=>x.name===name));
  for(const sample of evidence.samples){
    assert.equal(dropzoneGameOverVisible(frame(sample).frameBuffer),sample.over,sample.name);
  }
  const observer=new DropzoneLocalRunObserver();
  assert.equal(observer.observe(byName("fire2-edge3-350f")).score,0);
  assert.equal(observer.observe(byName("fire2-edge3-800f")).score,10);
  assert.equal(observer.observe(byName("no-input-2600")).score,280);
  for(let i=0;i<24;i++)assert.equal(observer.observe(byName("no-input-2750")).phase,"terminal");
  const completed=observer.observe(byName("no-input-2825"));
  assert.deepEqual(completed,{phase:"completed",score:280,justCompleted:true,localOnly:true});
  assert.equal(observer.observe(byName("no-input-3350")).justCompleted,false);
  assert.equal(observer.observe(byName("no-input-3425")).score,280);
  assert.equal(observer.observe(byName("fire2-edge3-350f")).score,0);
  const unarmed=new DropzoneLocalRunObserver();
  for(let n=0;n<40;n++)assert.notEqual(unarmed.observe(byName("no-input-2750")).phase,"completed");
  const resetBeforeOver=new DropzoneLocalRunObserver();
  resetBeforeOver.observe(byName("fire2-edge3-350f"));
  resetBeforeOver.observe(byName("fire2-edge3-800f"));
  resetBeforeOver.observe(byName("no-input-3425"));
  for(let n=0;n<30;n++)assert.notEqual(resetBeforeOver.observe(byName("no-input-2750")).phase,"completed");
  assert.equal(load("dropzone").rollout.publicSubmissionEnabled,false);
});
