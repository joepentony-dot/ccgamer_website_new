/* C64 Dungeon Carnage V10.42 R115 — fifteen-floor authored trial director.
 *
 * Fills the quieter campaign depths with deterministic, floor-specific tasks
 * while reusing the canonical switch, arena, timed-room, enemy and inventory
 * owners. No trial may replace the main floor objective or create a softlock.
 */
(()=>{
  "use strict";
  if(window.__CCG_DUNGEON_R115_FLOOR_TRIALS__)return;
  window.__CCG_DUNGEON_R115_FLOOR_TRIALS__=true;

  const SYS=window.CCGSystems,PGR=window.CCGProgression,W=window.CCGWorld,C=window.CCG_CONFIG;
  if(!SYS||!PGR||!W||!C||typeof SYS.decorate!=="function")return;

  const PLAN=Object.freeze({
    1:Object.freeze({id:"threshold",label:"THRESHOLD TRIAL",summary:"Learn the dungeon, map the Threshold and defeat its guardian.",existing:true}),
    2:Object.freeze({id:"driveworks",label:"DRIVEWORKS TRIAL",summary:"Destroy the monster generators and read the first blood-clue route.",existing:true}),
    3:Object.freeze({id:"iron-memory",label:"IRON MEMORY",summary:"Recover the Key of Iron and survive the five-pad Memory Vault.",existing:true}),
    4:Object.freeze({id:"budget-sequence",label:"BUDGET TRIAL",summary:"Escort the scout, solve the torch sequence and survive the boulder corridor.",existing:true}),
    5:Object.freeze({id:"cartridge-trick",label:"CARTRIDGE TRICK",summary:"Cross the rotten bridge, recover the stolen stash and defeat the Cartridge Maw.",existing:true}),
    6:Object.freeze({id:"tape-relays",label:"TAPE RELAYS",summary:"Activate four archive tape relays scattered across the labyrinth.",target:4}),
    7:Object.freeze({id:"crypt-braziers",label:"CRYPT BRAZIERS",summary:"Carry a live torch through the crypt and ignite ten cold braziers.",target:10}),
    8:Object.freeze({id:"arena-lockdown",label:"UNDERCROFT ARENA",summary:"Enter the arena and clear both lockdown waves.",target:1}),
    9:Object.freeze({id:"timed-lockdown",label:"MODEM LOCKDOWN",summary:"Enter the timed chamber and survive its full countdown.",target:1}),
    10:Object.freeze({id:"sid-abomination",label:"SID ABOMINATION",summary:"Defeat the SID Abomination and survive its changing arena phases.",existing:true}),
    11:Object.freeze({id:"coolant-valves",label:"EMBER COOLANT",summary:"Shoot three coolant valves inside the late-floor hazard network.",target:3}),
    12:Object.freeze({id:"seven-pad-vault",label:"SEVEN-PAD VAULT",summary:"Complete the seven-pad Memory Vault before leaving the Foundry.",existing:true}),
    13:Object.freeze({id:"high-score-hunt",label:"HIGH-SCORE HUNT",summary:"Find and destroy three marked High-Score Wardens.",target:3}),
    14:Object.freeze({id:"crt-sequence",label:"CRT CALIBRATION",summary:"Shoot four numbered CRT relays in the displayed calibration order.",target:4}),
    15:Object.freeze({id:"blood-citadel",label:"BLOOD CITADEL",summary:"Bring all three Campaign Keys, defeat the Blood Archivist and complete the final Sigil escape.",existing:true})
  });

  const state={installed:false,hosts:0,activations:0,completions:0,failures:0};
  const floorOf=runState=>Math.max(1,Math.min(15,Math.floor(Number(runState?.floor)||1)));
  const cellKey=(x,y)=>`${x},${y}`;
  const roomAt=(worldState,x,y)=>{try{return W.roomAt(worldState,x,y)}catch(_){return-1}};
  const occupied=(hostState,x,y)=>{
    const groups=[hostState.items,hostState.enemies,hostState.chests,hostState.switches,hostState.shrines,hostState.generators];
    if(groups.some(rows=>(rows||[]).some(row=>row?.active!==false&&Number(row.x)===x&&Number(row.y)===y)))return true;
    if((hostState.doors||[]).some(row=>Number(row.x)===x&&Number(row.y)===y))return true;
    return false
  };
  function roomCells(worldState,hostState,room){
    const out=[];if(!room)return out;
    for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++){
      if(worldState.map?.[y]?.[x]!==0||occupied(hostState,x,y))continue;
      out.push({x,y,roomId:room.id})
    }
    return out
  }
  function busyRooms(worldState,hostState){
    const busy=new Set([worldState.startRoomId,worldState.exitRoomId,hostState.sigilRoomId,hostState.trader?.roomId,hostState.startShop?.roomId].filter(v=>v!=null));
    for(const row of hostState.generators||[])if(row.roomId!=null)busy.add(row.roomId);
    for(const row of hostState.arenas||[])if(row.roomId!=null)busy.add(row.roomId);
    for(const row of hostState.timedRooms||[])if(row.roomId!=null)busy.add(row.roomId);
    for(const row of hostState.hazardRooms||[])if(row.roomId!=null)busy.add(row.roomId);
    for(const row of [hostState.rescue,hostState.memoryPuzzle,hostState.sequenceTorchPuzzle,hostState.weightBridge,hostState.boulderTrap,hostState.skeletonHorde,hostState.spiderNest])if(row?.roomId!=null)busy.add(row.roomId);
    return busy
  }
  function safeRooms(worldState,hostState){
    const busy=busyRooms(worldState,hostState);
    const primary=(worldState.rooms||[]).filter(room=>room&&room.id!==worldState.startRoomId&&room.id!==worldState.exitRoomId&&!room.optional&&!room.sanctuary&&!room.sigilRoom&&!busy.has(room.id)&&room.w>=5&&room.h>=5);
    const fallback=(worldState.rooms||[]).filter(room=>room&&room.id!==worldState.startRoomId&&room.id!==worldState.exitRoomId&&!room.sanctuary&&!room.sigilRoom&&!primary.some(x=>x.id===room.id)&&room.w>=4&&room.h>=4);
    return[...primary,...fallback].sort((a,b)=>(b.depth||0)-(a.depth||0)||a.id-b.id)
  }
  function takeCell(worldState,hostState,room,used){
    const cells=roomCells(worldState,hostState,room).filter(q=>!used.has(cellKey(q.x,q.y)));
    if(!cells.length)return null;
    const q=cells[Math.floor(cells.length/2)];used.add(cellKey(q.x,q.y));return q
  }
  function makeTrial(runState,kind,target,extra={}){
    const spec=PLAN[floorOf(runState)]||{};
    return{id:`r115-${kind}-f${floorOf(runState)}`,kind,floor:floorOf(runState),label:spec.label||"FLOOR TRIAL",summary:spec.summary||"",target:Math.max(1,Number(target)||1),progress:0,complete:false,rewarded:false,introduced:false,roomNotices:{},nodes:[],...extra}
  }
  function addTrialSwitch(hostState,trial,q,index,{shotOnly=false,label=""}={}){
    const sw={id:`${trial.id}-switch-${index}`,x:q.x,y:q.y,roomId:q.roomId,active:true,toggled:false,wallMounted:true,remote:false,shotOnly:Boolean(shotOnly),r115Trial:true,r115TrialKind:trial.kind,r115TrialIndex:index,r115Label:label||`${trial.label} ${index+1}`};
    hostState.switches=hostState.switches||[];hostState.switches.push(sw);trial.nodes.push({id:sw.id,x:q.x,y:q.y,roomId:q.roomId,index,type:"switch"});return sw
  }
  function addSupplies(worldState,hostState,runState,kind,count,prefix){
    const rooms=[worldState.rooms?.[worldState.startRoomId],...safeRooms(worldState,hostState)].filter(Boolean),used=new Set();
    for(let i=0;i<count&&rooms.length;i++){
      const room=rooms[i%rooms.length],q=takeCell(worldState,hostState,room,used);if(!q)continue;
      hostState.items.push({id:`r115-${prefix}-${floorOf(runState)}-${i}`,x:q.x,y:q.y,kind,active:true,title:kind==="torch"?"CRYPT TRIAL TORCH":"TRIAL AMMO CACHE",r115TrialSupply:true})
    }
  }
  function installTapeRelays(worldState,hostState,runState){
    const trial=makeTrial(runState,"tape-relays",4),rooms=safeRooms(worldState,hostState),used=new Set();
    for(let i=0;i<trial.target&&i<rooms.length;i++){const q=takeCell(worldState,hostState,rooms[i],used);if(q)addTrialSwitch(hostState,trial,q,i,{label:`TAPE RELAY ${i+1}`})}
    if(trial.nodes.length<trial.target)return null;trial.roomIds=trial.nodes.map(n=>n.roomId);return trial
  }
  function installCryptBraziers(worldState,hostState,runState){
    const trial=makeTrial(runState,"crypt-braziers",10),rooms=safeRooms(worldState,hostState),used=new Set();
    if(!rooms.length)return null;
    let cursor=0,guard=0;
    while(trial.nodes.length<trial.target&&guard++<80){
      const room=rooms[cursor++%rooms.length],q=takeCell(worldState,hostState,room,used);if(!q)continue;
      trial.nodes.push({id:`${trial.id}-brazier-${trial.nodes.length}`,x:q.x,y:q.y,roomId:q.roomId,index:trial.nodes.length,type:"brazier",lit:false})
    }
    if(trial.nodes.length<trial.target)return null;
    addSupplies(worldState,hostState,runState,"torch",4,"crypt-torch");
    trial.roomIds=[...new Set(trial.nodes.map(n=>n.roomId))];return trial
  }
  function installArenaTrial(hostState,runState){
    const arena=(hostState.arenas||[])[0];if(!arena)return null;
    arena.r115Required=true;return makeTrial(runState,"arena-lockdown",1,{sourceId:arena.id,roomIds:[arena.roomId]})
  }
  function installTimedTrial(hostState,runState){
    const timed=(hostState.timedRooms||[])[0];if(!timed)return null;
    timed.r115Required=true;return makeTrial(runState,"timed-lockdown",1,{sourceId:timed.id,roomIds:[timed.roomId]})
  }
  function installCoolantValves(worldState,hostState,runState){
    const trial=makeTrial(runState,"coolant-valves",3),hazardRooms=(hostState.hazardRooms||[]).map(h=>worldState.rooms?.[h.roomId]).filter(Boolean),fallback=safeRooms(worldState,hostState),rooms=[...hazardRooms,...fallback.filter(r=>!hazardRooms.some(h=>h.id===r.id))],used=new Set();
    for(let i=0;i<trial.target&&i<rooms.length;i++){const q=takeCell(worldState,hostState,rooms[i],used);if(q)addTrialSwitch(hostState,trial,q,i,{shotOnly:true,label:`COOLANT VALVE ${i+1}`})}
    if(trial.nodes.length<trial.target)return null;
    addSupplies(worldState,hostState,runState,"ammo",2,"coolant-ammo");trial.roomIds=trial.nodes.map(n=>n.roomId);return trial
  }
  function installHighScoreHunt(hostState,runState){
    const trial=makeTrial(runState,"high-score-hunt",3),pool=(hostState.enemies||[]).filter(e=>e?.alive&&e.champion&&!e.guardian&&!e.follower&&!e.deathStalker&&!e.bridgeThief).slice(0,3);
    if(pool.length<trial.target)return null;
    const titles=["HIGH-SCORE WARDEN ALPHA","HIGH-SCORE WARDEN BETA","HIGH-SCORE WARDEN GAMMA"];
    pool.forEach((e,i)=>{e.r115TrialTarget=true;e.r115TrialIndex=i;e.championName=titles[i];e.maxHp=Math.ceil(Math.max(1,Number(e.maxHp||e.hp||1))*1.35);e.hp=e.maxHp;e.maxArmor=Math.max(Number(e.maxArmor||e.armor||0),6+i);e.armor=e.maxArmor});
    trial.enemyIds=pool.map(e=>e.id);trial.roomIds=pool.map(e=>roomAt(window.__CCG_WORLD||{},e.x,e.y)).filter(id=>id>=0);return trial
  }
  function seededOrder(runState,count){
    let hash=2166136261;const text=`${runState?.seed||"CCG"}|F${floorOf(runState)}|R115-CRT`;
    for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}
    const rows=Array.from({length:count},(_,i)=>i);
    for(let i=rows.length-1;i>0;i--){hash^=hash<<13;hash^=hash>>>17;hash^=hash<<5;const j=Math.abs(hash)%(i+1);[rows[i],rows[j]]=[rows[j],rows[i]]}
    return rows
  }
  function installCrtSequence(worldState,hostState,runState){
    const trial=makeTrial(runState,"crt-sequence",4),rooms=safeRooms(worldState,hostState),used=new Set();
    for(let i=0;i<trial.target&&i<rooms.length;i++){const q=takeCell(worldState,hostState,rooms[i],used);if(q)addTrialSwitch(hostState,trial,q,i,{shotOnly:true,label:`CRT RELAY ${i+1}`})}
    if(trial.nodes.length<trial.target)return null;
    trial.sequence=seededOrder(runState,trial.target);trial.orderText=trial.sequence.map(i=>String(i+1)).join(" → ");trial.inputIndex=0;trial.failures=0;trial.roomIds=trial.nodes.map(n=>n.roomId);
    addSupplies(worldState,hostState,runState,"ammo",2,"crt-ammo");return trial
  }
  function installTrial(worldState,hostState,runState){
    let trial=null;
    switch(floorOf(runState)){
      case 6:trial=installTapeRelays(worldState,hostState,runState);break;
      case 7:trial=installCryptBraziers(worldState,hostState,runState);break;
      case 8:trial=installArenaTrial(hostState,runState);break;
      case 9:trial=installTimedTrial(hostState,runState);break;
      case 11:trial=installCoolantValves(worldState,hostState,runState);break;
      case 13:trial=installHighScoreHunt(hostState,runState);break;
      case 14:trial=installCrtSequence(worldState,hostState,runState);break;
      default:trial=null
    }
    hostState.floorTrial=trial;hostState.r115FloorPlan=PLAN[floorOf(runState)]||null;if(trial)state.hosts++;return trial
  }

  function trialProgress(hostState){
    const t=hostState?.floorTrial;if(!t)return{progress:1,target:1,complete:true};
    if(t.kind==="arena-lockdown"){const a=(hostState.arenas||[]).find(row=>row.id===t.sourceId);t.progress=a?.cleared?1:0}
    else if(t.kind==="timed-lockdown"){const row=(hostState.timedRooms||[]).find(x=>x.id===t.sourceId);t.progress=row?.cleared?1:0}
    else if(t.kind==="high-score-hunt"){const ids=new Set(t.enemyIds||[]);t.progress=(hostState.enemies||[]).filter(e=>ids.has(e.id)&&e.alive===false).length}
    else if(t.kind==="crypt-braziers")t.progress=(t.nodes||[]).filter(n=>n.lit).length;
    t.progress=Math.max(0,Math.min(t.target,Number(t.progress)||0));t.complete=t.progress>=t.target;return{progress:t.progress,target:t.target,complete:t.complete}
  }
  function trialText(hostState){
    const t=hostState?.floorTrial;if(!t)return"";
    const p=trialProgress(hostState);
    if(t.kind==="tape-relays")return`Activate archive Tape Relays: ${p.progress}/${p.target}`;
    if(t.kind==="crypt-braziers")return`Ignite Crypt Braziers with an active torch: ${p.progress}/${p.target}`;
    if(t.kind==="arena-lockdown")return p.complete?"Undercroft Arena cleared":"Enter and clear both Undercroft Arena waves";
    if(t.kind==="timed-lockdown")return p.complete?"Modem Lockdown survived":"Enter the timed chamber and survive the full countdown";
    if(t.kind==="coolant-valves")return`Shoot Ember Coolant Valves: ${p.progress}/${p.target}`;
    if(t.kind==="high-score-hunt")return`Defeat marked High-Score Wardens: ${p.progress}/${p.target}`;
    if(t.kind==="crt-sequence")return`CRT calibration ${p.progress}/${p.target} — order ${t.orderText}`;
    return t.summary||t.label
  }
  function rewardCell(t){
    const p=(typeof p1!=="undefined"&&p1)?p1:null,last=t.lastPos||p;if(!last)return null;
    const candidates=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]].map(([dx,dy])=>({x:last.x+dx,y:last.y+dy}));
    return candidates.find(q=>{try{return W.walkable(world.map,q.x,q.y,host)&&!occupied(host,q.x,q.y)}catch(_){return false}})||{x:last.x,y:last.y}
  }
  function finishTrial(hostState,trial){
    if(!trial||trial.rewarded||!trialProgress(hostState).complete)return false;
    trial.rewarded=true;state.completions++;
    try{
      const q=rewardCell(trial);
      if(q){const roomId=W.roomAt(world,q.x,q.y),room=world.rooms?.[roomId];hostState.chests.push({id:`r115-trial-cache-f${trial.floor}-${Date.now()}`,x:q.x,y:q.y,locked:false,active:true,depth:(room?.depth||0)+14,roomId,r115TrialReward:true})}
      score+=1000;
      S.sfx("open");
      showToast(`${trial.label} COMPLETE`,`Floor trial complete. +1,000 score and a high-tier Trial Cache have been awarded.`,"gold",9500);
      hostState.revision++;updateQuests?.()
    }catch(_){}
    return true
  }
  function refreshTrial(hostState=typeof host!=="undefined"?host:null){
    if(!hostState?.floorTrial)return true;const status=trialProgress(hostState);if(status.complete)finishTrial(hostState,hostState.floorTrial);return status.complete
  }
  function introduceTrial(trial){
    if(!trial||trial.introduced)return;trial.introduced=true;
    try{
      const suffix=trial.kind==="crt-sequence"?` Calibration order: ${trial.orderText}.`:trial.kind==="crypt-braziers"?" Four trial torches are guaranteed on this floor so the objective cannot run dry.":"";
      showToast(`FLOOR TRIAL — ${trial.label}`,`${trial.summary}${suffix}`,"cyan",11000)
    }catch(_){}
  }
  function noticeForRoom(player){
    const t=host?.floorTrial;if(!t||t.complete)return;const roomId=W.roomAt(world,player.x,player.y);if(!(t.roomIds||[]).includes(roomId)||t.roomNotices?.[roomId])return;
    t.roomNotices=t.roomNotices||{};t.roomNotices[roomId]=true;
    try{
      const text=t.kind==="crypt-braziers"?"A cold brazier is nearby. Activate a carried torch with Q, then step onto the brazier while the flame is burning.":t.kind==="coolant-valves"?"A coolant valve is mounted in this danger room. Shoot the numbered valve; touching it does nothing.":t.kind==="crt-sequence"?`A numbered CRT relay is nearby. Shoot relays only in the calibration order ${t.orderText}; a wrong relay resets the sequence.`:t.kind==="tape-relays"?"A Tape Relay is in this room. Step onto its switch to bring the archive circuit online.":t.summary;
      showToast(t.label,text,"cyan",8500)
    }catch(_){}
  }

  const baseDecorate=SYS.decorate.bind(SYS);
  SYS.decorate=function r115Decorate(worldState,hostState,runState){
    const result=baseDecorate(worldState,hostState,runState),resolved=result||hostState;installTrial(worldState,resolved,runState);return resolved
  };
  const baseUpdateObjective=SYS.updateObjective.bind(SYS);
  SYS.updateObjective=function r115UpdateObjective(hostState,runState,explorePct=0){
    const result=baseUpdateObjective(hostState,runState,explorePct),trial=hostState?.floorTrial;
    if(!trial)return result;
    const done=refreshTrial(hostState);
    if(!done){if(hostState.objective)hostState.objective.complete=false;hostState.exitOpen=false;return false}
    return result
  };
  const baseObjectiveText=SYS.objectiveText.bind(SYS);
  SYS.objectiveText=function r115ObjectiveText(hostState,runState,explorePct=0){
    const base=baseObjectiveText(hostState,runState,explorePct),trial=hostState?.floorTrial;if(!trial)return base;
    const status=trialProgress(hostState);return status.complete?`${base} • ${trial.label} COMPLETE`:`${base} • FLOOR TRIAL: ${trialText(hostState)}`
  };

  if(typeof activateSwitch==="function"){
    const baseActivateSwitch=activateSwitch;
    activateSwitch=function r115ActivateSwitch(sw,player,shot=false){
      const trial=host?.floorTrial;
      if(!sw?.r115Trial||!trial||sw.r115TrialKind!==trial.kind)return baseActivateSwitch(sw,player,shot);
      introduceTrial(trial);
      if(sw.shotOnly&&!shot){try{showToast(`${trial.label} — SHOOT IT`,"This trial mechanism only responds to weapon fire.","cyan",5000)}catch(_){}return false}
      if(trial.kind==="crt-sequence"){
        const expected=trial.sequence?.[trial.inputIndex]??0;
        if(sw.r115TrialIndex!==expected){
          trial.failures=(trial.failures||0)+1;trial.inputIndex=0;trial.progress=0;state.failures++;
          for(const row of host.switches||[])if(row.r115Trial&&row.r115TrialKind==="crt-sequence"){row.active=true;row.toggled=false}
          try{
            const existing=(host.enemies||[]).some(e=>e.alive&&String(e.id||"").startsWith("crt-sequence-fail-"));
            if(!existing&&typeof spawnPuzzleAmbush==="function")spawnPuzzleAmbush(sw.roomId,player,1,"crt-sequence-fail");
            S.sfx("alert");showToast("CRT CALIBRATION RESET",`Wrong relay. The required order is ${trial.orderText}. The sequence has reset to 0/${trial.target}; only one punishment guard can be active at a time.`,"red",9000)
          }catch(_){}
          return false
        }
      }
      const result=baseActivateSwitch(sw,player,shot);if(result===false)return result;
      if(trial.kind==="crt-sequence"){trial.inputIndex++;trial.progress=trial.inputIndex}
      else trial.progress=Math.min(trial.target,(trial.progress||0)+1);
      trial.lastPos={x:sw.x,y:sw.y};state.activations++;refreshTrial(host);try{updateQuests?.()}catch(_){};return result
    }
  }

  function lightBrazierAt(player){
    const trial=host?.floorTrial;if(!trial||trial.kind!=="crypt-braziers"||trial.complete)return false;
    const node=(trial.nodes||[]).find(n=>!n.lit&&n.x===player.x&&n.y===player.y);if(!node)return false;
    introduceTrial(trial);
    if(Number(player.torchMs||0)<=0){try{showToast("COLD CRYPT BRAZIER","This brazier will not light by itself. Activate a carried torch with Q, then step onto it while your flame is burning.","cyan",7000)}catch(_){}return false}
    node.lit=true;trial.lastPos={x:node.x,y:node.y};trial.progress=(trial.nodes||[]).filter(n=>n.lit).length;state.activations++;
    try{S.sfx("torch");showToast("CRYPT BRAZIER LIT",`${trial.progress}/${trial.target} braziers are burning.`,"gold",4200)}catch(_){}
    refreshTrial(host);try{updateQuests?.()}catch(_){};return true
  }
  if(typeof movementTriggers==="function"){
    const baseMovementTriggers=movementTriggers;
    movementTriggers=function r115MovementTriggers(player,...args){const result=baseMovementTriggers(player,...args);const trial=host?.floorTrial;if(trial){introduceTrial(trial);noticeForRoom(player);lightBrazierAt(player);refreshTrial(host)}return result}
  }
  if(typeof updateArena==="function"){
    const baseUpdateArena=updateArena;updateArena=function r115UpdateArena(...args){const result=baseUpdateArena(...args);refreshTrial(host);return result}
  }
  if(typeof updateTimed==="function"){
    const baseUpdateTimed=updateTimed;updateTimed=function r115UpdateTimed(...args){const result=baseUpdateTimed(...args);refreshTrial(host);return result}
  }

  if(typeof drawShrinesSwitches==="function"){
    const baseDrawShrinesSwitches=drawShrinesSwitches;
    drawShrinesSwitches=function r115DrawShrinesSwitches(...args){
      const result=baseDrawShrinesSwitches(...args),trial=host?.floorTrial;if(!trial)return result;
      for(const sw of host.switches||[])if(sw.r115Trial&&visibleTo(focus,sw.x,sw.y)&&md(sw,focus)<=3){
        const s=ws(sw.x,sw.y),text=trial.kind==="crt-sequence"?`CRT RELAY ${sw.r115TrialIndex+1} — ${sw.toggled?"CALIBRATED":"SHOOT"}`:trial.kind==="coolant-valves"?`COOLANT VALVE ${sw.r115TrialIndex+1} — ${sw.toggled?"OPEN":"SHOOT"}`:`TAPE RELAY ${sw.r115TrialIndex+1} — ${sw.toggled?"ONLINE":"STEP ON"}`;
        label(text,{x:s.x,y:s.y-9},sw.toggled?P.green:P.cyan)
      }
      return result
    }
  }
  if(typeof drawSpecialObjects==="function"){
    const baseDrawSpecialObjects=drawSpecialObjects;
    drawSpecialObjects=function r115DrawSpecialObjects(...args){
      const result=baseDrawSpecialObjects(...args),trial=host?.floorTrial;if(!trial||trial.kind!=="crypt-braziers")return result;
      for(const node of trial.nodes||[])if(visibleTo(focus,node.x,node.y)){
        const s=ws(node.x,node.y),cx=s.x+C.tile/2,lit=node.lit;
        ctx.save();ctx.fillStyle="#5b4330";ctx.fillRect(cx-3,s.y+14,6,17);ctx.fillStyle="#2a2020";ctx.fillRect(cx-8,s.y+27,16,5);ctx.strokeStyle=lit?P.gold:"#77707b";ctx.strokeRect(cx-7,s.y+8,14,10);
        if(lit){ctx.shadowColor=P.orange;ctx.shadowBlur=14;ctx.fillStyle=P.orange;ctx.beginPath();ctx.moveTo(cx,s.y+17);ctx.quadraticCurveTo(cx-8,s.y+7,cx,s.y+1);ctx.quadraticCurveTo(cx+8,s.y+7,cx,s.y+17);ctx.fill()}ctx.restore();
        if(md(node,focus)<=2)label(lit?"CRYPT BRAZIER — LIT":"CRYPT BRAZIER — ACTIVE TORCH REQUIRED",s,lit?P.gold:P.cyan)
      }
      return result
    }
  }

  state.installed=true;
  window.CCGLostSizzlerV142R115FloorTrials=Object.freeze({version:"V10.42-r115",state,PLAN,installTrial,trialProgress,trialText,refreshTrial});
})();