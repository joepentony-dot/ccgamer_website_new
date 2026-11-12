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
const audioAssets=read("arcade/lost-sizzler/js/audio-assets.js");
assert.match(audioAssets,/endgame:"assets\/audio\/music\/sanctuary\.wav"/,"credits music must resolve to an existing packaged cue");
assert.ok(fs.existsSync(path.join(root,"arcade/lost-sizzler/assets/audio/music/sanctuary.wav")),"default credits WAV must actually exist");

assert.doesNotMatch(core,/Friendly fire:/i,"normal end-run statistics must not expose retired friendly-fire data");
assert.doesNotMatch(recovery,/Friendly fire:/i,"terminal recovery end screen must not expose retired friendly-fire data");

assert.match(main,/title:"C64 Dungeon Carnage"/,"share metadata must use the current game title");
assert.match(main,/C64 Dungeon Carnage link copied/,"clipboard feedback must use the current game title");
assert.doesNotMatch(main,/Cheeky's Commodore Quest/,"retired game title must not remain in the active share path");

assert.match(finalUi,/run\?\.campaignComplete===true/,"Credits must follow the authoritative campaign result");
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

function exerciseFinale({floor=15,exitCleared=true,xpGameOver=false,dailyFailed=false,shareMode="native",rewardStorage=new Map()}={}){
  const nodes=new Map(),inserts=[],music=[],styles=[],visited=[],shares=[],copied=[],toasts=[],rewardWrites=[];
  const node=id=>{
    const value={id,events:new Map(),remove(){nodes.delete(id)},addEventListener(event,handler){this.events.set(event,handler)},
      setAttribute(key,value){this[key]=value},scrollIntoView(){visited.push(id)},focus(){visited.push(id+":focus")}};
    nodes.set(id,value);return value;
  };
  const endText={insertAdjacentHTML(where,html){
    inserts.push({where,html});
    for(const found of html.matchAll(/id="([^"]+)"/g))node(found[1]);
  }};
  const runState={floor,deepest:floor,floorComplete:exitCleared,dailyFailed,xpGameOver,elapsed:123000,
    stats:{kills:27,secrets:4},enemyDefeats:[],bankedGames:[],floorGames:[]};
  const ctx={run:runState,playMode:"solo",mode:exitCleared?"floorcomplete":"playing",C:{maxFloors:15},
    UI:{endText,endTitle:{},end:{classList:{remove(){}}}},p1:{level:9},score:1234,esc:x=>String(x),pad:String,
    S:{setStalkerNear(){},stopMusic(){}},PGR:{clearCheckpoint(){},persistentCollection:()=>[]},
    updateSavedRunButton(){},refreshCollection(){},
    window:{CCG_CONFIG:{maxFloors:15},CCGEndCreditsMusic:{play(arg){music.push(arg)}}},
    document:{getElementById:id=>nodes.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],dispatchEvent(){},
      createElement:tag=>({tag}),head:{appendChild:style=>styles.push(style)}},
    navigator:shareMode==="native"?{share:async data=>{shares.push(data)}}:
      shareMode==="clipboard"?{clipboard:{writeText:async value=>{copied.push(value)}}}:{},
    location:{href:"https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/"},
    localStorage:{getItem:key=>rewardStorage.get(key)||null,setItem:(key,value)=>{if(key==="ccg-dungeon-carnage-crimson-dungeonheart-v1")rewardWrites.push(key);rewardStorage.set(key,String(value))}},
    showToast:(...args)=>toasts.push(args),setInterval:()=>1,CustomEvent:class {},
    fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve([])}),
    console:{warn:()=>{}}
  };
  vm.createContext(ctx);
  vm.runInContext(core.slice(core.indexOf("function descendFloor()")),ctx,{timeout:1000});
  ctx.window.addEventListener=()=>{};
  vm.runInContext(read("arcade/lost-sizzler/js/v10-29-achievements.js"),ctx,{timeout:1000});
  vm.runInContext(finaleSource,ctx,{timeout:1000});
  if(!exitCleared){
    assert.equal(ctx.extractRun(),false,"Extraction must wait until the exit is cleared");
    assert.equal(ctx.descendFloor(),false,"Descent must wait until the exit is cleared");
    assert.equal(ctx.mode,"playing");
  }
  ctx.endRun("Citadel cleared");
  return{ctx,runState,inserts,nodes,music,styles,visited,shares,copied,toasts,rewardStorage,rewardWrites};
}
const victory=exerciseFinale();
assert.equal(victory.ctx.weeklyResultPayload().completed,true);
assert.equal(victory.ctx.window.CCGLostSizzlerAchievementsV129.earned("LS_CITADEL_PLATINUM"),true);
assert.equal(victory.ctx.UI.endTitle.textContent,"CITADEL CLEARED");
assert.equal(victory.rewardWrites.length,1,"first legitimate win must persist one permanent reward");
const crimson=JSON.parse(victory.rewardStorage.get("ccg-dungeon-carnage-crimson-dungeonheart-v1"));
assert.equal(crimson.id,"crimson-dungeonheart");
assert.equal(crimson.title,"Keeper of the Crimson Dungeonheart");
const previouslyWon=exerciseFinale({rewardStorage:victory.rewardStorage});
assert.equal(previouslyWon.rewardWrites.length,0,"subsequent completed runs must reuse, not re-award, the permanent reward");
assert.ok(previouslyWon.inserts.some(entry=>entry.html.includes("PERMANENT TITLE")),"already-earned title must remain visible in a later winning run");
const ceremony=victory.inserts.filter(x=>x.html.includes('id="v108-completion-credits"'));
assert.equal(ceremony.length,1,"one victory ceremony must be inserted per run");
assert.equal(ceremony[0].where,"afterbegin","cinematic finale must appear before long credits");
assert.match(ceremony[0].html,/1,234/,"finale must show authoritative score");
assert.match(ceremony[0].html,/HERO LEVEL[\s\S]*?9|>9<\/strong><span>HERO LEVEL/,"finale must show actual hero level");
assert.match(ceremony[0].html,/27<\/strong><span>ENEMIES DEFEATED/,"kills must come from run stats");
assert.match(ceremony[0].html,/2:03<\/strong><span>RUN TIME/,"elapsed time must come from run");
await victory.nodes.get("v108-end-share").events.get("click")();
assert.equal(victory.shares.length,1,"victory must invoke the native share sheet exactly once");
assert.equal(victory.shares[0].title,"C64 Dungeon Carnage — Campaign Complete");
assert.match(victory.shares[0].text,/all 15 floors/,"completion share must describe a completed campaign");
assert.match(victory.shares[0].text,/1,234 points/,"completion share must include real final score");
assert.match(victory.shares[0].text,/hero level 9/,"completion share must include real hero level");
assert.match(victory.shares[0].text,/27 enemies defeated/,"completion share must include real kills");
assert.match(victory.shares[0].text,/2:03/,"completion share must include actual elapsed time");
assert.equal(victory.shares[0].url,"https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/");
assert.equal(victory.copied.length,0,"native share must not also copy the clipboard");
const clipboardVictory=exerciseFinale({shareMode:"clipboard"});
await clipboardVictory.nodes.get("v108-end-share").events.get("click")();
assert.equal(clipboardVictory.shares.length,0);
assert.equal(clipboardVictory.copied.length,1,"desktop clipboard fallback must copy the full result once");
assert.match(clipboardVictory.copied[0],/1,234 points[\s\S]*cheekycommodoregamer\.co\.uk/);
assert.equal(clipboardVictory.toasts.at(-1)[0],"COMPLETION COPIED");
const plainVictory=exerciseFinale({shareMode:"none"});
await plainVictory.nodes.get("v108-end-share").events.get("click")();
assert.equal(plainVictory.toasts.at(-1)[0],"SHARE COMPLETION","unavailable sharing APIs must retain visible result text");
assert.match(plainVictory.toasts.at(-1)[1],/1,234 points/);
assert.equal(victory.music.length,1,"end music hook should be called once per winning run");
assert.match(ceremony[0].html,/Windows \/ itch.io edition is not yet released/,"unverified purchase URL must not be invented");
assert.match(ceremony[0].html,/v155-skip-credits/,"credits must provide an explicit exit");
let returnedToMenu=0;
victory.nodes.set("again-btn",{click(){returnedToMenu++}});
victory.nodes.get("v155-skip-credits").events.get("click")();
assert.equal(returnedToMenu,1,"Skip Credits must invoke the established Return to Menu owner");
assert.equal(victory.music[0].reason,"campaign-complete");
assert.equal(victory.styles.filter(style=>style.id!=="lost-sizzler-achievements-style").length,1,"finale must reuse existing single stylesheet owner");
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
for(const scenario of [{floor:14},{floor:15,exitCleared:false},{floor:15,xpGameOver:true},{floor:15,dailyFailed:true}]){
  const sample=exerciseFinale(scenario);
  assert.equal(sample.inserts.some(x=>x.html.includes('id="v108-completion-credits"')),false,
    "non-winning and failed runs must never receive victory credits: "+JSON.stringify(scenario));
  assert.equal(sample.ctx.weeklyResultPayload().completed,false);
  assert.equal(sample.ctx.window.CCGLostSizzlerAchievementsV129.earned("LS_CITADEL_PLATINUM"),false);
  assert.equal(sample.music.length,0,"non-winning runs must not play completion music");
  assert.equal(sample.rewardWrites.length,0,"nonwinning and failed runs must never award the permanent title");
}


// The actual credits audio owner must work without the existing test's music
// spy, use packaged audio only, and refuse muted playback and remote overrides.
{
  const played=[],stopped=[],claims=[],audioInstances=[];
  let soundEnabled=true,musicLevel=.12;
  class MockAudio{
    constructor(src){this.src=src;this.paused=true;this.loop=false;this.volume=0;audioInstances.push(this)}
    play(){this.paused=false;played.push({src:this.src,loop:this.loop,volume:this.volume});return Promise.resolve()}
    pause(){this.paused=true;stopped.push(this.src)}
  }
  const audioWindow={
    CCG_CONFIG:{maxFloors:15},
    CCG_AUDIO_ASSETS:{music:{endgame:"assets/audio/music/sanctuary.wav"}},
    CCGSound:{isEnabled:()=>soundEnabled,getMusicLevel:()=>musicLevel},
    CCGLostSizzlerMusicBus:{claim(owner,stop){claims.push(owner);this.stop=stop},release(owner){claims.push("release:"+owner)}}
  };
  const audioContext={
    window:audioWindow,Audio:MockAudio,URL,
    location:{href:"http://127.0.0.1:8123/arcade/lost-sizzler/"},
    document:{
      getElementById(){return null},querySelector(){return null},querySelectorAll(){return []},
      createElement(){return {}},head:{appendChild(){}}
    },
    fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve([])}),
    console:{warn(){}}
  };
  vm.runInNewContext(finaleSource,audioContext,{timeout:1000});
  const musicOwner=audioWindow.CCGEndCreditsMusic;
  assert.equal(musicOwner.play({reason:"campaign-complete"}),true,"winning credits should play the configured cue");
  assert.equal(played.length,1);
  assert.match(played[0].src,/^http:\/\/127\.0\.0\.1:8123\/arcade\/lost-sizzler\/assets\/audio\/music\/sanctuary\.wav$/);
  assert.equal(played[0].loop,true);
  assert.ok(played[0].volume>0&&played[0].volume<=.15);
  assert.equal(musicOwner.isPlaying(),true);
  musicOwner.stop();
  assert.equal(musicOwner.isPlaying(),false,"return-to-menu must stop credits audio");
  assert.equal(stopped.length,1);
  audioWindow.CCG_ASSET_OVERRIDES={audio:{music:{endgame:"https://outside.example.invalid/music.mp3"}}};
  assert.equal(musicOwner.play({reason:"campaign-complete"}),true,"remote override should fall back to bundled audio");
  assert.equal(played.length,2);
  assert.equal(played[1].src,played[0].src,"external override must never be requested");
  musicOwner.stop();
  soundEnabled=false;
  assert.equal(musicOwner.play({reason:"campaign-complete"}),false,"sound-off must prevent new credits playback");
  assert.equal(musicOwner.isPlaying(),false);
  // Public /arcade/c64-dungeon-carnage/ has a canonical <base href>
  // pointing to /arcade/lost-sizzler/. Resolve the bundled WAV against
  // document.baseURI rather than the alias address.
  soundEnabled=true;
  audioContext.location.href="http://127.0.0.1:8123/arcade/c64-dungeon-carnage/";
  audioContext.document.baseURI="http://127.0.0.1:8123/arcade/lost-sizzler/";
  assert.equal(musicOwner.play({reason:"campaign-complete"}),true);
  assert.equal(played.at(-1).src,played[0].src,"public alias must load the real canonical bundled WAV");
  musicOwner.stop();
  // Installed Windows and offline HTML5 builds may launch from file://.
  // Allow the shipped audio directory only, not arbitrary local files.
  audioContext.location.href="file:///C:/CCG_Dungeon_Carnage/index.html";
  audioContext.document.baseURI="file:///C:/CCG_Dungeon_Carnage/";
  assert.equal(musicOwner.play({reason:"campaign-complete"}),true,"offline credits must play their bundled audio");
  const expectedFile="file:///C:/CCG_Dungeon_Carnage/assets/audio/music/sanctuary.wav";
  assert.equal(played.at(-1).src,expectedFile);
  musicOwner.stop();
  audioWindow.CCG_ASSET_OVERRIDES={audio:{music:{endgame:"file:///C:/private/secret.mp3"}}};
  assert.equal(musicOwner.play({reason:"campaign-complete"}),true,"unsafe local override must fall back to packaged cue");
  assert.equal(played.at(-1).src,expectedFile,"file URL outside packaged assets/audio must be refused");
  musicOwner.stop();
  // Saved zero-volume preference must suppress the victory music on entry.
  musicLevel=0;
  const countBeforeZero=played.length;
  assert.equal(musicOwner.play({reason:"campaign-complete"}),false,"explicit Music Level 0% must not start credits audio");
  assert.equal(played.length,countBeforeZero,"zero-percent music must not construct or play a new track");
  musicLevel=.2;
  assert.equal(musicOwner.play({reason:"campaign-complete"}),true,"nonzero music level should permit playback");
  assert.equal(played.at(-1).volume,.2,"credits volume must follow the current soundtrack preference");
  assert.equal(musicOwner.syncVolume(.1),true,"live slider changes must be applied to active credits");
  assert.equal(audioInstances.at(-1).volume,.1,"active credits must update the live Audio instance volume");
  assert.equal(played.length,countBeforeZero+1,"slider changes must not restart or duplicate audio playback");
  assert.equal(musicOwner.syncVolume(0),false,"muting with the slider must stop the audio owner");
  assert.equal(musicOwner.isPlaying(),false,"zero-percent slider must silence the running credits");
  assert.ok(claims.includes("end-credits"),"credits music must claim the shared music owner");
}

console.log("Dungeon Carnage R88 endgame and credits contract passed.");
