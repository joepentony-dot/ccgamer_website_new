import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const index=read("index.html"),css=read("css/game.css"),loader=read("js/asset-overrides.js"),networkSource=read("js/network.js"),runtime=read("js/v10-6-runtime.js"),adapter=read("js/v10-33-special-modes.js"),polish=read("js/v10-33-mode-polish.js"),rare=read("js/v10-15-rare-events.js"),progression=read("js/progression.js"),aiSource=read("js/ai.js"),playlist=read("js/lost-sizzler-playlist-audio.js"),voice=read("js/v10-16-voice-director.js"),elf=read("js/v10-14-gilded-elf.js"),hordeAudio=read("js/horde-survivor-audio.js"),saboteursAudio=read("js/sizzler-saboteurs-audio.js");

for(const [id,label] of [["solo-btn","Play Solo"],["create-btn","Dungeon Multiplayer"],["horde-mode-btn","Horde Multiplayer"],["saboteurs-mode-btn","Spy Vs Spy Multiplayer"]])assert.match(index,new RegExp(`id="${id}"[^>]*>${label}<`),`${label} must be a live menu choice`);
assert.match(index,/id="saboteurs-mode-btn"[^>]*data-player-cap="2"/,"Spy Vs Spy must advertise its hard two-player cap");
for(const shade of ["#ffd85a","#edc44d","#d9ae3f","#c39731"])assert.ok(css.includes(shade),`the yellow mode hierarchy must include ${shade}`);

for(const file of ["horde-survivor.js","horde-survivor-audio.js","sizzler-saboteurs.js","sizzler-saboteurs-audio.js","v10-33-special-modes.js","v10-33-mode-polish.js"])assert.ok(loader.includes(file),`${file} must ship in the sequential release queue`);
assert.ok(loader.indexOf("v10-33-special-modes.js")>loader.indexOf("v10-31-multiplayer-sync.js"),"the live special-mode adapter must wrap the final multiplayer layer");
assert.match(adapter,/v133_special_input/,"guests must send mode inputs to the authoritative host");
assert.match(adapter,/v133_special_state/,"the host must broadcast live special-mode state");
assert.match(adapter,/HOST MIGRATION COMPLETE/,"special modes must adopt the latest state after host migration");
assert.match(adapter,/if\(active\)return updateSpecial/,"the game loop must retain the historical special-mode routing contract marker");
assert.match(adapter,/if\(active\)return renderSpecial/,"the canvas must retain the historical special-mode render contract marker");
assert.match(runtime,/definition\.id==="sizzler-saboteurs"&&net\.getMembers\(\)\.length!==2/,"Spy Vs Spy must require exactly two connected players before start");

const networkContext={console,setTimeout,clearTimeout,setInterval,clearInterval,crypto:globalThis.crypto,location:{hostname:"example.test"},document:{querySelector:()=>null,createElement:()=>({}),head:{appendChild(){}}},window:{CCG_CONFIG:{maxPlayers:4}}};
networkContext.window.window=networkContext.window;vm.createContext(networkContext);vm.runInContext(networkSource,networkContext,{filename:"network.js"});
const {RoomNetwork,ROOM_MODES}=networkContext.window.CCGNetwork;
assert.equal(ROOM_MODES["sizzler-saboteurs"].maxPlayers,2);
assert.equal(ROOM_MODES["horde-survivor"].maxPlayers,4);
const spy=new RoomNetwork();spy.members.set("host",{id:"host",name:"Host",roomRole:"create",joinedAt:1,roomMode:"sizzler-saboteurs"});spy.members.set("guest",{id:"guest",name:"Guest",roomRole:"join",joinedAt:2});spy.members.set("third",{id:"third",name:"Third",roomRole:"join",joinedAt:3});spy.syncMembers();assert.equal(spy.getCapacity(),2);assert.deepEqual(Array.from(spy.getMembers(),member=>member.id),["host","guest"],"a third Spy Vs Spy browser must never be admitted");

const progressionContext={window:{},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};progressionContext.window.window=progressionContext.window;progressionContext.window.localStorage=progressionContext.localStorage;vm.createContext(progressionContext);vm.runInContext(read("js/config.js"),progressionContext);vm.runInContext(progression,progressionContext);const PGR=progressionContext.window.CCGProgression,C=progressionContext.window.CCG_CONFIG;
assert.equal(PGR.effectiveSight({torchMs:0},{rareMutation:"DARKNESS"}),Math.max(3,C.player.sightRadius-2),"active Darkness must tighten torchless visibility by two tile radii");
assert.equal(PGR.effectiveSight({torchMs:0},{}),C.player.sightRadius,"ordinary floors must retain their normal visibility");
assert.equal(PGR.effectiveSight({torchMs:1},{rareMutation:"DARKNESS"}),C.player.torchRadius,"a carried torch must still provide its explicit full utility");
assert.match(rare,/MUTATION_ACTIVATION_DELAY_MS=120000/,"floor mutations must remain dormant for two minutes of active play");
assert.match(rare,/DUNGEON BOUNTY — \$\{remaining\} \$\{noun\} LEFT/,"the kill bounty must count down after each defeated enemy");

assert.match(polish,/FIRST ENCOUNTER FIREARM/,"the first ordinary floor-one kill must release a visible firearm reward");
assert.match(polish,/run\._v133StarterFirearmReleased/,"the starter firearm guarantee must occur only once per run");
assert.match(polish,/tutorialActive\(\)/,"the firearm reward must not leak into tutorial mode");
assert.match(polish,/function enforceOccupancy\(\)/,"a post-step occupancy safeguard must repair stale overlap state");
assert.match(aiSource,/occupiedByPlayer\(x,y\)/,"AI pathing must reject every living player tile");

assert.match(polish,/SPY_COLUMNS=8,SPY_ROWS=5/,"Spy Vs Spy must use the new large 8x5 room matrix");
assert.match(polish,/largeRoomGridV135:true,directDoorRooms:true/,"Spy Vs Spy logical state must identify the direct-door room layout");
assert.match(polish,/spawnRoomIds:\[spawnA\.id,spawnB\.id\]/,"the two spies must spawn at opposite logical endpoints");
assert.match(polish,/const spawnA=rooms\[0\],spawnB=rooms\[rooms\.length-1\]/,"the two Spy Vs Spy spawn rooms must be opposite corners of the 8x5 map");
assert.match(polish,/path:\[\{x:q\.x,y:q\.y\}\]/,"Spy Vs Spy room connections must be single direct door cells rather than corridors");
assert.match(polish,/host\.doors\.push\(\{id:edge\.id/,"every Spy Vs Spy connection must materialise as a real dungeon door");
assert.match(polish,/grid\[q\.y\]\[q\.x\]=0/,"direct Spy Vs Spy door cells must be carved through the shared wall");
assert.match(polish,/world\.wallLights\.push\(\{id:`spy-light-/,"Spy Vs Spy must retain deliberately sparse room lighting");
assert.match(polish,/voice\.state\.enabled=false/,"legacy dungeon voices must be suppressed while Spy Vs Spy is active");
assert.match(polish,/Spy versus Spy\. Five rounds\./,"Spy Vs Spy must have a dedicated new announcer script");
assert.match(polish,/spySpeak\("matchStart"\)/,"the dedicated Spy Vs Spy announcer must begin with the match");
assert.match(polish,/restoreLegacyVoice\(\)/,"the normal dungeon voice preference must be restored after Spy Vs Spy ends");

assert.match(polish,/function buildHordeArena\(\)/,"Horde Survivor must build its dedicated arena");
assert.match(polish,/world\.rooms=\[room\]/,"Horde Survivor must use exactly one physical room");
assert.match(polish,/hordeArena:true/,"the one-room Horde layout must be explicitly identified");
assert.match(polish,/host\.doors=\[\]/,"the Horde arena must not retain dungeon doors or corridors");
assert.match(polish,/room=\{id:0,x:3,y:3,w:C\.worldWidth-7,h:C\.worldHeight-7/,"the Horde arena must fill nearly the entire 128x84 world");
assert.match(polish,/function arenaPerimeterCell\(enemy\)/,"new Horde enemies must be moved to the arena perimeter");
assert.match(polish,/enemy\.aiState="chase";enemy\.lastSeen=\{x:target\.x,y:target\.y\};enemy\.memoryMs=999999/,"Horde enemies must continuously pursue the nearest living player");

const aiContext={console,performance:{now:()=>1000},window:{},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};aiContext.window.window=aiContext.window;aiContext.window.localStorage=aiContext.localStorage;vm.createContext(aiContext);for(const file of ["js/config.js","js/world.js","js/ai.js"])vm.runInContext(read(file),aiContext,{filename:file});
const AI=aiContext.window.CCGAI,AI_CONFIG=aiContext.window.CCG_CONFIG,map=Array.from({length:AI_CONFIG.worldHeight},()=>Array(AI_CONFIG.worldWidth).fill(0)),world={map,rooms:[{id:0,x:0,y:0,w:8,h:8}],tunnelY:-1},enemy={id:"enemy",x:2,y:4,kind:"scout",hp:2,maxHp:2,alive:true,aiState:"chase",facing:{x:1,y:0},lastSeen:{x:4,y:4},memoryMs:9999,searchMs:0,moveCooldown:0,attackCooldown:9999,chargeCooldown:9999,healCooldown:9999,flash:0},player={id:"player",x:4,y:4,health:8,torchMs:0},host={enemies:[enemy],doors:[],blockingDecor:[],enteredRoomIds:[0],revision:0,worldRef:world};
AI.stepEnemies(host,map,[player],1000,{},world);assert.notDeepEqual({x:enemy.x,y:enemy.y},{x:player.x,y:player.y},"an enemy may approach but never occupy the player's tile");

assert.match(playlist,/const FADE_MS=0/,"Dungeon music must use hard non-overlapping transitions");
assert.match(playlist,/CCGLostSizzlerMusicBus/,"Dungeon music must participate in the exclusive owner bus");
assert.match(hordeAudio,/claim\?\.\("horde-survivor"/,"Horde music must claim exclusive ownership");
assert.match(saboteursAudio,/claim\?\.\("sizzler-saboteurs"/,"Spy Vs Spy music must claim exclusive ownership");
assert.match(voice,/createMediaElementSource\(audio\)/,"main-game recorded voice must receive the dungeon effect");
assert.match(voice,/lowHealthLatch/,"low-health speech must be latched rather than timer-repeated");
assert.match(elf,/const MOVE_MS=450;/,"the Gilded Elf must move twenty percent faster");

console.log("Lost Sizzler V10.33 live modes, direct-door Spy Vs Spy map, dedicated voices, one-room Horde arena, capacity, audio and occupancy checks passed.");
