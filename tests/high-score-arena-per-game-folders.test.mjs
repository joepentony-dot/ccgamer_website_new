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
  assert.equal(dropzone.score.screenMemoryBase,null);
  assert.equal(dropzone.score.reader,null);
  assert.equal(dropzone.score.runObserver,null);
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
 assert.equal(dropzone.overlay.status,'asset-staged-in-draft-pr');
 for(const item of dropzone.evidence.screenshots){
   const path=item.path.slice(1);
   const png=readBinary(new URL(path,root));
   assert.equal(png.readUInt32BE(16),320);
   assert.equal(png.readUInt32BE(20),200);
   assert.equal(item.sha256,digest(path));
 }
 assert.deepEqual(dropzone.score.screenPixelRectangle,{x:26,y:162,width:30,height:7,coordinateSpace:'320x200 user screenshot',meaning:'yellow four-digit current score; not a RAM address'});
 assert.equal(dropzone.score.gameOverSignature,null);
 assert.equal(dropzone.score.reader,null);
 assert.equal(dropzone.score.runObserver,null);
 assert.equal(dropzone.rollout.runtimeWired,false);
 assert.equal(dropzone.rollout.publicSubmissionEnabled,false);
});
