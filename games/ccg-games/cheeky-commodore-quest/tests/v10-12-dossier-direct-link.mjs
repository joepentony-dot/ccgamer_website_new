import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const read=name=>fs.readFileSync(path.join(gameDir,name),"utf8");

const dossierSource=read("js/v10-12-dossier-discovery.js");
const loaderSource=read("js/asset-overrides.js");
const mainSource=read("js/game-main.js");

assert.match(loaderSource,/DOMContentLoaded/,"runtime patches begin at DOM ready instead of waiting for every external resource");
assert.doesNotMatch(loaderSource,/window\.addEventListener\("load"/,"cold direct-link boot no longer depends on the full window load event");
assert.match(loaderSource,/script\.onerror=.*loadNext\(index\+1\)/s,"one optional runtime patch failure cannot block every later safety patch");
assert.match(loaderSource,/v10-12-dossier-discovery\.js\?v=/,"encounter-only dossier patch is cache-busted and loaded");
assert.match(mainSource,/installEarlyStableResize/,"base boot installs the canvas guard before first resize");
assert.match(mainSource,/pixelBudget/,"base boot has a device-aware canvas pixel budget");
assert.match(mainSource,/Math\.min\(4096/,"base boot caps pathological canvas width before allocation");
assert.doesNotMatch(dossierSource,/NOT ENCOUNTERED/,"dossier patch never renders undiscovered placeholder enemies");
assert.match(dossierSource,/discoveryQueue/,"simultaneous first encounters are queued one enemy at a time");

const listeners=new Map();
const button=()=>({textContent:"",addEventListener(type,fn){listeners.set(`${this.id}:${type}`,fn)}});
const elements={
  "named-dossier-btn":Object.assign(button(),{id:"named-dossier-btn"}),
  "inventory-dossier-btn":Object.assign(button(),{id:"inventory-dossier-btn"}),
  "named-dossier-close":Object.assign(button(),{id:"named-dossier-close"}),
  "named-dossier-close-top":Object.assign(button(),{id:"named-dossier-close-top"})
};
const intro={tagName:"P",textContent:""};
const panel={children:[{tagName:"DIV"},intro]};
const list={innerHTML:"",querySelector(){return null}};
const overlay={
  hidden:true,
  classList:{
    contains(name){return name==="hidden"?overlay.hidden:false},
    remove(name){if(name==="hidden")overlay.hidden=false},
    add(name){if(name==="hidden")overlay.hidden=true}
  }
};

const dossierStore={"Peter Cortens":{encounters:1,defeats:0}};
let eliteSounds=0;
const context={
  console,
  setTimeout:fn=>{fn();return 1},
  clearTimeout(){},
  document:{
    getElementById(id){return elements[id]||null},
    querySelector(selector){return selector==="#named-dossier-panel .dossier-panel"?panel:null}
  },
  addEventListener(type,fn){listeners.set(`window:${type}`,fn)},
  C:{
    logoFallback:"fallback.svg",
    followerElites:[
      {name:"Peter Cortens",kind:"hunter",armor:2,strength:"Fast",weakness:"Fire",avatar:"peter.png"},
      {name:"Swanh8ter",kind:"guard",armor:1,strength:"Range",weakness:"Shock",avatar:"swan.png"},
      {name:"CPU",kind:"caster",armor:0,strength:"Magic",weakness:"Energy",avatar:"cpu.png"}
    ]
  },
  OVERRIDES:{images:{namedEnemies:{}}},
  esc:value=>String(value),
  UI:{namedDossierList:list,namedDossier:overlay},
  PGR:{
    readDossier(){return JSON.parse(JSON.stringify(dossierStore))},
    recordNamedEncounter(name,defeated=false){
      const row=dossierStore[name]||{encounters:0,defeats:0};
      if(defeated)row.defeats++;else row.encounters++;
      dossierStore[name]=row;
      return {...row};
    }
  },
  dossierFocusName:"",
  renderNamedDossier(){},
  showNamedDossier(){},
  updateNamedEncounters(){},
  mode:"playing",
  input:{clear(){}},
  host:{enemies:[],stalker:null},
  run:{stats:{namedEncounters:0}},
  p1:{x:0,y:0},
  localPlayers(){return[context.p1]},
  visibleTo(){return true},
  md(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)},
  S:{sfx(name){if(name==="elite")eliteSounds++},setNamedEnemy(){},setRoomMood(){}},
  roomMoodFor(){return"normal"},
  W:{roomAt(){return 0}}
};
context.window=context;
vm.createContext(context);
vm.runInContext(dossierSource,context,{filename:"v10-12-dossier-discovery.js"});

context.dossierFocusName="";
context.renderNamedDossier();
assert.match(list.innerHTML,/Peter Cortens/,"previously encountered enemy remains visible in the dossier");
assert.doesNotMatch(list.innerHTML,/Swanh8ter|CPU/,"undiscovered enemy types are absent from the dossier");
assert.equal(elements["named-dossier-btn"].textContent,"OPEN DISCOVERED DOSSIER");
assert.equal(elements["inventory-dossier-btn"].textContent,"Named Enemy Dossier");
assert.match(intro.textContent,/Only named enemies you have encountered/);

context.host.enemies=[
  {alive:true,x:2,y:0,dossierSeen:false,follower:context.C.followerElites[1]},
  {alive:true,x:3,y:0,dossierSeen:false,follower:context.C.followerElites[2]}
];
context.updateNamedEncounters();
assert.equal(context.mode,"dossier","first new enemy pauses gameplay and opens its dossier card");
assert.match(list.innerHTML,/Swanh8ter/,"closest newly discovered enemy is shown first");
assert.doesNotMatch(list.innerHTML,/Peter Cortens|CPU/,"first-encounter popup contains one enemy type only");
assert.equal(dossierStore.Swanh8ter.encounters,1);
assert.equal(dossierStore.CPU.encounters,1,"simultaneously seen second type is recorded immediately");
assert.deepEqual([...context.CCGLostSizzlerDossierDiscoveryV112.pending()],["CPU"],"second simultaneous discovery waits in the one-at-a-time queue");
assert.equal(eliteSounds,1);

context.mode="playing";
overlay.hidden=true;
context.dossierFocusName="";
listeners.get("named-dossier-close:click")?.();
assert.equal(context.mode,"dossier","closing the first discovery opens the queued second discovery");
assert.match(list.innerHTML,/CPU/);
assert.doesNotMatch(list.innerHTML,/Peter Cortens|Swanh8ter/);
assert.equal(eliteSounds,2);

context.mode="playing";
overlay.hidden=true;
context.dossierFocusName="";
context.host.enemies=[{alive:true,x:2,y:0,dossierSeen:false,follower:context.C.followerElites[1]}];
context.updateNamedEncounters();
assert.equal(context.mode,"playing","an already discovered enemy type does not reopen the dossier");
assert.equal(eliteSounds,2,"repeat encounters remain silent at dossier level");

console.log("V10.12 dossier discovery and direct-link boot regression checks passed");
