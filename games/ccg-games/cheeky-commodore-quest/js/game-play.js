function tryKnockPosition(ent,dx,dy){const nx=ent.x+dx,ny=ent.y+dy;if(!W.walkable(world.map,nx,ny,host))return false;if(host.enemies?.some(e=>e!==ent&&e.alive&&e.x===nx&&e.y===ny))return false;ent.x=nx;ent.y=ny;return true}
function knockEnemyAway(e,from){if(!e||!from)return;const dx=Math.sign(e.x-from.x),dy=Math.sign(e.y-from.y);if(dx||dy){if(!tryKnockPosition(e,dx,dy)){if(dx)tryKnockPosition(e,dx,0);else if(dy)tryKnockPosition(e,0,dy)}}}
function knockPlayerAway(p,from){if(!p||!from)return;const dx=Math.sign(p.x-from.x),dy=Math.sign(p.y-from.y),nx=p.x+dx,ny=p.y+dy;if((dx||dy)&&W.walkable(world.map,nx,ny,host)){p.x=nx;p.y=ny}}
function collideWithEnemy(p,e,fromX,fromY){
  if(!p||!e)return;const dx=Math.sign(e.x-fromX),dy=Math.sign(e.y-fromY);
  // Contact pushes both combatants apart. The player takes the impact damage; the enemy does not.
  p.x=fromX;p.y=fromY;p.rx=p.x;p.ry=p.y;tryKnockPosition(e,dx,dy);
  const backX=fromX-dx,backY=fromY-dy;if(W.walkable(world.map,backX,backY,host)&&!host.enemies.some(o=>o.alive&&o!==e&&o.x===backX&&o.y===backY)){p.x=backX;p.y=backY;p.rx=backX;p.ry=backY}
  hurtPlayer(p,1,false,e.follower?.name||e.championName||e.kind);S.sfx("hit");showToast("COLLISION",`${e.follower?.name||e.championName||"An enemy"} knocks you back. -1 health.`,"red",5200)
}
function d1(){const l=input.has("ArrowLeft")||input.has("KeyA"),r=input.has("ArrowRight")||input.has("KeyD"),u=input.has("ArrowUp")||input.has("KeyW"),d=input.has("ArrowDown")||input.has("KeyS");const x=(r?1:0)-(l?1:0),y=(d?1:0)-(u?1:0);return x||y?{x,y}:null}
function d2(){const l=input.has("KeyJ"),r=input.has("KeyL"),u=input.has("KeyI"),d=input.has("KeyK");const x=(r?1:0)-(l?1:0),y=(d?1:0)-(u?1:0);return x||y?{x,y}:null}
let gamepadDashDown=false;
function gamepadDirection(){
  const pads=typeof navigator!=="undefined"&&navigator.getGamepads?navigator.getGamepads():[];const gp=pads&&[...pads].find(Boolean);if(!gp)return null;
  let x=Number(gp.axes?.[0]||0),y=Number(gp.axes?.[1]||0);const dead=.35;x=Math.abs(x)>=dead?Math.sign(x):0;y=Math.abs(y)>=dead?Math.sign(y):0;
  if(gp.buttons?.[14]?.pressed)x=-1;if(gp.buttons?.[15]?.pressed)x=1;if(gp.buttons?.[12]?.pressed)y=-1;if(gp.buttons?.[13]?.pressed)y=1;
  return{x,y,gp,dir:x||y?{x,y}:null}
}
function updateGamepad(){
  if(mode!=="playing"||!p1)return;const state=gamepadDirection();if(!state){gamepadDashDown=false;return}const {gp,dir}=state;if(dir){p1.dir=dir;if(move1<=0){movePlayer(p1,dir.x,dir.y);move1=C.player.moveDelay*(p1.moveMultiplier||1)}}
  if(gp.buttons?.[0]?.pressed&&fire1<=0)firePlayer(p1,dir||p1.dir);const dash=Boolean(gp.buttons?.[1]?.pressed);if(dash&&!gamepadDashDown)dashPlayer(p1,dir||p1.dir);gamepadDashDown=dash
}
function setDir(p,code){const m=p===p2?{KeyJ:{x:-1,y:0},KeyL:{x:1,y:0},KeyI:{x:0,y:-1},KeyK:{x:0,y:1}}:{ArrowLeft:{x:-1,y:0},KeyA:{x:-1,y:0},ArrowRight:{x:1,y:0},KeyD:{x:1,y:0},ArrowUp:{x:0,y:-1},KeyW:{x:0,y:-1},ArrowDown:{x:0,y:1},KeyS:{x:0,y:1}};if(m[code])p.dir=m[code]}
function beginDoorOpening(d,delay=900){
  const now=performance.now(),leaves=d.groupId?(host.doors||[]).filter(x=>x.groupId===d.groupId):[d];if(leaves.every(x=>x.open||x.opening))return;
  for(const leaf of leaves){leaf.locked=d.locked;leaf.opening=true;leaf.openingStart=now;leaf.openAt=now+delay;leaf.open=false;leaf.openSoundDone=false}S.sfx("dooropen");host.revision++;
}
function updateDoors(){
  const now=performance.now();for(const d of host.doors||[])if(d.opening&&now>=d.openAt){d.opening=false;d.open=true;d.openingStart=0;d.openAt=0;if(!d.openSoundDone){d.openSoundDone=true;S.sfx("door")}host.revision++}
}
function closeNearbyDoor(p){if(!p||mode!=="playing")return false;const nearby=(host.doors||[]).filter(d=>d.type==="room"&&!d.locked&&d.open&&md(d,p)<=1).sort((a,b)=>md(a,p)-md(b,p)),d=nearby[0];if(!d){S.sfx("empty");showToast("NO OPEN DOOR IN REACH","Stand beside an open room door and press C to close it.","cyan",4200);return false}const leaves=d.groupId?host.doors.filter(x=>x.groupId===d.groupId):[d],blocked=leaves.some(leaf=>localPlayers().some(x=>x.x===leaf.x&&x.y===leaf.y)||host.enemies.some(e=>e.alive&&e.x===leaf.x&&e.y===leaf.y)||(host.stalker?.awake&&host.stalker.x===leaf.x&&host.stalker.y===leaf.y));if(blocked){showToast("DOORWAY BLOCKED","Move clear of the threshold before closing the door.","red",4200);return false}for(const leaf of leaves){leaf.open=false;leaf.opening=false;leaf.openAt=0;leaf.openingStart=0}S.sfx("door");showToast("DOOR CLOSED","Ordinary enemies cannot open it. The floor's one Death Stalker can. Reopen it by walking into the door.","green",5200);host.revision++;broadcastWorld();return true}
function tryDoor(p,x,y){
  const d=W.doorAt(host,x,y);if(!d)return true;
  if(d.open&&!d.locked)return true;
  if(d.opening)return false;

  if(!d.locked){
    beginDoorOpening(d,d.type==="room"?900:1000);
    return false;
  }
  if(d.type==="secret"){
    d.locked=false;d.hidden=false;stats.secrets++;run.stats.secrets++;S.sfx("secret");awardXP(p,10,"Hidden wall opened");
    showToast("SECRET DOOR FOUND","A section of wall slides aside. The main quest never depends on secrets, but the loot might justify the nosiness.","gold",9000);
    updateQuests();beginDoorOpening(d,1150);return false
  }
  if(d.type==="switch"){S.sfx("locked");showToast("MECHANICAL GATE","A pressure switch elsewhere on this floor controls this door.","red",8500);return false}
  if(d.type==="room"){S.sfx("locked");showToast("DOOR SEALED","This room is locked by the current challenge. Finish what you started in here first.","red",7500);return false}
  if(p.bronzeKeys<=0){S.sfx("locked");showToast("LOCKED BRONZE DOOR","You need a bronze key. This is an optional branch, so leaving it cannot block the floor objective.","red",8500);return false}
  p.bronzeKeys--;d.locked=false;stats.doors++;shake=5;awardXP(p,10,"Bronze door unlocked");
  showToast("BRONZE DOOR UNLOCKED","The lock releases. The door is opening now.","gold",8500);updateQuests();broadcastWorld();beginDoorOpening(d,1050);return false
}
function openChest(p,chest){
  if(!chest?.active)return true;if(chest.locked&&p.bronzeKeys<=0){S.sfx("locked");showToast("LOCKED CHEST","A bronze key opens it. Come back later rather than wasting the entire run staring at the lock.","red");return false}
  if(chest.locked)p.bronzeKeys--;chest.opened=true;chest.openedAt=performance.now();chest.active=false;host.revision++;run.stats.chests++;S.sfx("chest");shake=4;const loot=chest.loot||PGR.lootForChest(chest,run,Math.random),name=loot.weapon?.displayName||loot.name||loot.kind.toUpperCase(),col=loot.rarity==="GOLD MEDAL"?P.gold:loot.rarity==="ZZAP! 97%"?P.pink:P.cyan;showToast("CHEST OPENED",`Inside: ${name}.`,loot.rarity==="GOLD MEDAL"?"gold":loot.rarity==="ZZAP! 97%"?"red":"cyan",6500);setTimeout(()=>{if(["playing","inventory"].includes(mode)){floatPickupText(p,name,col);applyLoot(loot,p)}},500);awardXP(p,10,"Chest opened");broadcastWorld();return true
}
function tryChest(p,x,y){const c=W.chestAt(host,x,y);return c?openChest(p,c):true}
function diagonalClear(dx,dy,p){if(!dx||!dy)return true;return W.walkable(world.map,p.x+dx,p.y,host)&&W.walkable(world.map,p.x,p.y+dy,host)}
function activateSwitch(s,p,shot=false){
  if(!s?.active)return false;s.active=false;const d=host.doors.find(x=>x.id===s.doorId);if(d){d.locked=false;if(s.revealSecret){d.hidden=false;d.discovered=true;stats.secrets++;run.stats.secrets++;showToast("REMOTE SECRET REVEALED","A suspicious wall elsewhere in the dungeon has opened. Shooting switches is now apparently accepted maintenance procedure.","gold",8500)}else{showToast(shot?"WALL SWITCH SHOT":"WALL SWITCH",`A remote gate begins grinding open${s.remote?" elsewhere in the dungeon":""}.`,"green",7000)}awardXP(p,10,s.revealSecret?"Hidden wall switch":"Gate switch opened");beginDoorOpening(d,s.revealSecret?1150:1050)}S.sfx(s.revealSecret?"secret":"door");host.revision++;broadcastWorld();return true
}
function triggerSwitch(p){for(const s of host.switches||[])if(s.active&&s.x===p.x&&s.y===p.y)activateSwitch(s,p,false)}
function triggerShrine(p){for(const s of host.shrines||[])if(s.active&&s.x===p.x&&s.y===p.y){s.active=false;run.stats.shrines++;S.sfx("shrine");const n=Math.random();if(n<.34){p.maxHealth++;p.health=Math.min(p.maxHealth,p.health+2);p.hpBarMs=3000;showToast("SHRINE OF ENDURANCE","+1 maximum health and +2 health now.","green")}else if(n<.68){p.damageBonus=(p.damageBonus||0)+1;p.maxMana=Math.max(30,p.maxMana-8);p.mana=Math.min(p.mana,p.maxMana);showToast("CURSED FIRE BUTTON","+1 damage, but maximum ammo falls by 8. Power usually sends an invoice.","red",7200)}else{p.armor=Math.min(12,p.armor+4);run.alert=Math.min(100,run.alert+18);showToast("NOISY SHRINE","+4 armour, but the dungeon alert level jumps sharply.","gold")}}}
function triggerTrap(p){const now=performance.now();for(const t of host.traps||[])if(t.active&&t.x===p.x&&t.y===p.y&&SYS.trapActive(t,now)){S.sfx("trap");showToast(`${t.kind.toUpperCase()} TRAP`,`The floor was trying to tell you something. -1 health.`,"red");hurtPlayer(p,1,false,`${t.kind} trap`)}}
function triggerRescue(p){const r=host.rescue;if(!r||r.rescued)return;if(!r.following&&md(p,r)<=1){r.following=true;r.found=true;showToast("CCG SCOUT FOUND","Escort the scout itself into one of the permanently lit sanctuary rooms. It follows the nearest player.","green",9000)}}
function triggerArena(p){for(const a of host.arenas||[])if(!a.triggered&&W.roomAt(world,p.x,p.y)===a.roomId){a.triggered=true;a.wave=1;SYS.lockRoomDoors(host,a.roomId,true);showToast("ARENA LOCKDOWN","Doors sealed. Survive the ambush to reopen them and earn a bonus chest.","red",7000);spawnArenaWave(a,4)}}
function triggerTimed(p){for(const t of host.timedRooms||[])if(!t.triggered&&W.roomAt(world,p.x,p.y)===t.roomId){t.triggered=true;t.timeLeft=30000;const room=world.rooms[t.roomId],q={x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.h/2)},stalker=host.enemies.find(e=>e.deathStalker&&e.voidStalker);t.hunterId=stalker?.id||`death-stalker-floor-${run.floor||1}`;const alreadyDefeated=!stalker?.alive||Boolean(t.stalkerDefeated||(host.defeatedDeathStalkers||[]).includes(t.hunterId));if(!alreadyDefeated){stalker.x=q.x;stalker.y=q.y;stalker.timedHunter=true;stalker.aiState="chase";stalker.lastSeen={x:p.x,y:p.y};stalker.memoryMs=999999;stalker.searchMs=0;stalker.moveCooldown=250;stalker.attackCooldown=420;showToast("TIMED CHAMBER — DEATH STALKER","This is the floor's one Death Stalker. FIND 3 ARTEFACTS TO EXCHANGE FOR THE POTION TO KILL THIS INDESTRUCTIBLE ENEMY — or survive until the chamber timer expires.","red",11000)}else showToast("TIMED CHAMBER — STALKER BANISHED","This floor's Death Stalker has already been permanently destroyed. Survive the remaining chamber trial for the reward.","green",8500)}}
function triggerTrader(p){const shops=host.shops?.length?host.shops:[host.trader].filter(Boolean);const t=shops.find(x=>x.active&&x.x===p.x&&x.y===p.y);if(t)openShop(t,p)}
function triggerDeathCache(p){for(const c of host.deathCaches||[])if(c.active&&c.x===p.x&&c.y===p.y){const r=PGR.recoverDeathCache(p,run,c);score+=r.score||0;S.sfx("pickup");host.revision++;showToast("DEATH CACHE RECOVERED",`${r.recovered} carried item${r.recovered===1?"":"s"}, ${r.games} rescued game${r.games===1?"":"s"}, ${Number(r.score||0).toLocaleString()} score and ${Number(r.xp||0).toLocaleString()} XP recovered${r.remaining?`. ${r.remaining} item${r.remaining===1?"":"s"} remain because your inventory is full.`:"."}`,r.remaining?"cyan":"green",8500);if(r.levels?.length){S.sfx("level");queueLevelChoice(p)}broadcastWorld()}}
function triggerSigilRoom(p){
  if(host.sigilRoomId==null||host.sigilResolved||host.sigilLockdown||!host.objective?.complete||W.roomAt(world,p.x,p.y)!==host.sigilRoomId)return;
  if(!host.sigilNamedAmbushSpawned){host.sigilNamedAmbushSpawned=true;const cells=puzzleFloorCells(host.sigilRoomId),roster=C.followerElites||[];for(let i=0;i<2&&cells.length&&roster.length;i++){const f=roster[((run.floor||1)*2+i)%roster.length],q=cells.splice(Math.floor(Math.random()*cells.length),1)[0],hp=Math.ceil((f.hp||8)*(1+(run.floor||1)*.18)),armour=(f.armor||3)+(run.floor||1);const e={id:`sigil-named-${run.floor}-${i}`,...q,kind:f.kind,hp,maxHp:hp,armor:armour,maxArmor:armour,alive:true,follower:{...f},aiState:"chase",facing:{x:i?1:-1,y:0},lastSeen:{x:p.x,y:p.y},memoryMs:999999,searchMs:0,moveCooldown:520+i*90,attackCooldown:620+i*90,chargeCooldown:700,healCooldown:2600,flash:0,hpBarMs:0,sigilDefender:true,restorePotion:true,restoreUsed:false};host.enemies.push(e);host.sigilDefenderIds.push(e.id)}}
  host.sigilLockdown=true;for(const d of host.doors||[])if(d.sigilGate){d.locked=true;d.open=false;d.opening=false;d.openAt=0}
  for(const e of SYS.sigilDefendersAlive(host)){e.aiState="chase";e.lastSeen={x:p.x,y:p.y};e.memoryMs=999999;e.searchMs=0;e.moveCooldown=Math.min(e.moveCooldown||200,220)}host.revision++;S.sfx("alert");showToast("SIGIL CHAMBER LOCKDOWN",`${SYS.sigilDefendersAlive(host).length} defenders are active. The reinforced doors stay sealed until every one of them is defeated.`,"red",10000);broadcastWorld()
}
function puzzleFloorCells(roomId){const room=world.rooms[roomId],out=[];if(!room)return out;for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++)if(world.map[y]?.[x]===0&&W.walkable(world.map,x,y,host)&&!host.enemies.some(e=>e.alive&&e.x===x&&e.y===y)&&!localPlayers().some(p=>p.x===x&&p.y===y))out.push({x,y});return out}
function spawnPuzzleAmbush(roomId,p,count=3,prefix="puzzle"){
  if(!net.isHost&&playMode==="online")return 0;const cells=puzzleFloorCells(roomId),kinds=["scout","ambusher","hunter","charger"],made=[];
  for(let i=0;i<count&&cells.length;i++){const ix=Math.floor(Math.random()*cells.length),q=cells.splice(ix,1)[0],kind=kinds[i%kinds.length],hp=3+(run.floor||1)+Math.floor(i/2);const e={id:`${prefix}-${Date.now()}-${i}-${Math.random().toString(36).slice(2,5)}`,...q,kind,hp,maxHp:hp,alive:true,aiState:"chase",facing:{x:1,y:0},lastSeen:{x:p.x,y:p.y},memoryMs:999999,searchMs:0,moveCooldown:240+i*40,attackCooldown:620+i*70,chargeCooldown:850,healCooldown:999999,flash:0,hpBarMs:0,puzzleSpawn:true};host.enemies.push(e);made.push(e)}host.revision++;broadcastWorld();return made.length
}
function triggerBloodClue(p){const c=host.bloodClue;if(!c||c.seen||md(c,p)>1)return;c.seen=true;run.torchClueSeen=true;run.torchSequence=[...(c.sequence||[])];host.revision++;S.sfx("secret");showToast("FADED BLOOD CLUE",`Four marks remain legible: ${(c.sequence||[]).join(" → ")}. It looks less like decoration and more like an instruction. TAB will keep the clue in your log.`,"red",11000);broadcastWorld()}
function startMemoryPuzzle(p){const z=host.memoryPuzzle;if(!z||z.solved||z.phase!=="idle"||W.roomAt(world,p.x,p.y)!==z.roomId)return;z.phase="show";z.flashElapsed=0;z.flashTile=-1;z.inputIndex=0;host.revision++;S.sfx("shrine");showToast("MEMORY TILE CHAMBER","Watch the floor. Five tiles will flash. Repeat the sequence by stepping on them in the same order.","cyan",9000);broadcastWorld()}
function solveMemoryPuzzle(p){const z=host.memoryPuzzle;if(!z||z.solved)return;z.solved=true;z.phase="solved";z.flashTile=-1;const chest=(host.chests||[]).find(c=>c.id===z.chestId);if(chest)chest.active=true;score+=500;awardXP(p,10,"Memory vault opened");S.sfx("open");showToast("MEMORY SEQUENCE SOLVED","The floor locks into place and a reward cache rises from the chamber. +500 score and +10 XP.","green",9000);host.revision++;broadcastWorld()}
function activateMemoryTile(p,tileIndex){const z=host.memoryPuzzle;if(!z||z.solved||z.phase!=="input")return false;const expected=z.sequence[z.inputIndex];if(tileIndex===expected){z.inputIndex++;S.sfx("pickup");if(z.inputIndex>=z.sequence.length)solveMemoryPuzzle(p);else{floatText(p.x,p.y,`${z.inputIndex}/${z.sequence.length}`,P.cyan);host.revision++}return true}z.failures=(z.failures||0)+1;z.inputIndex=0;z.phase="show";z.flashElapsed=0;z.flashTile=-1;const spawned=spawnPuzzleAmbush(z.roomId,p,3+Math.min(2,z.failures),"memory-fail");S.sfx("alert");showToast("WRONG TILE",`The sequence resets. ${spawned} wandering monster${spawned===1?"":"s"} just received an invitation. Watch the flashes again.`,"red",8500);host.revision++;broadcastWorld();return false}
function triggerMemoryPuzzle(p){const z=host.memoryPuzzle;if(!z||z.solved)return;startMemoryPuzzle(p);if(z.phase!=="input")return;const t=(z.tiles||[]).find(t=>t.x===p.x&&t.y===p.y);if(t)activateMemoryTile(p,t.index)}
function updateMemoryPuzzle(dt){const z=host.memoryPuzzle;if(!z||z.solved||z.phase!=="show")return;z.flashElapsed=(z.flashElapsed||0)+dt;const step=700,idx=Math.floor(z.flashElapsed/step),within=z.flashElapsed%step;z.flashTile=idx<z.sequence.length&&within<430?z.sequence[idx]:-1;if(z.flashElapsed>=z.sequence.length*step+350){z.phase="input";z.flashTile=-1;z.inputIndex=0;S.sfx("pickup");showToast("YOUR TURN","Repeat the five-tile sequence. A wrong step restarts it and attracts company.","cyan",6200);host.revision++;broadcastWorld()}}
function solveSequenceTorch(p){const z=host.sequenceTorchPuzzle;if(!z||z.solved)return;z.solved=true;z.progress=z.sequence.length;for(const t of z.torches||[])t.lit=true;const chest=(host.chests||[]).find(c=>c.id===z.chestId);if(chest)chest.active=true;score+=650;awardXP(p,10,"Torch vault opened");S.sfx("open");showToast("TORCH VAULT OPEN","All four flames hold. Stone grinds aside and the vault reward is exposed. +650 score and +10 XP.","gold",9500);host.revision++;broadcastWorld()}
function activateSequenceTorch(torch,p,shot=false){const z=host.sequenceTorchPuzzle;if(!z||z.solved||!torch)return false;const expected=z.sequence[z.progress||0];if(torch.dir===expected){torch.lit=true;z.progress=(z.progress||0)+1;S.sfx("torch");floatText(torch.x,torch.y,`${z.progress}/4`,P.gold);if(z.progress>=z.sequence.length)solveSequenceTorch(p);else{showToast(`${torch.dir} TORCH LIT`,`${z.progress}/4 correct.${shot?" Shot activated.":""}`,"gold",5200);host.revision++;broadcastWorld()}return true}z.failures=(z.failures||0)+1;z.progress=0;for(const t of z.torches||[])t.lit=false;const spawned=spawnPuzzleAmbush(z.roomId,p,3+Math.min(2,z.failures),"torch-fail");S.sfx("alert");showToast("TORCH ORDER WRONG",`${torch.dir} was not next. Every flame dies and ${spawned} wandering monster${spawned===1?"":"s"} enter the chamber. The faded blood clue from Floor 2 had the order.`,"red",10000);host.revision++;broadcastWorld();return false}
function triggerSequenceTorch(p){const z=host.sequenceTorchPuzzle;if(!z||z.solved)return;const t=(z.torches||[]).find(t=>t.x===p.x&&t.y===p.y);if(t)activateSequenceTorch(t,p,false)}
function weightBridgeCell(list,x,y){return (list||[]).some(q=>q.x===x&&q.y===y)}
function weightBridgeBlocks(p,x,y){const b=host.weightBridge;if(!b)return false;if(weightBridgeCell(b.pitTiles,x,y)){S.sfx("wall");return true}if(!weightBridgeCell(b.bridgeTiles,x,y)||b.stabilized)return false;const carried=PGR.inventoryCount(p),stacks=(p.inventory||[]).length;if(carried>0){S.sfx("locked");if(!b.lastWarnAt||performance.now()-b.lastWarnAt>1600){b.lastWarnAt=performance.now();showToast("ROTTEN BRIDGE — TOO HEAVY",`It will only take your body weight. You are carrying ${carried} item${carried===1?"":"s"} across ${stacks} stack${stacks===1?"":"s"}. TAB lets you DROP them onto the floor and recover them later.`,"red",9000)}return true}b.crossingPlayer=p.id;return false}
function triggerWeightBridge(p){const b=host.weightBridge;if(!b||b.stabilized||b.crossingPlayer!==p.id)return;const xs=(b.bridgeTiles||[]).map(q=>q.x),ys=(b.bridgeTiles||[]).map(q=>q.y),passed=b.entranceSide==="west"?p.x>Math.max(...xs):b.entranceSide==="east"?p.x<Math.min(...xs):b.entranceSide==="north"?p.y>Math.max(...ys):p.y<Math.min(...ys);if(!passed)return;b.stabilized=true;b.crossingPlayer=null;score+=350;S.sfx("open");showToast("BRIDGE STABILIZED","You crossed empty-handed. The old planks settle into the supports and will now carry you back. +350 score.","green",9000);host.revision++;broadcastWorld()}

function triggerBoulder(p){const b=host.boulderTrap;if(!b||b.cleared||b.triggered||W.roomAt(world,p.x,p.y)!==b.roomId)return;const da=md(p,b.start),db=md(p,b.end),from=da>=db?b.start:b.end,to=da>=db?b.end:b.start;b.x=from.x;b.y=from.y;b.target={...to};b.dx=Math.sign(to.x-from.x);b.dy=Math.sign(to.y-from.y);b.warningMs=1000;b.moveMs=0;b.active=true;b.triggered=true;S.sfx("trap");showToast("BOULDER CORRIDOR — RUN!","A stone boulder has broken loose at the far end of the hall. Keep moving and get out of its lane before it reaches you.","red",7600);host.revision++;broadcastWorld()}
function updateBoulder(dt){const b=host.boulderTrap;if(!b?.active||b.cleared)return;if(b.warningMs>0){b.warningMs=Math.max(0,b.warningMs-dt);return}b.moveMs-=dt;if(b.moveMs>0)return;b.moveMs=b.stepMs||155;b.x+=b.dx;b.y+=b.dy;shake=Math.max(shake,3);for(const p of localPlayers())if(p.x===b.x&&p.y===b.y){hurtPlayer(p,b.damage||2,false,"rolling boulder");const nx=p.x+b.dx,ny=p.y+b.dy;if(W.walkable(world.map,nx,ny,host)){p.x=nx;p.y=ny}}if(b.x===b.target.x&&b.y===b.target.y){b.active=false;b.cleared=true;score+=250;S.sfx("door");showToast("BOULDER CORRIDOR SURVIVED","The boulder crashes into the far wall. +250 score.","green",7000)}host.revision++}
function movementTriggers(p){triggerSwitch(p);triggerTrader(p);triggerDeathCache(p);triggerBloodClue(p);triggerMemoryPuzzle(p);triggerSequenceTorch(p);triggerWeightBridge(p);triggerShrine(p);triggerTrap(p);triggerRescue(p);triggerArena(p);triggerTimed(p);triggerBoulder(p);triggerSigilRoom(p);markRoomVisit(p);rememberTrail(p)}
function movePlayer(p,dx,dy,dash=false){
  if(mode!=="playing"||!p||(p.hitStunMs||0)>0)return;p.dir={x:dx,y:dy};const ox=p.x,oy=p.y;
  for(let n=0;n<(dash?2:1);n++){
    if(dx&&dy&&!diagonalClear(dx,dy,p)){if(n===0)S.sfx("wall");break}
    const warp=(!dy)?W.tunnelDestination(world,p.x,p.y,dx,dy):null;if(warp){p.x=warp.x;p.y=warp.y;p.rx=warp.x;p.ry=warp.y;S.sfx("warp");burst(p.x,p.y,P.cyan,18,1.2);movementTriggers(p);continue}
    const nx=p.x+dx,ny=p.y+dy;if(weightBridgeBlocks(p,nx,ny)||!tryDoor(p,nx,ny)||!tryChest(p,nx,ny))break;if(!W.walkable(world.map,nx,ny,host)){if(n===0)S.sfx("wall");break}
    p.x=nx;p.y=ny;for(const i of host.items)if(i.active&&i.x===nx&&i.y===ny)requestCollect(i,p);
    const collision=host.enemies.find(e=>e.alive&&e.x===nx&&e.y===ny);if(collision){if(dash&&p.dashDamage>0)damageEnemy(collision,p.dashDamage,"physical",p);collideWithEnemy(p,collision,ox,oy);break}
    if(host.stalker?.awake&&host.stalker.x===nx&&host.stalker.y===ny)hurtPlayer(p,C.stalker.hitDamage,false,C.stalker.name);
    if(nx===world.exit.x&&ny===world.exit.y){
      if(host.exitOpen){if(playMode==="online")net.send("complete",{by:p.name});floorComplete(p.name);return}
      const why=!host.objective?.complete?"The floor objective is still incomplete.":!host.exitSigilCollected?"The exit needs the EXIT SIGIL carried by the Sigil Warden.":"The exit mechanism has not released yet.";
      S.sfx("locked");showToast("FLOOR EXIT SEALED",why,"red",9000);
    }
    updateRoomMessage(p,false);reveal(p);movementTriggers(p)
  }
  if(dash){S.sfx("dash");trailBetween(ox,oy,p.x,p.y,p===p2?P.green:P.cyan)}
}
function dashPlayer(p,d){if(!p||!d||mode!=="playing")return;if(p.mana<2){S.sfx("empty");showToast("NOT ENOUGH AMMO/ENERGY","Dash requires 2 reserve units.","red");return}p.mana-=2;movePlayer(p,d.x,d.y,true);sync()}
function spreadDirections(d){const dirs=[d];if(d.x&&d.y){dirs.push({x:d.x,y:0},{x:0,y:d.y})}else if(d.x)dirs.push({x:d.x,y:1},{x:d.x,y:-1});else dirs.push({x:1,y:d.y},{x:-1,y:d.y});return dirs}
function weaponDirections(p,d){const w=p.weapon||{};if(w.id==="shock")return[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1},{x:1,y:1},{x:1,y:-1},{x:-1,y:1},{x:-1,y:-1}];if(w.id==="spread"||w.shots>=3)return spreadDirections(d);return[d]}
function firePlayer(p,d){
  if(!p||mode!=="playing"||(p.hitStunMs||0)>0)return;const cd=p===p2?fire2:fire1;if(cd>0)return;const w=p.weapon||baseWeapon(),active=bullets.filter(b=>b.owner===p.id&&b.ttl>0).length,max=C.player.maxProjectiles+Math.max(0,(w.shots||1)-1);if(active>=max){S.sfx("empty");return}
  const ammoCost=1;if(p.mana<ammoCost){S.sfx("empty");if(p.mana<=0&&!(p.emergencyRechargeMs>0)){p.emergencyRechargeMs=C.player.emergencyRechargeMs;showToast("EMERGENCY CAPACITOR CHARGING",`You are completely dry. Survive for ${Math.ceil(C.player.emergencyRechargeMs/1000)} seconds and the reserve capacitor will restore ${C.player.emergencyAmmo} emergency shots.`,"red",8500)}else showToast("LOW AMMO","Find a supply pack or switch tactics.","red");return}
  d=d||p.dir||{x:1,y:0};p.dir=d;p.mana-=ammoCost;p.ammoFlashMs=C.player.ammoFlashMs;run.alert=Math.min(100,run.alert+1.8);const delay=(p.rapidMs>0?88:C.player.fireDelay)*(w.delay||1);if(p===p2)fire2=delay;else fire1=delay;
  const dirs=weaponDirections(p,d);for(const z of dirs.slice(0,Math.max(1,max-active))){const b={id:`${p.id}-${Date.now()}-${Math.random()}`,owner:p.id,ownerName:p.name,x:p.x,y:p.y,dx:z.x,dy:z.y,ttl:w.ttl||18,power:(w.power||1)+(p.damageBonus||0),pierce:w.pierce||0,element:w.element||"energy",style:w.id||"pulse"};spawnBullet(b,false);if(playMode==="online"&&p===p1)net.send("shot",b)}S.sfx("fire");muzzle(p.x,p.y,d);sync()
}
function spawnBullet(b,remoteShot){if(b)bullets.push({...b,remote:!!remoteShot})}
function spawnEnemyShot(b){if(!b)return;enemyBullets.push({...b,ttl:Number(b.ttl||14)});if(localPlayers().some(p=>md(b,p)<9))S.sfx(b.style==="food"?"food":b.style==="fire"?"flame":"enemy")}
function damageGenerator(g,power,p){
  if(!g?.alive)return;g.hp-=power;g.hpBarMs=2800;S.sfx("generator");floatText(g.x,g.y,`-${power}`,P.orange);if(g.hp>0)return;
  g.alive=false;run.stats.generators++;stats.generators++;score+=700;let artefact=false;
  if(Math.random()<.42){const loot={kind:"artefact",rarity:"SIZZLER",name:"Generator Core Artefact",xp:190};host.items.push({id:`gen-artefact-${Date.now()}-${Math.random()}`,x:g.x,y:g.y,kind:"loot",loot,active:true,title:loot.name});artefact=true}
  showToast("GENERATOR DESTROYED",`Reinforcements from this machine have stopped. +700 score${artefact?". Its core dropped a rare artefact.":"."}`,"green",8500);SYS.updateObjective(host,run,Math.round(PGR.roomCompletion(explored.get(p.id)||new Set(),world)*100));host.revision++;broadcastWorld()
}
function hitStalker(b){
  const s=host.stalker;if(!s?.awake||s.stunMs>0)return false;if(Math.round(b.x)!==s.x||Math.round(b.y)!==s.y)return false;
  s.stunMs=Math.min(120,C.stalker.stunOnShotMs);showToast(`${C.stalker.name.toUpperCase()} CANNOT BE KNOCKED BACK`,`Weapons cannot damage or move him. FIND 3 ARTEFACTS TO EXCHANGE FOR THE POTION TO KILL THIS INDESTRUCTIBLE ENEMY`,"red",6500);S.sfx("stalker");return true
}
function projectilePathClear(b,nx,ny){
  // Closed, locked and still-opening doors are solid to gunfire as well as movement.
  if(!W.walkable(world.map,nx,ny,host))return false;
  // Diagonal shots must not cut across the corner of a closed door or wall.
  if(b.dx&&b.dy){
    const sx=Math.sign(b.dx),sy=Math.sign(b.dy);
    if(!W.walkable(world.map,b.x+sx,b.y,host)||!W.walkable(world.map,b.x,b.y+sy,host))return false;
  }
  return true;
}
function stepProjectiles(){
  for(const b of bullets){
    if(b.ttl<=0)continue;const nx=b.x+b.dx,ny=b.y+b.dy;if(!projectilePathClear(b,nx,ny)){b.ttl=0;burst(b.x,b.y,P.orange,4,.7);S.sfx("wall");continue}b.x=nx;b.y=ny;b.ttl--;
    const puzzleTorch=(host.sequenceTorchPuzzle?.torches||[]).find(t=>t.x===Math.round(nx)&&t.y===Math.round(ny));if(puzzleTorch&&!host.sequenceTorchPuzzle?.solved){activateSequenceTorch(puzzleTorch,findLocal(b.owner)||p1,true);b.ttl=0;continue}
    const sw=(host.switches||[]).find(s=>s.active&&s.x===Math.round(nx)&&s.y===Math.round(ny));if(sw){activateSwitch(sw,findLocal(b.owner)||p1,true);b.ttl=0;continue}
    if(hitStalker(b)){b.ttl=0;continue}
    const g=(host.generators||[]).find(g=>g.alive&&g.x===Math.round(nx)&&g.y===Math.round(ny));if(g){damageGenerator(g,b.power,findLocal(b.owner)||p1);if(b.pierce>0)b.pierce--;else b.ttl=0;continue}
    // Projectile collision is authoritative and never checks visibleTo: blind fire can hit an enemy in darkness.
    const e=host.enemies.find(e=>e.alive&&e.x===Math.round(nx)&&e.y===Math.round(ny));if(e){burst(e.x,e.y,e.deathStalker&&e.voidStalker?P.purple:P.orange,9,1.1);const owner=findLocal(b.owner);if(owner){damageEnemy(e,b.power,b.element,owner)}else if(playMode==="online")net.send("hit",{enemyId:e.id,power:b.power,element:b.element,owner:b.owner,ownerName:b.ownerName,source:{x:b.x,y:b.y}});if(b.pierce>0)b.pierce--;else b.ttl=0;continue}
    for(const lp of localPlayers())if(lp.id!==b.owner&&Math.round(nx)===lp.x&&Math.round(ny)===lp.y){b.ttl=0;hurtPlayer(lp,1,true,b.ownerName||"your co-op partner");break}
  }
  for(const b of enemyBullets){if(b.ttl<=0)continue;const nx=b.x+b.dx,ny=b.y+b.dy;if(!projectilePathClear(b,nx,ny)){b.ttl=0;continue}b.x=nx;b.y=ny;b.ttl--;if(b.style==="fire")burst(nx,ny,Math.random()<.5?P.orange:P.gold,3,.6);for(const lp of localPlayers())if(Math.round(nx)===lp.x&&Math.round(ny)===lp.y){b.ttl=0;hurtPlayer(lp,Number(b.power||1),false,b.source||"enemy");const px=lp.x+b.dx,py=lp.y+b.dy;if(W.walkable(world.map,px,py,host)){lp.x=px;lp.y=py}break}}
  for(let i=bullets.length-1;i>=0;i--)if(bullets[i].ttl<=0)bullets.splice(i,1);for(let i=enemyBullets.length-1;i>=0;i--)if(enemyBullets[i].ttl<=0)enemyBullets.splice(i,1)
}
function hurtPlayer(p,n,friendly=false,source="enemy"){
  if(!p||p.invuln>0||mode!=="playing")return;p.hitStunMs=Math.max(p.hitStunMs||0,C.player.hitStunMs||180);let left=n;if(p.armor>0){const a=Math.min(p.armor,left);p.armor-=a;left-=a;if(a){S.sfx("armour");floatText(p.x,p.y,"ARMOUR",P.cyan)}}if(left<=0){p.invuln=350;sync();return}
  p.health-=left;p.hpBarMs=3000;run.stats.damageTaken+=left;if(friendly)run.stats.friendlyFire+=left;p.invuln=800;shake=10;damageFlash=.5;S.sfx("hurt");burst(p.x,p.y,P.red,16,1.4);ring(p.x,p.y,P.red,30);
  if(friendly){showToast("FRIENDLY FIRE",`${source} just shot a team-mate. The monsters are delighted.`,"red");say("<strong>FRIENDLY FIRE.</strong> Try pointing the dangerous end elsewhere.","red")}
  if(p.health<=0){
    if(/death stalker/i.test(String(source))){for(const stalker of host.enemies||[])if(stalker.alive&&stalker.deathStalker){stalker.x=Number(stalker.x0??stalker.x);stalker.y=Number(stalker.y0??stalker.y);stalker.aiState="idle";stalker.hunting=false;stalker.lastSeen=null;stalker.memoryMs=0;stalker.searchMs=0;stalker.moveCooldown=3200;stalker.attackCooldown=3200}}
    if(new RegExp(C.stalker.name,"i").test(String(source))&&host.stalker){host.stalker.x=Number(host.stalker.x0??host.stalker.x);host.stalker.y=Number(host.stalker.y0??host.stalker.y);host.stalker.moveCooldown=3200;host.stalker.near=false}
    S.sfx("playerDeath");if(run.daily){run.dailyFailed=true;p.health=0;showToast("WEEKLY VAULT — RUN OVER","Death is final in the Weekly High-Score Vault. Your score is being recorded; try again after the next weekly reset.","red",9000);endRun("Weekly High-Score Vault ended on death");return}
    const deathX=p.x,deathY=p.y,cache=PGR.createDeathCache(p,run,deathX,deathY),penalty=PGR.applyDeathPenalty(p,score,run);score=penalty.score;cache.score=penalty.scoreLost||0;cache.xp=penalty.xpLost||0;cache.active=cache.active||cache.score>0||cache.xp>0;run.stats.deaths=(run.stats.deaths||0)+1;run.consecutiveDeaths=(run.consecutiveDeaths||0)+1;if(cache.active){host.deathCaches=host.deathCaches||[];host.deathCaches.push(cache)}
    if(penalty.gameOver){p.health=0;run.xpGameOver=true;PGR.clearCheckpoint();showToast("XP RESERVE EXHAUSTED","You have burned through every XP point you had earned. This run is over.","red",10000);endRun("Your XP reserve reached zero after repeated deaths");return}
    p.health=p.maxHealth;p.hpBarMs=3200;p.mana=Math.max(35,Math.floor(p.maxMana*.6));p.ammoFlashMs=C.player.ammoFlashMs;p.x=world.start.x;p.y=world.start.y;p.rx=p.x;p.ry=p.y;setTimeout(()=>{if(S.isEnabled())S.sfx("respawn")},520);
    const explore=Math.round(PGR.roomCompletion(explored.get(p.id)||new Set(),world)*100),objective=SYS.objectiveText(host,run,explore),cacheText=cache.active?` Your death box holds ${Number(cache.score||0).toLocaleString()} score, ${Number(cache.xp||0).toLocaleString()} XP and dropped loot. Recover it before another death.`:" You had nothing to cache.",xpText=penalty.xpLost?` ${penalty.xpLost} XP moved to the death box.${penalty.levelLost?` Level ${penalty.levelBefore} fell to ${penalty.levelAfter}; ${penalty.lostSkill||"the latest upgrade"} was lost until you earn the level again.`:" Your current level was retained."}`:" No XP was available to lose.";
    showToast(`${p.name.toUpperCase()} RESPAWNS — SCORE HALVED`,`OBJECTIVE: ${objective}.${xpText}${cacheText}`,"red",10000);host.revision++;broadcastWorld();if(run.consecutiveDeaths>=5)setTimeout(()=>{if(mode==="playing")offerFloorSave(true)},650)
  }sync()
}
function updateCamping(p,dt){let c=campStates.get(p.id);if(!c){resetCamp(p);c=campStates.get(p.id)}const moved=p.x!==c.lastX||p.y!==c.lastY;if(c.active){if(Math.hypot(p.x-c.originX,p.y-c.originY)>=C.camping.resetDistance){resetCamp(p,true);return}c.lastX=p.x;c.lastY=p.y}else if(moved){resetCamp(p,true);return}c.elapsed+=dt;if(c.elapsed<C.camping.graceMs)return;if(!c.active){c.active=true;c.originX=p.x;c.originY=p.y;c.nextBlast=150;c.blastCount=0;S.sfx("campwarn");run.alert=Math.min(100,run.alert+14);showToast("60 SECONDS IDLE — LEAVE THE ZONE","Every second blast targets you for 1 HP. Move six tiles away to stop the barrage.","red",7500)}c.nextBlast-=dt;if(c.nextBlast<=0){c.blastCount++;let q;if(c.blastCount%C.camping.directBlastEvery===0)q={x:p.x,y:p.y,direct:true};else{const a=[];for(let dy=-C.camping.zoneRadius;dy<=C.camping.zoneRadius;dy++)for(let dx=-C.camping.zoneRadius;dx<=C.camping.zoneRadius;dx++){const x=c.originX+dx,y=c.originY+dy;if(W.walkable(world.map,x,y,host)&&Math.hypot(dx,dy)<=C.camping.zoneRadius+.2)a.push({x,y})}q=a[Math.floor(Math.random()*a.length)]||{x:c.originX,y:c.originY}}hazards.push({x:q.x,y:q.y,life:C.camping.warningMs,maxLife:C.camping.warningMs,direct:!!q.direct,campOwner:p.id,originX:c.originX,originY:c.originY});c.nextBlast=C.camping.blastIntervalMs}}
function updateHazards(dt){for(let i=hazards.length-1;i>=0;i--){const h=hazards[i];h.life-=dt;if(h.life>0)continue;hazards.splice(i,1);S.sfx("explosion");shake=Math.max(shake,h.direct?13:9);burst(h.x,h.y,P.orange,h.direct?32:24,h.direct?2.1:1.8);ring(h.x,h.y,P.red,h.direct?54:42);if(h.direct){const target=localPlayers().find(p=>p.id===h.campOwner);if(target&&Math.hypot(target.x-h.originX,target.y-h.originY)<C.camping.resetDistance)hurtPlayer(target,1,false,"anti-loitering blast")}}}
function roomMoodFor(roomId){
  const room=world.rooms[roomId];if(!room)return "normal";
  if(room.sanctuary)return "sanctuary";
  if(room.dangerous)return "danger";
  return {C64_ARCHIVE:"archive","1541_WORKSHOP":"workshop",BUDGET_BIN:"budget",DEMO_LOUNGE:"demo",ARMOURY:"armoury",CPU_KITCHEN:"kitchen",SID_REACTOR:"reactor",WARP_GALLERY:"warp",ZZAP_LIBRARY:"library",TAPE_STORE:"tape",CARTRIDGE_BAY:"cartridge",CRACKED_INTRO:"cracked",PIXEL_FOUNDRY:"foundry",MODEM_EXCHANGE:"modem",HIGH_SCORE_CRYPT:"crypt",CRT_MAZE:"crt",TREASURE_VAULT:"vault"}[room.theme]||"normal";
}
function updateRoomMessage(p,force){
  const r=W.roomAt(world,p.x,p.y);if(!force&&r===p.lastRoom)return;p.lastRoom=r;
  const th=W.themeAt(world,p.x,p.y),room=world.rooms[r];
  UI.surroundings.innerHTML=`<strong>${th.name}</strong> — ${th.message}${room?.sanctuary?" <b>PERMANENTLY LIT SANCTUARY.</b>":room?.sigilRoom?" <b>SIGIL WARDEN TERRITORY.</b>":room?.dangerous?" <b>DANGER ROOM.</b>":""}`;
  if(p===p1)S.setRoomMood(roomMoodFor(r));
  if(force)return;
  S.sfx("room");
  if(room?.sanctuary)showToast(`SANCTUARY — ${th.name}`,"Permanent wall torches illuminate this room. Ordinary monsters will not enter, but Death Stalkers do not respect comfortable assumptions.","green",9000);
  else if(room?.sigilRoom)showToast("SIGIL CHAMBER",host.sigilLockdown?"LOCKDOWN ACTIVE. Defeat every Sigil defender before the Exit Sigil can appear.":"The reinforced route is open. Crossing the threshold will seal the chamber and alert every defender.","red",9500);
  else if(room?.dangerous)showToast(`DANGER — ${th.name}`,"This room contains an active hazard, challenge or major threat. Watch the floor before charging in.","red",8500);
}
function surroundingsTick(){
  if(!p1)return;const room=W.roomAt(world,p1.x,p1.y),hidden=host.enemies.filter(e=>e.alive&&W.roomAt(world,e.x,e.y)===room&&!visibleTo(p1,e.x,e.y)).length;
  let text;
  if(host.stalker?.awake&&md(host.stalker,p1)<C.stalker.nearDistance)text=`<strong>YOU HEAR SLOW FOOTSTEPS.</strong> ${C.stalker.name} is somewhere nearby.`;
  else if(hidden>0)text=`<strong>YOU HEAR MOVEMENT.</strong> ${hidden>1?"Several things are":"Something is"} moving beyond the light.`;
  else if(p1.torchMs>0)text="<strong>TORCHLIGHT.</strong> You can see farther, but the flame raises dungeon alert.";
  else text=`<strong>${W.themeAt(world,p1.x,p1.y).name.toUpperCase()}.</strong> ${W.themeAt(world,p1.x,p1.y).message}`;
  if(text!==lastAmbientMessage){lastAmbientMessage=text;say(text)}
}
function spawnArenaWave(a,count){const room=world.rooms[a.roomId];for(let i=0;i<count;i++){const x=Math.max(room.x+1,Math.min(room.x+room.w-1,room.x+2+(i*3)%Math.max(2,room.w-2))),y=Math.max(room.y+1,Math.min(room.y+room.h-1,room.y+2+(i*2)%Math.max(2,room.h-2)));host.enemies.push({id:`arena-${a.id}-${a.wave}-${i}-${Date.now()}`,x,y,kind:i%3===0?"hunter":"scout",hp:3+run.floor,maxHp:3+run.floor,alive:true,aiState:"chase",facing:{x:1,y:0},lastSeen:{x:p1.x,y:p1.y},memoryMs:5000,searchMs:0,moveCooldown:100,attackCooldown:500,chargeCooldown:0,healCooldown:999999,flash:0,hpBarMs:0,arenaId:a.id})}host.revision++}
function updateArena(){for(const a of host.arenas||[])if(a.triggered&&!a.cleared){const alive=host.enemies.some(e=>e.alive&&e.arenaId===a.id);if(!alive){if(a.wave<2){a.wave++;showToast("ARENA WAVE TWO","Apparently one ambush was considered insufficient.","red");spawnArenaWave(a,5)}else{a.cleared=true;SYS.lockRoomDoors(host,a.roomId,false);for(const d of host.doors||[])if(d.type==="room"&&d.roomId===a.roomId)beginDoorOpening(d,900);showToast("ARENA CLEARED","The room doors swing open. A Sizzler-quality chest has appeared.","green");const room=world.rooms[a.roomId],c={id:`arena-chest-${Date.now()}`,x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.h/2),locked:false,active:true,depth:(room.depth||0)+5,roomId:a.roomId};c.loot=PGR.lootForChest(c,run,()=>Math.random()*.7);host.chests.push(c)}}}}
function updateTimed(dt){for(const t of host.timedRooms||[])if(t.triggered&&!t.cleared){const p=localPlayers().find(p=>W.roomAt(world,p.x,p.y)===t.roomId),hunter=host.enemies.find(e=>e.id===t.hunterId);if(!p){if(hunter){hunter.aiState="search";hunter.memoryMs=5000}t.triggered=false;t.timeLeft=30000;showToast("TIMED CHALLENGE FAILED","You left the chamber before the timer expired. The Death Stalker remains somewhere on this floor.","red");continue}if(hunter){hunter.aiState="chase";hunter.lastSeen={x:p.x,y:p.y};hunter.memoryMs=999999}t.timeLeft-=dt;if(t.timeLeft<=0){t.cleared=true;if(hunter){hunter.aiState="search";hunter.memoryMs=5000}showToast("TIMED CHAMBER CLEARED","Thirty seconds survived. The Death Stalker remains until permanently destroyed with a Banishment Flask. Bonus armour awarded.","green");applyLoot({kind:"armour",amount:3,rarity:"SIZZLER",name:"SIZZLER Survival Plate"},p)}}}
function generatorIlluminated(g){
  if(SYS.isPermanentLit(world,g.x,g.y))return true;
  const roomId=W.roomAt(world,g.x,g.y);
  for(const p of allPlayers()){
    const r=PGR.effectiveSight(p,run);
    if(Math.hypot(p.x-g.x,p.y-g.y)<=r+.2&&A.lineOfSight(world.map,p,g,r,host))return true;
  }
  const lr=C.enemy.followerLightRadius||5;
  for(const e of host.enemies||[])if(e.alive&&e.follower&&W.roomAt(world,e.x,e.y)===roomId&&Math.hypot(e.x-g.x,e.y-g.y)<=lr+.2&&A.lineOfSight(world.map,e,g,lr,host))return true;
  return false;
}
function updateGenerators(dt){
  if(!net.isHost)return;
  for(const g of host.generators||[])if(g.alive){
    const lit=generatorIlluminated(g);if(!lit){g.powered=false;continue}if(!g.powered){g.powered=true;g.spawnCooldown=Math.max(g.spawnCooldown||0,1700);if(localPlayers().some(p=>W.sameRoom(world,p,g)))S.sfx("generator")}
    g.spawnCooldown-=dt;const rate=run.modifier?.id==="RESTLESS_DUNGEON"?.65:1;if(g.spawnCooldown>0)continue;
    g.spawnCooldown=(7200+Math.random()*2800)*rate;const aliveSpawned=(host.enemies||[]).filter(e=>e.alive&&e.generatorId===g.id).length;if(aliveSpawned>=C.dungeon.generatorSpawnCap)continue;
    const pos=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:g.x+dx,y:g.y+dy})).find(q=>W.walkable(world.map,q.x,q.y,host)&&!host.enemies.some(e=>e.alive&&e.x===q.x&&e.y===q.y));if(!pos)continue;
    g.spawnTotal=(g.spawnTotal||0)+1;host.enemies.push({id:`spawn-${Date.now()}-${Math.random()}`,...pos,kind:Math.random()<.3?"hunter":"scout",hp:2+run.floor,maxHp:2+run.floor,alive:true,aiState:"idle",facing:{x:1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:900,attackCooldown:800,chargeCooldown:0,healCooldown:999999,flash:0,hpBarMs:0,generatorId:g.id,generatorSpawnOrdinal:g.spawnTotal});S.sfx("generator");host.revision++
  }
}
function updateRescue(){const r=host.rescue;if(!r?.following||r.rescued)return;const target=localPlayers().sort((a,b)=>md(a,r)-md(b,r))[0];if(!target)return;if(md(target,r)>1){const next=SYS.pathStep(world,host,r,target,true);if(next){r.x=next.x;r.y=next.y}}if(SYS.inSanctuary(world,r.x,r.y)){r.rescued=true;r.following=false;showToast("SCOUT REACHES SANCTUARY","The rescue objective is complete.","green");SYS.updateObjective(host,run,Math.round(PGR.roomCompletion(explored.get(target.id)||new Set(),world)*100))}}
function updateStalker(dt){
  const s=host.stalker;if(!s||s.permanentlyBanished||!C.stalker.enabled||run.floor<C.stalker.startFloor){S.setStalkerNear(Boolean(host.voidStalkerInSight));return}
  s.spawnTimer-=dt;if(!s.awake&&s.spawnTimer<=0){s.awake=true;s.seen=false;s.hp=s.maxHp;s.vulnerableMs=0;s._banishWarned=false;S.sfx("stalker");showToast("SOMETHING HAS ENTERED THE VAULT","FIND 3 ARTEFACTS TO EXCHANGE FOR THE POTION TO KILL THIS INDESTRUCTIBLE ENEMY","red",9000);logEvent("The normal music seems suddenly less confident.","red",10000)}if(!s.awake)return;
  if(s.stunMs>0){s.stunMs-=dt;return}s.moveCooldown-=dt;const targets=localPlayers(),target=targets.sort((a,b)=>md(a,s)-md(b,s))[0];if(!target)return;const sees=W.sameRoom(world,s,target)||A.lineOfSight(world.map,s,target,C.enemy.lineOfSightRange,host);if(sees)s.seen=true;
  if(s.seen&&s.moveCooldown<=0){const next=SYS.pathStep(world,host,s,target,true);if(next){s.x=next.x;s.y=next.y}s.moveCooldown=C.stalker.moveMs/PGR.difficulty(run).stalker}if(md(s,target)<=1)hurtPlayer(target,C.stalker.hitDamage,false,C.stalker.name);
  if(md(s,target)<=C.stalker.drainDistance){s.drainTimer=(s.drainTimer??1000)-dt;while(s.drainTimer<=0){s.drainTimer+=1000;const drain=C.stalker.drainPerSecond||10;score=Math.max(0,score-drain);target.totalXp=Math.max(0,(target.totalXp||0)-drain);target.xp=Math.max(0,(target.xp||0)-drain);run.floorXP=Math.max(0,(run.floorXP||0)-drain);floatText(target.x,target.y,`-${drain} SCORE / XP`,P.red);S.sfx("stalker")}}else s.drainTimer=1000;
  const near=md(s,target)<=C.stalker.nearDistance||W.sameRoom(world,s,target);if(near!==s.near){s.near=near;S.setStalkerNear(near||Boolean(host.voidStalkerInSight));if(near)showToast(`${C.stalker.name.toUpperCase()} IS NEAR`,`FIND 3 ARTEFACTS TO EXCHANGE FOR THE POTION TO KILL THIS INDESTRUCTIBLE ENEMY`,"red",8000)}
}
function updateBanishment(){const threats=(host.enemies||[]).filter(e=>e.alive&&e.deathStalker),sight=threats.some(e=>localPlayers().some(p=>Math.hypot(e.x-p.x,e.y-p.y)<=C.enemy.torchSightRange&&A.lineOfSight(world.map,p,e,C.enemy.torchSightRange,host)));host.voidStalkerInSight=sight;S.setStalkerSight?.(sight);S.setStalkerNear(sight||Boolean(host.stalker?.near))}
function updateNamedEncounters(){
  const visible=(host.enemies||[]).filter(e=>e.alive&&e.follower&&localPlayers().some(p=>visibleTo(p,e.x,e.y))).sort((a,b)=>md(a,p1)-md(b,p1));const chosen=visible[0]||null;
  for(const e of visible)if(!e.dossierSeen){e.dossierSeen=true;run.stats.namedEncounters=(run.stats.namedEncounters||0)+1;PGR.recordNamedEncounter(e.follower.name,false);showToast(`NAMED ENEMY — ${e.follower.name.toUpperCase()}`,"Encounter added to your dossier. Named enemies carry a Restore Potion and scale with your level.","gold",6800)}
  S.setNamedEnemy?.(chosen?.follower?.name||"");if(!host.stalker?.near)S.setRoomMood(chosen?"named":roomMoodFor(W.roomAt(world,p1.x,p1.y)))
}
function updateFloorObjective(){
  const pct=Math.round(PGR.roomCompletion(explored.get(p1.id)||new Set(),world)*100);SYS.updateObjective(host,run,pct);
  if(host.objective.complete&&!host._objectiveAnnounced){
    host._objectiveAnnounced=true;S.sfx("open");
    showToast("FLOOR OBJECTIVE COMPLETE","The exit is still sealed. Find and defeat the Sigil Warden, recover the EXIT SIGIL, then make it back alive.","green",10500);
  }
  if(host.exitOpen&&!host._exitAnnounced){host._exitAnnounced=true;S.sfx("open");showToast("EXIT UNSEALED","Main objective complete and Exit Sigil acquired. The floor exit is now available.","gold",9500)}
  updateQuests()
}

function updateRoomEvents(dt){
  if(!net.isHost)return;host.nextEvent=(host.nextEvent||30000)-dt;if(host.nextEvent>0)return;host.nextEvent=42000+Math.random()*28000;const r=Math.random();
  if(r<.25){const live=(host.generators||[]).filter(g=>g.alive);if(live.length){live[Math.floor(Math.random()*live.length)].spawnCooldown=0;showToast("MONSTER NEST AWAKENS","A generator somewhere on the floor has accelerated its next spawn.","red",6500)}}
  else if(r<.5){run.alert=Math.min(100,run.alert+18);showToast("PATROL SHIFT","You hear several doors and hurried footsteps. Dungeon alert has increased.","red",6500);for(const e of host.enemies.filter(e=>e.alive&&e.aiState==="idle").slice(0,4)){e.aiState="search";e.searchMs=3500}}
  else if(r<.72){const room=world.rooms[Math.floor(Math.random()*world.rooms.length)];if(room&&!room.optional){const q={x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.h/2)};host.items.push({id:`supply-${Date.now()}`,...q,kind:"ammo",active:true,title:"Emergency Ammo Cache"});showToast("SUPPLY SIGNAL DETECTED","An ammunition cache has appeared somewhere in the explored dungeon.","cyan",6500)}}
  else{showToast("THE DUNGEON SHIFTS","Lights flicker, mechanisms turn and the patrol pattern changes. Nothing here intends to stay static.","gold",6500);run.alert=Math.min(100,run.alert+8)}host.revision++;
}
function processAchievements(){if(!run)return;PGR.checkAchievements(run,p1);const a=run.achievementQueue.shift();if(a)showToast("ACHIEVEMENT UNLOCKED",a.title,"gold",7600)}

function updateAlert(dt){run.elapsed+=dt;host.floorElapsed+=dt;run.alert=Math.max(0,run.alert-dt*.0018);if(localPlayers().some(p=>p.torchMs>0))run.alert=Math.min(100,run.alert+dt*.0025);host.alertLevel=run.alert;host.objectiveReminderAt=host.objectiveReminderAt||300000;if(host.floorElapsed>=host.objectiveReminderAt){host.objectiveReminderAt+=300000;const explore=Math.round(PGR.roomCompletion(explored.get(p1.id)||new Set(),world)*100);showToast("OBJECTIVE REMINDER",SYS.objectiveText(host,run,explore),"cyan",11000)}if(run.alert>75&&Math.random()<dt/65000)lastAmbientMessage=""}
function burst(tx,ty,col,n=10,power=1){for(let i=0;i<n;i++)particles.push({x:tx*C.tile+C.tile/2,y:ty*C.tile+C.tile/2,vx:(Math.random()-.5)*3.2*power,vy:(Math.random()-.5)*3.2*power,life:300+Math.random()*360,col,size:1.5+Math.random()*3*power,drag:.97})}
function ring(tx,ty,col,max=30){rings.push({x:tx*C.tile+C.tile/2,y:ty*C.tile+C.tile/2,r:3,max,life:340,col})}
function floatText(tx,ty,text,col=P.white,opts={}){const life=opts.life||720;floaters.push({x:tx*C.tile+C.tile/2,y:ty*C.tile-3,text,life,maxLife:life,col,ownerId:opts.ownerId||null,pickup:Boolean(opts.pickup),startScale:opts.startScale||1,endScale:opts.endScale||1.15})}
function floatPickupText(p,text,col=P.gold){if(!p||!text)return;floatText(p.x,p.y,String(text).toUpperCase(),col,{ownerId:p.id,pickup:true,life:1250,startScale:.42,endScale:1.28})}
function muzzle(tx,ty,d){for(let i=0;i<5;i++)particles.push({x:tx*C.tile+C.tile/2+d.x*12,y:ty*C.tile+C.tile/2+d.y*12,vx:d.x*(2+Math.random()*2)+(Math.random()-.5),vy:d.y*(2+Math.random()*2)+(Math.random()-.5),life:160,col:P.gold,size:2+Math.random()*2,drag:.94})}
function trailBetween(x1,y1,x2,y2,col){for(let i=0;i<8;i++){const t=i/7;particles.push({x:(x1+(x2-x1)*t)*C.tile+C.tile/2,y:(y1+(y2-y1)*t)*C.tile+C.tile/2,vx:0,vy:0,life:220+i*12,col,size:3,drag:.97})}}
function updateEffects(dt){for(const q of particles){q.x+=q.vx;q.y+=q.vy;q.vx*=q.drag;q.vy*=q.drag;q.life-=dt}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);for(const r of rings){r.life-=dt;r.r+=(r.max-r.r)*.12}for(let i=rings.length-1;i>=0;i--)if(rings[i].life<=0)rings.splice(i,1);for(const f of floaters){f.life-=dt;if(!f.ownerId)f.y-=dt*.018}for(let i=floaters.length-1;i>=0;i--)if(floaters[i].life<=0)floaters.splice(i,1)}
function updateEmergencyAmmo(p,dt){
  if(p.mana>0){p.emergencyRechargeMs=0;return}
  if(!(p.emergencyRechargeMs>0))p.emergencyRechargeMs=C.player.emergencyRechargeMs;
  p.emergencyRechargeMs-=dt;
  if(p.emergencyRechargeMs<=0){
    p.mana=Math.min(p.maxMana,C.player.emergencyAmmo);p.emergencyRechargeMs=0;S.sfx("pickup");
    showToast("EMERGENCY CAPACITOR READY",`${C.player.emergencyAmmo} reserve shots restored. It is enough to keep fighting, not enough to ignore ammunition.`,"cyan",8000);
  }
}
function update(dt){
  if(mode!=="playing")return;enemyCD-=dt;projectileCD-=dt;sendCD-=dt;worldCD-=dt;surroundCD-=dt;specialCD-=dt;move1-=dt;move2-=dt;fire1-=dt;fire2-=dt;lowHealthCD-=dt;updateToast(dt);updateDoors();updateGamepad();
  for(const p of localPlayers()){
    if(p.invuln>0)p.invuln-=dt;if(p.hitStunMs>0)p.hitStunMs=Math.max(0,p.hitStunMs-dt);if(p.hpBarMs>0)p.hpBarMs=Math.max(0,p.hpBarMs-dt);if(p.torchMs>0)p.torchMs=Math.max(0,p.torchMs-dt);if(p.rapidMs>0)p.rapidMs=Math.max(0,p.rapidMs-dt);if(p.ammoFlashMs>0)p.ammoFlashMs=Math.max(0,p.ammoFlashMs-dt);
    updateEmergencyAmmo(p,dt);p.rx+=(p.x-p.rx)*.32;p.ry+=(p.y-p.ry)*.32;updateCamping(p,dt);reveal(p);markRoomVisit(p);rememberTrail(p)
  }
  for(const p of remote.values()){if(p.hpBarMs>0)p.hpBarMs=Math.max(0,p.hpBarMs-dt);p.rx+=(p.x-p.rx)*.28;p.ry+=(p.y-p.ry)*.28}
  for(const e of host.enemies||[])if(e.hpBarMs>0)e.hpBarMs=Math.max(0,e.hpBarMs-dt);for(const g of host.generators||[])if(g.hpBarMs>0)g.hpBarMs=Math.max(0,g.hpBarMs-dt)
  if(input.has("Space")&&fire1<=0)firePlayer(p1,d1());if(p2&&input.has("Enter")&&fire2<=0)firePlayer(p2,d2());if(move1<=0){const d=d1();if(d){movePlayer(p1,d.x,d.y);move1=C.player.moveDelay*(p1.moveMultiplier||1)}}if(p2&&move2<=0){const d=d2();if(d){movePlayer(p2,d.x,d.y);move2=C.player.moveDelay*(p2.moveMultiplier||1)}}
  if(projectileCD<=0){stepProjectiles();projectileCD=70}if(enemyCD<=0){hostEnemyStep(C.enemy.thinkDelay);enemyCD=C.enemy.thinkDelay}if(sendCD<=0){sendPlayer();sendCD=100}if(worldCD<=0&&net.isHost){broadcastWorld();worldCD=350}
  updateHazards(dt);updateEffects(dt);updateGenerators(dt);updateArena();updateTimed(dt);updateBoulder(dt);updateMemoryPuzzle(dt);updateRescue();updateBanishment(dt);updateStalker(dt);updateFloorObjective();updateAlert(dt);updateRoomEvents(dt);processAchievements();
  if(surroundCD<=0){surroundingsTick();surroundCD=20000}inventoryReminderMs-=dt;if(inventoryReminderMs<=0){inventoryReminderMs=300000;showToast("DON'T FORGET TO HIT TAB TO CHECK YOUR INVENTORY","TAB ALSO EXPLAINS ARTEFACTS, THE BANISHMENT FLASK AND YOUR CURRENT OBJECTIVE.","cyan",8000)}
  const seen=host.enemies.filter(e=>e.alive&&e.aiState==="chase"&&localPlayers().some(p=>visibleTo(p,e.x,e.y))).length;S.setDanger(Math.min(1,(seen+run.alert/45)/4));updateNamedEncounters();
  const critical=localPlayers().find(p=>p.health<=2);if(critical&&lowHealthCD<=0){S.sfx("lowhealth");const hasPotion=PGR.firstInventory(critical,"potion")>=0;showToast("LOW HEALTH",hasPotion?"PRESS E TO USE POTION":"NO HEALING POTION AVAILABLE — FIND HEALTH OR BREAK CONTACT.","red",7000);lowHealthCD=8000}sync()
}
