#!/usr/bin/env node
"use strict";
// Executes the real catalogue LOAD function in a synthetic browser context.
// SHA test doubles exercise the LOAD trigger, not a claim of CRT byte validity.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInContext, createContext } from "node:vm";
import { isVerifiedSierraCrossfireCrt, SIERRA_CROSSFIRE_CRT }
  from "../js/ccg-c64/game-catalog.js";

const app=readFileSync(new URL("../js/ccg-c64/app.js",import.meta.url),"utf8");
const start=app.indexOf("async function loadSelectedLibraryEntry() {");
const end=app.indexOf('loadAnyMediaButton?.addEventListener("click"',start);
assert(start>=0 && end>start,"The existing LOAD function must stay identifiable");
const sierra={...SIERRA_CROSSFIRE_CRT,approved:true,preferOverOtherFormats:true};
const tron={id:"archive-02122",title:"Crossfire - Tron",format:"prg",dataBase64:"AA=="};
const oldPrg={id:"archive-02121",title:"Crossfire",format:"prg",dataBase64:"AA=="};
const other={id:"another",title:"Another C64 Game",format:"prg",dataBase64:"AA=="};
const all=[sierra,tron,oldPrg,other];
const site="https://www.cheekycommodoregamer.co.uk";
const fixtureBytes=new Uint8Array(SIERRA_CROSSFIRE_CRT.bytes);
const digestBytes=Uint8Array.from(Buffer.from(SIERRA_CROSSFIRE_CRT.sha256,"hex"));
let mounts=0,queuings=0,queueSucceeds=true,mountMedia=null,fetches=0;
const context=createContext({
  onlineLibraryLoadingGame:false,
  selectedLibraryEntryId:null,
  onlineLibraryEntries:all,
  onlineLibraryStatus:{textContent:""},
  stageNote:{textContent:""},
  onlineLibraryPackCache:new Map(),
  onlineLibraryDiskIndex:0,
  activeLibraryEntryId:null,
  pendingMedia:null,
  window:{location:{origin:site,href:site+"/emulator/c64/",search:""}},
  URL,
  crypto:{subtle:{
    async digest(algorithm,bytes){
      assert.equal(algorithm,"SHA-256");
      assert.equal(bytes.byteLength,SIERRA_CROSSFIRE_CRT.bytes);
      return digestBytes.slice().buffer;
    }
  }},
  Uint8Array, // A single realm is sufficient for these mocked media bytes.
  isVerifiedSierraCrossfireCrt,
  async fetch(url){
    fetches++;
    assert.equal(url,site+SIERRA_CROSSFIRE_CRT.url);
    return {ok:true,async arrayBuffer(){return fixtureBytes.slice().buffer}};
  },
  decodeLibraryBase64(){return Uint8Array.of(1,8,1)},
  setLibrarySuggestionsOpen(){},
  refreshOnlineLibrarySuggestions(){},
  updateSelectedLibraryGame(){},
  updateOnlineDiskUi(){},
  configureJump(){},
  async queueMedia(media){
    queuings++;
    assert(media?.bytes instanceof Uint8Array);
    return queueSucceeds;
  },
  mountSelectedArenaPreview(entry,bytes){
    mounts++;
    mountMedia={entry,bytes};
  }
});
runInContext(app.slice(start,end)+"\nglobalThis.load=loadSelectedLibraryEntry;",context);
async function selectAndLoad(entry){
  context.selectedLibraryEntryId=entry.id;
  await context.load();
}
await selectAndLoad(other);
await selectAndLoad(tron);
await selectAndLoad(oldPrg);
assert.equal(mounts,0,"Normal PRG, Atlantis and Tron must never mount Sierra Arena");
assert.equal(fetches,0,"Non-Sierra games do not fetch the CRT");
await selectAndLoad(sierra);
assert.equal(context.onlineLibraryStatus.textContent,"GAME STARTED");
assert.equal(mounts,1,"Sierra CRT must auto-mount even without URL flags");
assert.equal(mountMedia.entry.id,SIERRA_CROSSFIRE_CRT.id);
assert.equal(mountMedia.bytes.byteLength,SIERRA_CROSSFIRE_CRT.bytes);
assert.equal(fetches,1);
queueSucceeds=false;
await selectAndLoad(sierra);
assert.equal(mounts,1,"Failed/emulator-unavailable LOAD must not mount Arena");
queueSucceeds=true;
const invalid={...sierra,id:"spoofed-sierra",sha256:"f".repeat(64)};
context.onlineLibraryEntries=[...all,invalid];
await selectAndLoad(invalid);
assert.equal(context.onlineLibraryStatus.textContent,"LOAD FAILED");
assert.equal(mounts,1,"Mismatched CRT SHA must never mount Arena");
assert.equal(queuings,5,"Wrong SHA fails before emulator media is queued");
console.log("Crossfire normal LOAD auto-mount, Tron isolation and digest refusal passed.");
