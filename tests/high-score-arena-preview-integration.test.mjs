import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  previewRequestEnabled, verifyCrossfirePreviewMedia, mountCrossfirePreview
} from "../js/ccg-c64/arena-preview.js";

const entry={
  id:"archive-02121",format:"prg",
  sha256:"ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9"
};
const bytes = new Uint8Array(23637);
const validSHA=Buffer.from(entry.sha256,"hex");
const fakeCrypto={
  digest: async (_algo, input)=>{
    assert.equal(input,bytes);
    return validSHA.buffer.slice(validSHA.byteOffset,validSHA.byteOffset+validSHA.byteLength);
  }
};

test("preview requires explicit query opt-in",()=>{
  assert.equal(previewRequestEnabled(""),false);
  assert.equal(previewRequestEnabled("?ccg_arena_preview=crossfire"),true);
  assert.equal(previewRequestEnabled("?ccg_arena_preview=crossfire-tron"),false);
  assert.equal(previewRequestEnabled("?foo=bar"),false);
});
test("only byte-for-byte verified Atlantis Crossfire may mount",async()=>{
  assert.equal(await verifyCrossfirePreviewMedia(entry,bytes,fakeCrypto),true);
  assert.equal(await verifyCrossfirePreviewMedia({...entry,id:"archive-02122"},bytes,fakeCrypto),false);
  assert.equal(await verifyCrossfirePreviewMedia({...entry,format:"d64"},bytes,fakeCrypto),false);
  assert.equal(await verifyCrossfirePreviewMedia(entry,bytes.subarray(0,50),fakeCrypto),false);
  assert.equal(await verifyCrossfirePreviewMedia(entry,bytes,{
    digest:async()=>new Uint8Array(32).buffer
  }),false);
  assert.equal(await verifyCrossfirePreviewMedia(entry,bytes,null),false);
});

class FakeElement {
  constructor(doc,tag) {
    this.ownerDocument=doc;this.tag=tag;this.children=[];this.events=new Map();
    this.attributes={};this.textContent="";this.removed=false;
  }
  setAttribute(name,value){this.attributes[name]=String(value);}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[...items];}
  insertAdjacentElement(_where,node){this.after=node;}
  addEventListener(name,handler){this.events.set(name,handler);}
  click(){this.events.get("click")?.();}
  remove(){this.removed=true;}
  find(predicate){
    if(predicate(this))return this;
    for(const child of this.children){const found=child.find(predicate);if(found)return found;}
    return null;
  }
}
function fakeDocument() {
  const doc={
    createElement(tag){return new FakeElement(doc,tag);},
    createElementNS(_ns,tag){return new FakeElement(doc,tag);}
  };
  doc.head=doc.createElement("head");
  return doc;
}
test("verified PRG mounts an empty five-rank neon board, toggles views, and disposes",async()=>{
  const doc=fakeDocument(),stage=doc.createElement("div");
  const candidate=await mountCrossfirePreview({entry,bytes,stage,doc,subtle:fakeCrypto});
  assert(candidate,"Exact media must mount");
  const panel=stage.after;
  assert.equal(panel.attributes["data-ccg-arena-preview"],"crossfire");
  assert.equal(doc.head.children.length,1,"Styles load only after exact media validation");
  assert.equal(panel.find(x=>x.tag==="li")?.textContent,"","no invented score text");
  const slots=panel.find(x=>x.tag==="ol");
  assert.equal(slots.children.length,5);
  const buttons=[];
  (function visit(n){if(n.tag==="button")buttons.push(n);for(const child of n.children)visit(child);})(panel);
  assert.equal(buttons.length,2);
  assert.equal(buttons[0].attributes["aria-pressed"],"true");
  buttons[1].click();
  assert.equal(buttons[1].attributes["aria-pressed"],"true");
  assert.equal(panel.find(x=>x.tag==="p"&&x.textContent==="NO PUBLISHED CHALLENGE")!==null,true);
  candidate.observe(new Uint8Array(65536));
  candidate.invalidate();
  assert.equal(panel.find(x=>x.tag==="p"&&x.textContent.includes("NO SCORE RECORDED"))!==null,true);
  candidate.dispose();
  assert.equal(panel.removed,true);
  assert.equal(doc.head.children[0].removed,true);
  candidate.observe(new Uint8Array(65536));
  candidate.dispose();
});

test("wrong game never mounts or loads any preview styles",async()=>{
  const doc=fakeDocument(),stage=doc.createElement("div");
  const mounted=await mountCrossfirePreview({
    entry:{...entry,id:"archive-02122"},bytes,stage,doc,subtle:fakeCrypto
  });
  assert.equal(mounted,null);
  assert.equal(stage.after,undefined);
  assert.equal(doc.head.children.length,0);
});

test("full browser hook is optional, and cannot submit accounts or scores",async()=>{
  const {ARENA_CROSSFIRE_PROFILE}=await import("../scripts/high-score-arena/arena-game-profiles.mjs");
  assert.equal(ARENA_CROSSFIRE_PROFILE.publicSubmissionEnabled,false);
  const source=readFileSync(new URL("../js/ccg-c64/arena-preview.js",import.meta.url),"utf8");
  assert.doesNotMatch(source,/\.from\s*\(\s*['"]ccg_arena_attempts/);
  assert.doesNotMatch(source,/\.insert\(|\.upsert\(|\.update\(/);
  assert.match(source,/LOCAL DIAGNOSTIC ONLY/);
  const app=readFileSync(new URL("../js/ccg-c64/app.js",import.meta.url),"utf8");
  assert.match(app,/ccg_arena_preview/);
  assert.match(app,/if \(queued && entry.id === "archive-02121"\)/);
  assert.match(app,/async function queueMedia\([^]*?clearArenaPreview\(\)/);
  assert.match(app,/function resetMachine\([^]*?clearArenaPreview\(\)/);
  assert.match(app,/async function loadGameVaultSlot\([^]*?clearArenaPreview\(\)/);
});
