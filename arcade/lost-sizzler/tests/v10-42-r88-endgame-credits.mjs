import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const core=read("arcade/lost-sizzler/js/game-core.js");
const recovery=read("arcade/lost-sizzler/js/v10-41-r53-terminal-solo-end-recovery.js");
const main=read("arcade/lost-sizzler/js/game-main.js");
const finalUi=read("arcade/lost-sizzler/js/v10-4-final-ui.js");

assert.doesNotMatch(core,/Friendly fire:/i,"normal end-run statistics must not expose retired friendly-fire data");
assert.doesNotMatch(recovery,/Friendly fire:/i,"terminal recovery end screen must not expose retired friendly-fire data");

assert.match(main,/title:"C64 Dungeon Carnage"/,"share metadata must use the current game title");
assert.match(main,/C64 Dungeon Carnage link copied/,"clipboard feedback must use the current game title");
assert.doesNotMatch(main,/Cheeky's Commodore Quest/,"retired game title must not remain in the active share path");

assert.match(finalUi,/run\?\.runComplete/,"completion credits must require the authoritative successful-run completion latch");
assert.match(finalUi,/!run\.xpGameOver/,"Floor 15 XP game-over must never receive victory credits");
assert.match(finalUi,/Number\(run\.floor\|\|0\)>=Number\(window\.CCG_CONFIG\?\.maxFloors\|\|15\)/,"victory credits must remain gated to the configured final floor");
assert.match(finalUi,/CAMPAIGN COMPLETE — BLOOD CITADEL CLEARED/,"full campaign completion must receive a distinct credits finale");
assert.match(finalUi,/AZALEA and CPU/,"special acknowledgements must include long-term supporters AZALEA and CPU");
assert.match(finalUi,/info@cheekycommodoregamer\.co\.uk/,"completion credits must expose the requested feedback email");
assert.match(finalUi,/paypal\.com\/donate/,"completion credits must expose the existing donation destination");
assert.match(finalUi,/v108-end-share/,"completion credits must expose a dedicated share-completion action");
assert.match(finalUi,/CCGEndCreditsMusic\?\.play/,"completion credits must expose a configurable end-music hook without hardcoding an asset");
assert.match(finalUi,/data-enemy-avatar-index/,"enemy credits must retain the in-game sprite canvas recap");


// R130 actual module execution: victory is presentation-only and depends on
// the canonical Floor 15 completion latch. Exercise re-render, music,
// reduced-motion CSS and keyboard-accessible credit navigation with a DOM spy.
import vm from "node:vm";
const finaleSource=finalUi;
assert.match(finaleSource,/v130-cinematic-header/,"finale must have a dedicated visual hero");
assert.match(finaleSource,/v130-victory-scoreboard/,"victory must present real run highlights");
assert.match(finaleSource,/v130-jump-bestiary/,"player must be able to skip to actual defeated-enemy credits");
assert.match(finaleSource,/v130-jump-pickups/,"player must be able to jump to collected C64 game credits");
assert.match(finaleSource,/@media\(prefers-reduced-motion:reduce\)/,"animated ceremony must respect reduced motion");
assert.match(finaleSource,/if\(existing\)return/,"asynchronous game-slug enrichment must not replay victory ceremony");
assert.doesNotMatch(finaleSource,/setInterval\(/,"finale must never install a new persistent timer");
assert.match(finaleSource,/insertAdjacentHTML\("afterbegin"/,"finale belongs before the long bestiary and retro game roll");

function exerciseFinale({floor=15,complete=true,xpGameOver=false,dailyFailed=false}={}){
  const nodes=new Map(),inserts=[],music=[],styles=[],visited=[];
  const node=id=>{
    const value={id,events:new Map(),remove(){nodes.delete(id)},addEventListener(event,handler){this.events.set(event,handler)},
      setAttribute(key,value){this[key]=value},scrollIntoView(){visited.push(id)},focus(){visited.push(id+":focus")}};
    nodes.set(id,value);return value;
  };
  const endText={insertAdjacentHTML(where,html){
    inserts.push({where,html});
    for(const found of html.matchAll(/id="([^"]+)"/g))node(found[1]);
  }};
  const runState={floor,runComplete:complete,dailyFailed,xpGameOver,elapsed:123000,
    stats:{kills:27,secrets:4},enemyDefeats:[],bankedGames:[],floorGames:[]};
  const ctx={run:runState,UI:{endText},p1:{level:9},score:1234,esc:x=>String(x),endRun:()=>true,
    window:{CCG_CONFIG:{maxFloors:15},CCGEndCreditsMusic:{play(arg){music.push(arg)}}},
    document:{getElementById:id=>nodes.get(id)||null,querySelectorAll:()=>[],
      createElement:tag=>({tag}),head:{appendChild:style=>styles.push(style)}},
    fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve([])}),
    console:{warn:()=>{}}
  };
  vm.runInNewContext(finaleSource,ctx,{timeout:1000});
  ctx.endRun("Citadel cleared");
  return{ctx,runState,inserts,nodes,music,styles,visited};
}
const victory=exerciseFinale();
const ceremony=victory.inserts.filter(x=>x.html.includes('id="v108-completion-credits"'));
assert.equal(ceremony.length,1,"one victory ceremony must be inserted per run");
assert.equal(ceremony[0].where,"afterbegin","cinematic finale must appear before long credits");
assert.match(ceremony[0].html,/1,234/,"finale must show authoritative score");
assert.match(ceremony[0].html,/HERO LEVEL[\s\S]*?9|>9<\/strong><span>HERO LEVEL/,"finale must show actual hero level");
assert.match(ceremony[0].html,/27<\/strong><span>ENEMIES DEFEATED/,"kills must come from run stats");
assert.match(ceremony[0].html,/2:03<\/strong><span>RUN TIME/,"elapsed time must come from run");
assert.equal(victory.music.length,1,"end music hook should be called once per winning run");
assert.equal(victory.music[0].reason,"campaign-complete");
assert.equal(victory.styles.length,1,"finale must reuse existing single stylesheet owner");
victory.nodes.get("v130-jump-bestiary").events.get("click")();
assert.deepEqual(victory.visited,["v106-enemy-credits","v106-enemy-credits:focus"],"skip must focus existing actual bestiary");
victory.nodes.get("v130-jump-pickups").events.get("click")();
assert.deepEqual(victory.visited.slice(-2),["v104-retro-credits","v104-retro-credits:focus"],"retro credits navigation must focus existing collected titles");
const originalBestiaryTarget=victory.nodes.get("v106-enemy-credits");
const originalGamesTarget=victory.nodes.get("v104-retro-credits");
victory.ctx.endRun("Citadel cleared");
assert.equal(victory.inserts.filter(x=>x.html.includes('id="v108-completion-credits"')).length,1,"re-entry must not restart or duplicate the ceremony");
assert.strictEqual(victory.nodes.get("v106-enemy-credits"),originalBestiaryTarget,"catalogue enrichment/re-entry must retain focused bestiary DOM target");
assert.strictEqual(victory.nodes.get("v104-retro-credits"),originalGamesTarget,"catalogue enrichment/re-entry must retain focused games DOM target");
await new Promise(resolve=>setImmediate(resolve));
assert.strictEqual(victory.nodes.get("v106-enemy-credits"),originalBestiaryTarget,"late catalogue Promise must retain enemy credits node");
assert.strictEqual(victory.nodes.get("v104-retro-credits"),originalGamesTarget,"late catalogue Promise must retain C64 game credits node");
assert.equal(victory.music.length,1,"re-entry must not replay the owner-supplied end music");
for(const scenario of [{floor:14},{floor:15,complete:false},{floor:15,xpGameOver:true},{floor:15,dailyFailed:true}]){
  const sample=exerciseFinale(scenario);
  assert.equal(sample.inserts.some(x=>x.html.includes('id="v108-completion-credits"')),false,
    "non-winning and failed runs must never receive victory credits: "+JSON.stringify(scenario));
  assert.equal(sample.music.length,0,"non-winning runs must not play completion music");
}

console.log("Dungeon Carnage R88 endgame and credits contract passed.");
