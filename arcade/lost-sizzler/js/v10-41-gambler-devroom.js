/* The Lost Sizzler V10.41 — rare Gambler encounter and owner-only Developer Vault. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_GAMBLER_DEVROOM__)return;
  window.__CCG_LOST_SIZZLER_V141_GAMBLER_DEVROOM__=true;

  const SPAWN_CHANCE=.04;
  const STAKE=1000;
  const JACKPOT=2000;
  const DEV_SHORTCUT="KeyD";
  const DEV_PANEL_KEY="F2";
  const STANDARD_ENEMIES=["spider","skeleton","knight","scout","hunter","ambusher","guard","charger","ranger","root","cook","firebreather","ghost","guardian","treasure"];
  const ITEM_TYPES=[
    ["health","HEALTH"],["ammo","AMMO"],["potion","POTION"],["torch","TORCH"],["teleport","TELEPORT"],["armour","ARMOUR"],["weapon","WEAPON"],
    ["credits","SCORE COIN"],["xpOrb","XP ORB"],["artefact","BANISHMENT ARTEFACT"],["key","MAIN KEY"],["bronze","BRONZE KEY"],["exitSigil","EXIT SIGIL"],["game","C64 GAME"]
  ];
  const DECOR_TYPES=["bookcase","tapeStack","desk","cabinet","roundChair","driveBench","terminal","crate","cable","bin","barrel","display","console","speaker","lightBar","table","rack","bench","shield","pillar","counter","oven","reactor","pipe","coil","pool","arch","obelisk","readingDesk","slotRack","anvil","statue","pedestal","candleSconce","fireplace","chestPile"];
  const REEL=[
    {id:"jackpot",symbol:"£££",label:"2,000 SCORE",tone:"gold"},
    {id:"health",symbol:"2HP",label:"HEALTH CRASH",tone:"red"},
    {id:"bust",symbol:"X",label:"NO WIN",tone:"dim"},
    {id:"health",symbol:"2HP",label:"HEALTH CRASH",tone:"red"},
    {id:"bust",symbol:"X",label:"NO WIN",tone:"dim"},
    {id:"bust",symbol:"X",label:"NO WIN",tone:"dim"}
  ];

  const state={
    installed:false,startWrapped:false,updateWrapped:false,renderWrapped:false,controllerOwnedUpdate:false,controllerFrames:0,timer:0,floorKey:"",promptAt:0,panel:null,spinning:false,pausedMode:"playing",
    dev:{authorized:false,checking:false,active:false,roomId:null,panel:null,spawnSerial:0}
  };
  const cell=(x,y)=>`${Math.round(Number(x))},${Math.round(Number(y))}`;
  const md=(a,b)=>Math.abs(Number(a?.x||0)-Number(b?.x||0))+Math.abs(Number(a?.y||0)-Number(b?.y||0));

  function hash32(value){let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  const unit=value=>hash32(value)/4294967296;
  const floorKey=()=>`${String(run?.seed||"lost-sizzler")}|F${Math.max(1,Number(run?.floor||1))}`;
  const inRoom=(room,q)=>Boolean(room&&q&&Number(q.x)>=room.x&&Number(q.x)<=room.x+room.w&&Number(q.y)>=room.y&&Number(q.y)<=room.y+room.h);

  function ordinaryDungeon(){return Boolean(run&&!run.daily&&["solo","split"].includes(String(playMode||""))&&!state.dev.active)}

  function specialRoomIds(){
    const ids=new Set([world?.startRoomId,world?.exitRoomId,host?.sigilRoomId,host?.trader?.roomId,host?.startShop?.roomId].filter(id=>id!=null));
    for(const collection of [host?.arenas,host?.timedRooms,host?.hazardRooms])for(const row of collection||[])if(row?.roomId!=null)ids.add(row.roomId);
    for(const row of [host?.memoryPuzzle,host?.sequenceTorchPuzzle,host?.weightBridge,host?.spiderNest,host?.skeletonHorde])if(row?.roomId!=null)ids.add(row.roomId);
    return ids;
  }

  function occupied(x,y,ignoreGambler=false){
    if((host?.blockingDecor||[]).some(row=>row.x===x&&row.y===y))return true;
    if((host?.items||[]).some(row=>row.active!==false&&row.x===x&&row.y===y))return true;
    if((host?.enemies||[]).some(row=>row.alive!==false&&row.x===x&&row.y===y))return true;
    if((host?.chests||[]).some(row=>row.active!==false&&row.x===x&&row.y===y))return true;
    if((host?.generators||[]).some(row=>row.alive!==false&&row.x===x&&row.y===y))return true;
    if((host?.shrines||[]).some(row=>row.active!==false&&row.x===x&&row.y===y))return true;
    if((host?.shops||[]).some(row=>row.active!==false&&row.x===x&&row.y===y))return true;
    if((host?.doors||[]).some(row=>row.x===x&&row.y===y))return true;
    if(!ignoreGambler&&host?.gambler?.active!==false&&host.gambler.x===x&&host.gambler.y===y)return true;
    return false;
  }

  function safeCells(room){
    const out=[];if(!room||!world?.map)return out;
    for(let y=room.y+2;y<=room.y+room.h-2;y++)for(let x=room.x+2;x<=room.x+room.w-2;x++){
      if(world.map[y]?.[x]!==0||occupied(x,y))continue;
      if((host?.doors||[]).some(door=>Math.abs(door.x-x)+Math.abs(door.y-y)<=2))continue;
      out.push({x,y});
    }
    return out;
  }

  function chooseGamblerRoom(key){
    const blocked=specialRoomIds();
    const rooms=(world?.rooms||[]).filter(room=>room&&!room.optional&&!room.sanctuary&&!room.sigilRoom&&!room.dangerous&&!room.dedicatedHazard&&room.id!==world.startRoomId&&room.id!==world.exitRoomId&&!blocked.has(room.id));
    if(!rooms.length)return null;
    rooms.sort((a,b)=>hash32(`${key}|room|${a.id}`)-hash32(`${key}|room|${b.id}`));
    return rooms.find(room=>safeCells(room).length)||null;
  }

  function spawnGambler({forced=false,room=null}={}){
    if(!host||!world||host.gambler?.active)return host?.gambler||null;
    if(!forced){
      if(!ordinaryDungeon()||run?.gamblerEncountered)return null;
      const key=floorKey();
      if(unit(`${key}|gambler`)>=SPAWN_CHANCE)return null;
      room=chooseGamblerRoom(key);if(!room)return null;
    }else room=room||world.rooms?.[world.startRoomId]||world.rooms?.[0];
    const cells=safeCells(room);if(!cells.length)return null;
    cells.sort((a,b)=>hash32(`${floorKey()}|gambler-cell|${a.x},${a.y}`)-hash32(`${floorKey()}|gambler-cell|${b.x},${b.y}`));
    const q=cells[0],gambler={id:`gambler-${run?.floor||1}-${hash32(floorKey()).toString(36)}`,x:q.x,y:q.y,roomId:room.id,active:true,used:false,spinning:false,outcome:null,forced:Boolean(forced),title:"THE GAMBLER"};
    host.gambler=gambler;if(run)run.gamblerEncountered=true;host.revision=(host.revision||0)+1;
    try{broadcastWorld?.()}catch(_){}
    return gambler;
  }

  function ensureStyles(){
    if(document.getElementById("ccg-v141-gambler-style"))return;
    const style=document.createElement("style");style.id="ccg-v141-gambler-style";style.textContent=`
      #ccg-gambler-panel,#ccg-dev-vault-panel{position:absolute;inset:0;z-index:12120;display:grid;place-items:center;padding:18px;background:rgba(3,2,7,.82)}
      #ccg-gambler-panel.hidden,#ccg-dev-vault-panel.hidden{display:none!important}
      .ccg-gambler-card{width:min(650px,calc(100vw - 34px));padding:22px;border:2px solid #ffd85a;border-radius:14px;background:linear-gradient(155deg,#211329,#09070e 72%);box-shadow:0 22px 80px #000,0 0 38px rgba(255,216,90,.15);text-align:center}
      .ccg-gambler-card h2{margin:0;color:#ffd85a;letter-spacing:.08em}.ccg-gambler-card p{color:#d7cbdf;line-height:1.5}
      .ccg-gambler-reel{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px auto;width:min(470px,100%);padding:10px;border:4px solid #6f4a17;background:#050409;box-shadow:inset 0 0 24px #000}
      .ccg-gambler-window{display:grid;place-items:center;min-height:86px;border:2px solid #655879;background:#120d18;color:#fff;font:900 24px/1 "Courier New",monospace;text-shadow:0 0 10px currentColor;overflow:hidden}
      .ccg-gambler-window[data-tone="gold"]{color:#ffd85a}.ccg-gambler-window[data-tone="red"]{color:#ff6868}.ccg-gambler-window[data-tone="dim"]{color:#9a8ca6}
      .ccg-gambler-reel[data-spinning="true"] .ccg-gambler-window{animation:ccg-reel-jitter .09s steps(2,end) infinite}@keyframes ccg-reel-jitter{50%{transform:translateY(3px);filter:blur(1px)}}
      .ccg-gambler-odds{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:12px 0}.ccg-gambler-odds span{padding:7px;border:1px solid rgba(255,255,255,.14);font-size:10px}.ccg-gambler-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}.ccg-gambler-actions button{min-height:44px;padding:9px 15px}
      #ccg-dev-vault-panel{z-index:12140;background:rgba(2,2,5,.9)}.ccg-dev-card{width:min(980px,calc(100vw - 28px));max-height:min(780px,calc(100vh - 30px));overflow:auto;padding:18px;border:2px solid #6cecff;border-radius:13px;background:#080912;box-shadow:0 25px 90px #000;text-align:left}
      .ccg-dev-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.ccg-dev-head h2{margin:0;color:#6cecff}.ccg-dev-head p{margin:5px 0 0;color:#aaa0b4;font-size:11px}.ccg-dev-head button{min-width:110px}.ccg-dev-section{margin-top:14px;padding-top:12px;border-top:1px solid rgba(108,236,255,.2)}.ccg-dev-section h3{margin:0 0 8px;color:#ffd85a;font-size:12px}.ccg-dev-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:6px}.ccg-dev-grid button{min-height:36px;padding:6px;font-size:9px}.ccg-dev-status{position:absolute;right:12px;bottom:12px;z-index:95;padding:6px 9px;border:1px solid #6cecff;background:rgba(4,8,12,.9);color:#6cecff;font:800 9px/1.25 "Courier New",monospace;pointer-events:none}
      @media(max-width:650px){.ccg-gambler-window{min-height:68px;font-size:18px}.ccg-gambler-odds{grid-template-columns:1fr}.ccg-dev-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;document.head.appendChild(style);
  }

  function gameMount(){return document.fullscreenElement?.contains?.(document.querySelector(".game-area"))?document.fullscreenElement:(document.querySelector(".game-area")||document.querySelector(".ccg-game")||document.body)}

  function ensureGamblerPanel(){
    if(state.panel?.isConnected)return state.panel;ensureStyles();
    const panel=document.createElement("div");panel.id="ccg-gambler-panel";panel.className="hidden";panel.innerHTML=`<div class="ccg-gambler-card" role="dialog" aria-modal="true" aria-labelledby="ccg-gambler-title"><h2 id="ccg-gambler-title">THE GAMBLER</h2><p id="ccg-gambler-copy">One spin only. Stake 1,000 score. The reel can pay 2,000... or leave you considerably less healthy.</p><div class="ccg-gambler-reel" id="ccg-gambler-reel"><div class="ccg-gambler-window" data-reel="0">?</div><div class="ccg-gambler-window" data-reel="1">?</div><div class="ccg-gambler-window" data-reel="2">?</div></div><div class="ccg-gambler-odds"><span>1/6 · <b>2,000 SCORE</b></span><span>2/6 · <b>DROP TO 2 HP</b></span><span>3/6 · <b>STAKE LOST</b></span></div><div class="ccg-gambler-actions"><button type="button" id="ccg-gambler-spin" class="primary">SPIN · 1,000 SCORE</button><button type="button" id="ccg-gambler-close">LEAVE</button></div></div>`;
    panel.querySelector("#ccg-gambler-spin")?.addEventListener("click",spinGambler);panel.querySelector("#ccg-gambler-close")?.addEventListener("click",closeGamblerPanel);gameMount().appendChild(panel);state.panel=panel;return panel;
  }

  function setWindow(windowEl,outcome){windowEl.textContent=outcome.symbol;windowEl.dataset.tone=outcome.tone}
  function refreshGamblerPanel(){
    const panel=ensureGamblerPanel(),g=host?.gambler,spin=panel.querySelector("#ccg-gambler-spin"),copy=panel.querySelector("#ccg-gambler-copy");
    if(!g)return;
    if(g.used&&!state.spinning){spin.disabled=true;spin.textContent="REEL ALREADY PLAYED";copy.textContent=g.outcome?`This reel is finished for the run. Result: ${g.outcome}.`:"This reel has already been used."}
    else{spin.disabled=state.spinning||Number(score||0)<STAKE;spin.textContent=Number(score||0)<STAKE?"NEED 1,000 SCORE":"SPIN · 1,000 SCORE";copy.textContent=`Current score: ${Math.max(0,Number(score||0)).toLocaleString()}. One spin only.`}
  }

  function nearbyGamblerPlayer(){
    const g=host?.gambler;if(!g?.active)return null;
    const players=typeof localPlayers==="function"?localPlayers():[p1,p2].filter(Boolean);return players.find(player=>player&&md(player,g)<=1)||null;
  }

  function openGamblerPanel(player=nearbyGamblerPlayer()){
    const g=host?.gambler;if(!g?.active||!player)return false;
    state.gamblingPlayer=player;const panel=ensureGamblerPanel();if(panel.parentElement!==gameMount())gameMount().appendChild(panel);refreshGamblerPanel();panel.classList.remove("hidden");
    if(mode==="playing"){state.pausedMode=mode;mode="paused"}try{input.clear()}catch(_){}return true;
  }

  function closeGamblerPanel(){
    if(state.spinning)return;state.panel?.classList.add("hidden");if(mode==="paused"&&document.body?.dataset?.runActive==="true")mode=state.pausedMode||"playing";try{input.clear()}catch(_){}
  }

  function randomReelIndex(){
    try{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%REEL.length}catch(_){return Math.floor(Math.random()*REEL.length)}
  }

  function resolveOutcome(outcome){
    const g=host?.gambler,player=state.gamblingPlayer||p1;if(!g||!player)return;
    g.spinning=false;g.outcome=outcome.id==="jackpot"?"2,000 SCORE":outcome.id==="health"?"HEALTH TO 2 HP":"NO WIN";
    if(outcome.id==="jackpot"){
      score=Math.max(0,Number(score||0))+JACKPOT;try{S.sfx?.("pickup");showToast("GAMBLER JACKPOT",`2,000 score paid. Net result after the stake: +${(JACKPOT-STAKE).toLocaleString()} score.`,"gold",7000)}catch(_){}
    }else if(outcome.id==="health"){
      player.health=Math.min(Math.max(0,Number(player.health||0)),2);try{S.sfx?.("hurt");showToast("THE REEL BITES BACK",`Your health has been reduced to ${Math.max(0,Number(player.health||0))} HP.`,"red",7000)}catch(_){}
    }else try{S.sfx?.("locked");showToast("GAMBLER — BUST","Nothing. The 1,000 score stake is gone.","red",6200)}catch(_){}
    host.revision=(host.revision||0)+1;try{broadcastWorld?.();sync?.()}catch(_){}refreshGamblerPanel();
  }

  function spinGambler(){
    const g=host?.gambler;if(state.spinning||!g?.active||g.used)return;
    const player=state.gamblingPlayer||nearbyGamblerPlayer();if(!player)return;
    if(Number(score||0)<STAKE){refreshGamblerPanel();return}
    score=Math.max(0,Number(score||0)-STAKE);g.used=true;g.spinning=true;state.spinning=true;refreshGamblerPanel();
    const reel=state.panel.querySelector("#ccg-gambler-reel"),windows=[...state.panel.querySelectorAll("[data-reel]")];reel.dataset.spinning="true";let tick=0,delay=55;
    const finalIndex=randomReelIndex(),final=REEL[finalIndex];
    const cycle=()=>{
      tick++;windows.forEach((el,index)=>setWindow(el,REEL[(tick+index*2)%REEL.length]));
      if(tick>=30){
        windows.forEach((el,index)=>setWindow(el,index===1?final:REEL[(finalIndex+index+2)%REEL.length]));reel.dataset.spinning="false";state.spinning=false;resolveOutcome(final);return;
      }
      if(tick>18)delay+=15;setTimeout(cycle,delay);
    };cycle();
  }

  function drawGambler(){
    const g=host?.gambler;if(!g?.active||typeof ws!=="function")return;const s=ws(g.x,g.y),cx=s.x+C.tile/2,cy=s.y+C.tile/2,bob=Math.round(Math.sin(performance.now()/360)*1.2);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.shadowColor=g.used?"#665879":"#ffd85a";ctx.shadowBlur=g.used?3:10;
    ctx.fillStyle="#151019";ctx.fillRect(cx-11,cy-3+bob,22,20);ctx.fillStyle="#6b245f";ctx.fillRect(cx-9,cy-8+bob,18,15);ctx.fillStyle="#d69a7d";ctx.fillRect(cx-7,cy-20+bob,14,12);ctx.fillStyle="#26151f";ctx.fillRect(cx-5,cy-16+bob,2,2);ctx.fillRect(cx+3,cy-16+bob,2,2);
    ctx.fillStyle="#241120";ctx.fillRect(cx-10,cy-28+bob,20,7);ctx.fillStyle="#ffd85a";ctx.fillRect(cx-8,cy-22+bob,16,3);ctx.fillStyle="#db3f93";ctx.fillRect(cx-13,cy+1+bob,5,13);ctx.fillRect(cx+8,cy+1+bob,5,13);ctx.fillStyle="#111018";ctx.fillRect(cx-9,cy+17+bob,6,8);ctx.fillRect(cx+3,cy+17+bob,6,8);
    // Small one-use reel cabinet beside the Gambler.
    ctx.shadowBlur=5;ctx.fillStyle="#5d421b";ctx.fillRect(s.x+C.tile-12,s.y+8,14,C.tile-12);ctx.fillStyle="#0b0910";ctx.fillRect(s.x+C.tile-10,s.y+12,10,15);ctx.fillStyle=g.used?"#766b7d":"#ffd85a";ctx.font="bold 7px monospace";ctx.textAlign="center";ctx.fillText(g.used?"X":"£",s.x+C.tile-5,s.y+22);ctx.restore();
  }

  function updateGamblerPrompt(){
    const g=host?.gambler;if(mode!=="playing"||!g?.active)return;const player=nearbyGamblerPlayer();if(!player)return;const now=Date.now();if(now-state.promptAt<2600)return;state.promptAt=now;
    try{showToast(g.used?"THE GAMBLER — CLOSED":"THE GAMBLER",g.used?"The reel has already been played this run.":"Press G to gamble 1,000 score on the reel. One play only.",g.used?"dim":"gold",2400)}catch(_){}
  }

  async function ownerAuthorized(){
    if(state.dev.authorized)return true;if(state.dev.checking)return false;state.dev.checking=true;
    try{
      const client=await window.ccgSupabase?.getClient?.();if(!client)return false;
      const result=await client.auth.getSession();const email=String(result?.data?.session?.user?.email||"").trim().toLowerCase();if(!email)return false;
      const config=await import("/admin/js/config.js");const owners=Array.isArray(config?.OWNER_EMAILS)?config.OWNER_EMAILS:[];
      state.dev.authorized=owners.some(owner=>String(owner||"").trim().toLowerCase()===email);return state.dev.authorized;
    }catch(error){console.warn("[Lost Sizzler V10.41] developer owner check failed",error);return false}
    finally{state.dev.checking=false}
  }

  function devRoom(){return world?.rooms?.find(room=>Number(room.id)===Number(state.dev.roomId))||null}
  function devTagged(row){return Boolean(row?.developerSpawn||row?.developerRoomSpawn)}
  function clearDevSpawns(){
    if(!host)return;
    host.enemies=(host.enemies||[]).filter(row=>!devTagged(row));host.items=(host.items||[]).filter(row=>!devTagged(row));host.chests=(host.chests||[]).filter(row=>!devTagged(row));host.generators=(host.generators||[]).filter(row=>!devTagged(row));host.shrines=(host.shrines||[]).filter(row=>!devTagged(row));host.traps=(host.traps||[]).filter(row=>!devTagged(row));host.blockingDecor=(host.blockingDecor||[]).filter(row=>!devTagged(row));world.decor=(world.decor||[]).filter(row=>!devTagged(row));
    if(host.gambler?.developerSpawn)host.gambler=null;host.revision=(host.revision||0)+1;
  }

  function freeDevCell(){
    const room=devRoom();if(!room)return null;const cells=safeCells(room);if(!cells.length)return null;
    const p=p1||{x:room.x+2,y:room.y+2};cells.sort((a,b)=>md(a,p)-md(b,p)||a.y-b.y||a.x-b.x);return cells[0]||null;
  }

  function spawnDevItem(kind,title){
    const q=freeDevCell();if(!q)return false;host.items.push({id:`dev-item-${++state.dev.spawnSerial}`,...q,kind,active:true,title,developerSpawn:true,scoreValue:kind==="credits"?1000:undefined});host.revision=(host.revision||0)+1;return true;
  }

  function spawnDevEnemy(kind,named=null){
    const q=freeDevCell();if(!q)return false;const hp=Math.max(4,Number(named?.hp||8)),enemy={id:`dev-enemy-${++state.dev.spawnSerial}`,...q,kind:named?.kind||kind,hp,maxHp:hp,armor:Number(named?.armor||0),maxArmor:Number(named?.armor||0),alive:true,aiState:"idle",facing:{x:-1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:999999,attackCooldown:999999,chargeCooldown:999999,healCooldown:999999,flash:0,hpBarMs:0,developerSpawn:true,developerPassive:true};
    if(named){enemy.follower={...named};enemy.championName=named.name;enemy.namedEnemy=true}host.enemies.push(enemy);host.revision=(host.revision||0)+1;return true;
  }

  function spawnDevDecor(type){
    const q=freeDevCell();if(!q)return false;const id=`dev-decor-${++state.dev.spawnSerial}`,blocking=!new Set(["cable","pipe","lightBar","candleSconce"]).has(type);world.decor.push({id,...q,type,variant:state.dev.spawnSerial%4,blocking,structural:false,hp:99,maxHp:99,developerSpawn:true,roomId:state.dev.roomId});if(blocking)host.blockingDecor.push({id,...q,type,hp:99,maxHp:99,developerSpawn:true,roomId:state.dev.roomId});host.revision=(host.revision||0)+1;return true;
  }

  function spawnDevSpecial(type){
    const q=freeDevCell();if(!q&&type!=="gambler")return false;
    if(type==="gambler"){
      if(host.gambler)host.gambler.active=false;const gambler=spawnGambler({forced:true,room:devRoom()});if(gambler)gambler.developerSpawn=true;return Boolean(gambler);
    }
    if(type==="chest"){host.chests.push({id:`dev-chest-${++state.dev.spawnSerial}`,...q,roomId:state.dev.roomId,locked:false,active:true,depth:10,developerSpawn:true});return true}
    if(type==="generator"){host.generators.push({id:`dev-gen-${++state.dev.spawnSerial}`,...q,roomId:state.dev.roomId,hp:20,maxHp:20,alive:true,spawnCooldown:999999,spawnKills:0,spawnTotal:0,developerSpawn:true});return true}
    if(type==="shrine"){host.shrines.push({id:`dev-shrine-${++state.dev.spawnSerial}`,...q,roomId:state.dev.roomId,active:true,developerSpawn:true});return true}
    if(type==="trap"){host.traps.push({id:`dev-trap-${++state.dev.spawnSerial}`,...q,roomId:state.dev.roomId,kind:["fire","spike","shock"][state.dev.spawnSerial%3],phase:0,period:1800,active:true,developerSpawn:true});return true}
    return false;
  }

  function spawnAllItems(){let count=0;for(const [kind,title] of ITEM_TYPES)if(spawnDevItem(kind,title))count++;return count}
  function spawnAllEnemies(){let count=0;for(const kind of STANDARD_ENEMIES)if(spawnDevEnemy(kind))count++;return count}
  function spawnAllNamed(){let count=0;for(const named of window.CCG_CONFIG?.followerElites||[])if(spawnDevEnemy(named.kind,named))count++;return count}

  function ensureDevPanel(){
    if(state.dev.panel?.isConnected)return state.dev.panel;ensureStyles();
    const panel=document.createElement("div");panel.id="ccg-dev-vault-panel";panel.className="hidden";panel.innerHTML=`<div class="ccg-dev-card" role="dialog" aria-modal="true"><div class="ccg-dev-head"><div><h2>OWNER DEVELOPER VAULT</h2><p>Private runtime laboratory. F2 reopens this console while the Developer Vault is active.</p></div><button type="button" data-dev-close>CLOSE</button></div><section class="ccg-dev-section"><h3>TEST RESOURCES</h3><div class="ccg-dev-grid"><button data-dev-action="heal">FULL HEALTH / AMMO</button><button data-dev-action="score">+50,000 SCORE</button><button data-dev-action="clear">CLEAR SPAWNED ASSETS</button><button data-dev-action="gambler">SPAWN GAMBLER</button></div></section><section class="ccg-dev-section"><h3>ITEMS</h3><div class="ccg-dev-grid"><button data-dev-action="all-items">SPAWN ALL ITEMS</button>${ITEM_TYPES.map(([kind,title])=>`<button data-dev-item="${kind}">${title}</button>`).join("")}</div></section><section class="ccg-dev-section"><h3>STANDARD ENEMIES — PASSIVE TEST MODE</h3><div class="ccg-dev-grid"><button data-dev-action="all-enemies">SPAWN ALL STANDARD</button>${STANDARD_ENEMIES.map(kind=>`<button data-dev-enemy="${kind}">${kind.toUpperCase()}</button>`).join("")}</div></section><section class="ccg-dev-section"><h3>NAMED ENEMIES — PASSIVE TEST MODE</h3><div class="ccg-dev-grid"><button data-dev-action="all-named">SPAWN ALL NAMED</button>${(window.CCG_CONFIG?.followerElites||[]).map((named,index)=>`<button data-dev-named="${index}">${String(named.name||"NAMED").replace(/[<>]/g,"")}</button>`).join("")}</div></section><section class="ccg-dev-section"><h3>SPECIAL OBJECTS</h3><div class="ccg-dev-grid"><button data-dev-special="chest">CHEST</button><button data-dev-special="generator">GENERATOR</button><button data-dev-special="shrine">SHRINE</button><button data-dev-special="trap">TRAP</button></div></section><section class="ccg-dev-section"><h3>SCENERY</h3><div class="ccg-dev-grid">${DECOR_TYPES.map(type=>`<button data-dev-decor="${type}">${type.toUpperCase()}</button>`).join("")}</div></section></div>`;
    panel.addEventListener("click",event=>{
      const button=event.target?.closest?.("button");if(!button)return;
      if(button.matches("[data-dev-close]")){panel.classList.add("hidden");if(mode==="paused")mode="playing";return}
      let message="";
      const item=button.dataset.devItem,enemy=button.dataset.devEnemy,namedIndex=button.dataset.devNamed,decor=button.dataset.devDecor,special=button.dataset.devSpecial,action=button.dataset.devAction;
      if(item)message=spawnDevItem(item,button.textContent)?`Spawned ${button.textContent}.`:"No safe floor cell left.";
      else if(enemy)message=spawnDevEnemy(enemy)?`Spawned ${enemy}.`:"No safe floor cell left.";
      else if(namedIndex!=null){const named=window.CCG_CONFIG?.followerElites?.[Number(namedIndex)];message=named&&spawnDevEnemy(named.kind,named)?`Spawned ${named.name}.`:"No safe floor cell left."}
      else if(decor)message=spawnDevDecor(decor)?`Spawned ${decor}.`:"No safe floor cell left.";
      else if(special)message=spawnDevSpecial(special)?`Spawned ${special}.`:"No safe floor cell left.";
      else if(action==="heal"){if(p1){p1.health=p1.maxHealth;p1.mana=p1.maxMana}message="Player restored."}
      else if(action==="score"){score=Math.max(0,Number(score||0))+50000;message="Added 50,000 score."}
      else if(action==="clear"){clearDevSpawns();message="Developer-spawned assets cleared."}
      else if(action==="gambler"){message=spawnDevSpecial("gambler")?"Gambler spawned.":"Could not place Gambler."}
      else if(action==="all-items")message=`Spawned ${spawnAllItems()} item types.`;
      else if(action==="all-enemies")message=`Spawned ${spawnAllEnemies()} standard enemy types.`;
      else if(action==="all-named")message=`Spawned ${spawnAllNamed()} named enemies.`;
      if(message)try{showToast("DEVELOPER VAULT",message,"cyan",2500)}catch(_){}
    });gameMount().appendChild(panel);state.dev.panel=panel;return panel;
  }

  function openDevPanel(){if(!state.dev.active)return;const panel=ensureDevPanel();if(panel.parentElement!==gameMount())gameMount().appendChild(panel);panel.classList.remove("hidden");if(mode==="playing")mode="paused";try{input.clear()}catch(_){} }

  function sanitizeDevRoom(){
    const room=devRoom();if(!room||!host||!world)return false;
    const inside=row=>inRoom(room,row);
    host.enemies=(host.enemies||[]).filter(row=>!inside(row));host.items=(host.items||[]).filter(row=>!inside(row));host.chests=(host.chests||[]).filter(row=>!inside(row));host.traps=(host.traps||[]).filter(row=>!inside(row));host.generators=(host.generators||[]).filter(row=>!inside(row));host.shrines=(host.shrines||[]).filter(row=>!inside(row));host.switches=(host.switches||[]).filter(row=>!inside(row));host.blockingDecor=(host.blockingDecor||[]).filter(row=>!inside(row));world.decor=(world.decor||[]).filter(row=>!inside(row));
    room.developerRoom=true;room.sanctuary=true;world.sanctuaryRooms=Array.isArray(world.sanctuaryRooms)?world.sanctuaryRooms:[];if(!world.sanctuaryRooms.includes(room.id))world.sanctuaryRooms.push(room.id);
    const x=Math.floor(room.x+room.w/2),y=Math.floor(room.y+room.h/2);if(p1){p1.x=x;p1.y=y;p1.health=p1.maxHealth;p1.mana=p1.maxMana}score=Math.max(Number(score||0),50000);host.developerRoom={roomId:room.id,ownerOnly:true};host.revision=(host.revision||0)+1;return true;
  }

  function waitForDeveloperRun(){
    let tries=0;const timer=setInterval(()=>{
      tries++;if(document.body?.dataset?.runActive==="true"&&world&&host&&p1){clearInterval(timer);state.dev.active=true;run.developer=true;state.dev.roomId=world.startRoomId;sanitizeDevRoom();spawnDevSpecial("gambler");ensureDevStatus();openDevPanel();try{showToast("OWNER DEVELOPER VAULT","Private developer room active. F2 opens the spawn console.","cyan",7000)}catch(_){}return}
      if(tries>120){clearInterval(timer);state.dev.active=false}
    },50);
  }

  async function launchDeveloperVault(){
    if(state.dev.active){openDevPanel();return true}
    if(document.body?.dataset?.runActive==="true"||mode!=="menu")return false;
    if(!(await ownerAuthorized()))return false;
    try{const result=startSolo();if(result?.catch)result.catch(error=>console.warn("[Lost Sizzler V10.41] developer run start failed",error));waitForDeveloperRun();return true}catch(error){console.warn("[Lost Sizzler V10.41] developer vault launch failed",error);return false}
  }

  function ensureDevStatus(){
    if(!state.dev.active||document.getElementById("ccg-dev-status"))return;const badge=document.createElement("div");badge.id="ccg-dev-status";badge.className="ccg-dev-status";badge.textContent="OWNER DEV VAULT · F2 CONSOLE";gameMount().appendChild(badge)
  }

  function controllerFrame(controllerId){
    const id=String(controllerId||"");
    if(!["dungeon-solo","split-screen"].includes(id))return false;
    try{
      updateGamblerPrompt();
      if(state.dev.active){
        ensureDevStatus();
        for(const enemy of host?.enemies||[])if(enemy?.developerPassive){
          enemy.moveCooldown=999999;enemy.attackCooldown=999999;enemy.chargeCooldown=999999;enemy.healCooldown=999999;
        }
      }
    }catch(_){}
    state.controllerFrames++;return true;
  }

  function wrapRuntime(){
    if(!state.startWrapped&&typeof startWorld==="function"){
      const original=startWorld;startWorld=function startWorldV141Gambler(){const result=original.apply(this,arguments);try{state.floorKey=floorKey();if(!state.dev.active)spawnGambler()}catch(error){console.warn("[Lost Sizzler V10.41] Gambler generation failed",error)}return result};state.startWrapped=true;
    }
    if(!state.updateWrapped){
      // The six-mode controller dispatches controllerFrame after Dungeon rules.
      state.controllerOwnedUpdate=true;state.updateWrapped=true;
    }
    if(!state.renderWrapped&&typeof drawSpecialObjects==="function"){
      const original=drawSpecialObjects;drawSpecialObjects=function drawSpecialObjectsV141Gambler(){const result=original.apply(this,arguments);try{drawGambler()}catch(_){}return result};state.renderWrapped=true;
    }
  }

  addEventListener("keydown",event=>{
    if(event.code==="KeyG"&&mode==="playing"&&nearbyGamblerPlayer()){event.preventDefault();event.stopImmediatePropagation();openGamblerPanel();return}
    if(event.code===DEV_PANEL_KEY&&state.dev.active){event.preventDefault();event.stopImmediatePropagation();openDevPanel();return}
    if(event.code===DEV_SHORTCUT&&event.ctrlKey&&event.altKey&&event.shiftKey&&mode==="menu"){
      void ownerAuthorized().then(ok=>{if(!ok)return;event.preventDefault();void launchDeveloperVault()});
    }
  },true);

  function install(){
    ensureStyles();ensureGamblerPanel();const gate=window.CCGLostSizzlerReleaseGate;if(gate&&!gate.state?.ready)return false;wrapRuntime();
    if(!state.startWrapped||!state.updateWrapped||!state.renderWrapped)return false;
    if(world&&host&&!host.gambler&&!run?.gamblerEncountered&&!state.dev.active)try{spawnGambler()}catch(_){}
    state.installed=true;document.body.dataset.v141Gambler="true";return true;
  }

  state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},100);install();
  window.addEventListener("fullscreenchange",()=>{if(state.panel?.isConnected&&state.panel.parentElement!==gameMount())gameMount().appendChild(state.panel);if(state.dev.panel?.isConnected&&state.dev.panel.parentElement!==gameMount())gameMount().appendChild(state.dev.panel);const badge=document.getElementById("ccg-dev-status");if(badge&&badge.parentElement!==gameMount())gameMount().appendChild(badge)});
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});

  window.CCGLostSizzlerV141Gambler={SPAWN_CHANCE,STAKE,JACKPOT,REEL,spawnGambler,openGamblerPanel,launchDeveloperVault,ownerAuthorized,controllerFrame,get state(){return state}};
})();