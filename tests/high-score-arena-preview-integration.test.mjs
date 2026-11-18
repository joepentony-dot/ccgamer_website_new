import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  verifyCrossfirePreviewMedia, mountCrossfirePreview
} from '../js/ccg-c64/arena-preview.js';
import { SIERRA_CROSSFIRE_CRT } from '../js/ccg-c64/game-catalog.js';

const entry={
  ...SIERRA_CROSSFIRE_CRT,
  approved:true,preferOverOtherFormats:true
};
const bytes=new Uint8Array(SIERRA_CROSSFIRE_CRT.bytes);
const validSHA=Buffer.from(entry.sha256,'hex');
const fakeCrypto={
  digest:async (_algo,input)=>{
    assert.equal(input,bytes);
    return validSHA.buffer.slice(validSHA.byteOffset,validSHA.byteOffset+validSHA.byteLength);
  }
};

test('normal verified Sierra CRT LOAD enables Arena without a special URL',()=>{
  const app=readFileSync(new URL('../js/ccg-c64/app.js',import.meta.url),'utf8');
  assert.doesNotMatch(app,/arenaPreviewRequested|ccg_arena_preview/);
  assert.match(app,/if \(!screenStage \|\| !isVerifiedSierraCrossfireCrt\(entry\)\) return;/);
  assert.match(app,/if \(queued && isVerifiedSierraCrossfireCrt\(entry\)\)/);
});

test('exact SHA-verified Sierra Online CRT only; Tron and old Atlantis PRG are refused',async()=>{
  assert.equal(await verifyCrossfirePreviewMedia(entry,bytes,fakeCrypto),true);
  for(const invalid of [
    {...entry,id:'archive-02121',format:'prg'},
    {...entry,id:'archive-02122',format:'prg'},
    {...entry,title:'Crossfire'}, {...entry,url:'/emulator/c64/media/fake.crt'},
    {...entry,bytes:23637},{...entry,approved:false},
    {...entry,preferOverOtherFormats:false},{...entry,sha256:'a'.repeat(64)}
  ]) assert.equal(await verifyCrossfirePreviewMedia(invalid,bytes,fakeCrypto),false);
  assert.equal(await verifyCrossfirePreviewMedia(entry,bytes.subarray(0,50),fakeCrypto),false);
  assert.equal(await verifyCrossfirePreviewMedia(entry,bytes,{
    digest:async()=>new Uint8Array(32).buffer
  }),false);
  assert.equal(await verifyCrossfirePreviewMedia(entry,bytes,null),false);
});

class FakeElement {
  constructor(doc,tag){
    this.ownerDocument=doc;this.tag=tag;this.children=[];this.events=new Map();
    this.attributes={};this.textContent='';this.removed=false;
  }
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(name){delete this.attributes[name];}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[...items];}
  insertAdjacentElement(_where,node){this.after=node;}
  addEventListener(name,handler){this.events.set(name,handler);}
  click(){this.events.get('click')?.();}
  remove(){this.removed=true;}
  find(predicate){
    if(predicate(this))return this;
    for(const child of this.children){const found=child.find(predicate);if(found)return found;}
    return null;
  }
}
function fakeDocument(){
  const doc={
    createElement(tag){return new FakeElement(doc,tag);},
    createElementNS(_ns,tag){return new FakeElement(doc,tag);}
  };
  doc.head=doc.createElement('head');
  return doc;
}

test('Sierra CRT gets neon frame and empty rankings, never an invented score',async()=>{
  const doc=fakeDocument(),stage=doc.createElement('div');
  const candidate=await mountCrossfirePreview({entry,bytes,stage,doc,subtle:fakeCrypto});
  assert(candidate);
  const panel=stage.after;
  assert.equal(panel.attributes['data-ccg-arena-preview'],'crossfire');
  assert.equal(stage.attributes['data-ccg-arena-frame'],'crossfire');
  assert.equal(doc.head.children.length,1);
  assert.equal(panel.find(x=>x.tag==='p'&&x.textContent==='SIERRA ONLINE CRT · SCORE SUBMISSIONS DISABLED')!==null,true);
  assert.equal(panel.find(x=>x.tag==='p'&&x.textContent==='PRESS F1 TO START')!==null,true);
  assert.equal(panel.find(x=>x.tag==='p'&&x.textContent==='CRT SCORE DETECTION NOT YET VERIFIED')!==null,true);
  const slots=panel.find(x=>x.tag==='ol');
  assert.equal(slots.children.length,5);
  const buttons=[];
  (function visit(n){if(n.tag==='button')buttons.push(n);for(const child of n.children)visit(child);})(panel);
  assert.equal(buttons.length,2);
  assert.equal(buttons[0].attributes['aria-pressed'],'true');
  buttons[1].click();
  assert.equal(buttons[1].attributes['aria-pressed'],'true');
  assert(panel.find(x=>x.tag==='p'&&x.textContent==='NO PUBLISHED CHALLENGE'));
  candidate.observe(new Uint8Array(65536));
  assert(panel.find(x=>x.tag==='p'&&x.textContent==='CRT SCORE DETECTION NOT YET VERIFIED'));
  candidate.invalidate();
  assert(panel.find(x=>x.tag==='p'&&x.textContent.includes('NO SCORE RECORDED')));
  candidate.dispose();
  assert.equal(panel.removed,true);
  assert.equal(doc.head.children[0].removed,true);
  assert.equal(stage.attributes['data-ccg-arena-frame'],undefined);
  candidate.dispose();
});

test('even injected backend readers and attempt factories cannot use PRG-era records on CRT',async()=>{
  let reads=0,handshakes=0;
  const doc=fakeDocument(),stage=doc.createElement('div');
  const candidate=await mountCrossfirePreview({
    entry,bytes,stage,doc,subtle:fakeCrypto,
    publicBoardRead:async()=>{reads++;return {rows:[{rank:1,name:'Wrong PRG',score:2325}]};},
    arenaAttemptFactory:async()=>{handshakes++;return {enabled:true};}
  });
  assert(candidate);
  await Promise.resolve();await Promise.resolve();
  assert.equal(reads,0);
  assert.equal(handshakes,0);
  assert.equal(stage.after.find(x=>x.tag==='span'&&x.textContent?.includes('Wrong PRG')),null);
  candidate.observe(new Uint8Array(65536));
  candidate.dispose();
});

test('stale or invalid CRT media cannot attach a frame',async()=>{
  const doc=fakeDocument(),stage=doc.createElement('div');
  let current=true;
  const stale=mountCrossfirePreview({
    entry,bytes,stage,doc,
    subtle:{async digest(...args){
      const hash=await fakeCrypto.digest(...args);
      current=false;
      return hash;
    }},
    isCurrent:()=>current
  });
  assert.equal(await stale,null);
  assert.equal(stage.after,undefined);
  assert.equal(doc.head.children.length,0);
  const wrong=await mountCrossfirePreview({
    entry:{...entry,id:'archive-02122'},bytes,stage,doc,subtle:fakeCrypto
  });
  assert.equal(wrong,null);
  assert.equal(doc.head.children.length,0);
});

test('browser selection and source forbid legacy PRG or score submission',async()=>{
  const { ARENA_CROSSFIRE_PROFILE }=await import('../js/ccg-c64/arena/arena-game-profiles.mjs');
  assert.equal(ARENA_CROSSFIRE_PROFILE.publicSubmissionEnabled,false);
  assert.equal(ARENA_CROSSFIRE_PROFILE.media.format,'crt');
  const source=readFileSync(new URL('../js/ccg-c64/arena-preview.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/CrossfireAutomaticAttempt|readHelioHostArenaBoard|createArenaDiagnosticObserver/);
  assert.doesNotMatch(source,/\.from\s*\(\s*['"]ccg_arena_attempts|\.insert\(|\.upsert\(/);
  const app=readFileSync(new URL('../js/ccg-c64/app.js',import.meta.url),'utf8');
  assert.doesNotMatch(app,/arenaPreviewRequested|ccg_arena_preview/);
  assert.match(app,/if \(queued && isVerifiedSierraCrossfireCrt\(entry\)\)/);
  assert.doesNotMatch(app,/arenaSubmissionRequested|arenaArchiveEntry|if \\(queued && entry\\.id === "archive-02121"\\)/);
  assert.match(app,/formerCrossfireArchiveEntry/,
    'Only the verified historical bookmark ID may be retained, never a PRG Arena mount');
  assert.match(app,/async function queueMedia\([^]*?clearArenaPreview\(\)/);
  assert.match(app,/function resetMachine\([^]*?clearArenaPreview\(\)/);
  assert.match(app,/async function loadGameVaultSlot\([^]*?clearArenaPreview\(\)/);
});


test('authentic Sierra CRT score 000010 is displayed locally without inventing ranked scores',async()=>{
  // Values reproduce screen-memory and custom glyph strips from real 65,728
  // byte Sierra cartridge captures 44340060196 (two independent 10-point runs).
  // No simulated backend score row or manual score submission is ever created.
  const hud=(score)=>{
    const ram=new Uint8Array(65536);
    for(const [row,value] of [[0,20],[1,21],[3,22],[4,23],
      [13,20],[14,21],[16,22],[17,23]])ram[0x400+row*40+39]=value;
    ram.set([126,255,231,231,231,255,126,0],0x2800);
    ram.set([126,231,231,126,231,231,126,0],0x2840);
    for(const [rows,value] of [
      [[19,20,21,22,23,24],score],[[6,7,8,9,10,11],score]
    ])String(value).padStart(6,'0').split('').forEach((digit,i)=>{
      ram[0x400+rows[i]*40+39]=Number(digit);
    });
    return ram;
  };
  const doc=fakeDocument(),stage=doc.createElement('div');
  const candidate=await mountCrossfirePreview({entry,bytes,stage,doc,subtle:fakeCrypto});
  assert(candidate);
  const panel=stage.after;
  const value=panel.find(x=>x.tag==='strong' && x.attributes['aria-label']?.includes('local score'));
  assert(value);
  assert.equal(value.textContent,'—');
  candidate.observe(hud(0));
  assert.equal(value.textContent,'000000');
  candidate.observe(hud(10));
  assert.equal(value.textContent,'000010');
  assert(panel.find(x=>x.tag==='p' && x.textContent.includes('NOT VERIFIED OR SUBMITTED')));
  const slots=panel.find(x=>x.tag==='ol');
  assert.equal(slots.children.length,5);
  assert(slots.children.every(x=>!String(x.textContent||'').includes('000010')));
  candidate.observe(new Uint8Array(65536)); // unrelated RAM fails closed
  assert.equal(value.textContent,'000010');
  candidate.invalidate();
  assert.equal(value.textContent,'—');
  candidate.dispose();
});
