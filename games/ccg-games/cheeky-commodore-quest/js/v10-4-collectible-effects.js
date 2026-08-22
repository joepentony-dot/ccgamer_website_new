/* The Lost Sizzler V10.4 — database-driven collectible game effects. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_COLLECTIBLE_EFFECTS_V104__)return;
  window.__CCG_LOST_SIZZLER_COLLECTIBLE_EFFECTS_V104__=true;

  const TABLE="lost_sizzler_collectible_effects";
  const FALLBACK_RULES=[
    {match_type:"genre",match_value:"horror",effect_type:"spawn_horror_creature",duration_ms:0,config:{creature:"archive_wraith",hp:50,armor:0,music:"horror"}},
    {match_type:"title",match_value:"Winter Games",effect_type:"slippery",duration_ms:10000,config:{popup:"Woahhh slidy"}},
    {match_type:"title",match_value:"Bozo's Night Out",effect_type:"reverse_controls",duration_ms:10000,config:{popup:"Controls reversed!"}},
    {match_type:"title",match_value:"How To Be A Complete Bastard",effect_type:"teleport_far_side",duration_ms:0,config:{popup:"BASTARD! TELEPORTED!"}},
    {match_type:"title",match_value:"Everyone's A Wally",effect_type:"spin",duration_ms:10000,config:{popup:"WALLY SPIN!"}},
    {match_type:"title",match_value:"Paradroid",effect_type:"transform",duration_ms:10000,config:{transform:"paradroid_001",popup:"001 DROID MODE"}}
  ];

  let rules=[...FALLBACK_RULES];
  let gameMeta=new Map();
  let horrorCtx=null,horrorGain=null,horrorNodes=[],horrorBeatTimer=null,horrorMusicActive=false;

  const normalise=value=>String(value||"")
    .toLowerCase()
    .replace(/[’‘`]/g,"'")
    .replace(/&/g,"and")
    .replace(/[^a-z0-9]+/g," ")
    .trim();

  function now(){return performance.now()}
  function localPlayersSafe(){try{return typeof localPlayers==="function"?localPlayers():[typeof p1!=="undefined"?p1:null,typeof p2!=="undefined"?p2:null].filter(Boolean)}catch(_){return[]}}
  function activeUntil(player,key){return Number(player?._v104Effects?.[key]?.until||0)}
  function effectActive(player,key){return activeUntil(player,key)>now()}
  function setEffect(player,key,duration,config={}){
    if(!player)return;
    player._v104Effects=player._v104Effects||{};
    player._v104Effects[key]={until:now()+Math.max(0,Number(duration||0)),config:{...config}};
  }
  function overhead(player,text,colour){
    if(!player||!text)return;
    setTimeout(()=>{const label=String(text).toUpperCase();try{if(typeof floatPickupText==="function")floatPickupText(player,label,colour||P.gold);else floatText(player.x,player.y,label,colour||P.gold)}catch(_){}},420);
  }

  async function loadRulesAndMetadata(){
    try{
      const response=await fetch("/games/games.json",{cache:"no-cache"});
      if(response.ok){
        const games=await response.json();
        if(Array.isArray(games)){
          gameMeta=new Map(games.map(game=>[
            normalise(game?.title),
            {title:String(game?.title||""),slug:String(game?.slug||""),genres:Array.isArray(game?.genres)?game.genres.map(x=>normalise(x)):[]}
          ]));
        }
      }
    }catch(error){console.warn("Lost Sizzler collectible metadata unavailable",error)}

    try{
      const client=await window.ccgSupabase?.getClient?.();
      if(!client)return;
      const {data,error}=await client.from(TABLE).select("match_type,match_value,effect_type,duration_ms,config,enabled").eq("enabled",true);
      if(error)throw error;
      if(Array.isArray(data)&&data.length)rules=data;
    }catch(error){console.warn("Lost Sizzler collectible effects database unavailable; using built-in fallback rules",error)}
  }
  const ready=loadRulesAndMetadata();

  function matchingRules(title){
    const key=normalise(title),meta=gameMeta.get(key),genres=new Set(meta?.genres||[]);
    return rules.filter(rule=>{
      if(!rule||rule.enabled===false)return false;
      if(rule.match_type==="title")return normalise(rule.match_value)===key;
      if(rule.match_type==="genre")return genres.has(normalise(rule.match_value));
      return false;
    });
  }

  function farSideCell(player){
    if(!player||!world?.map)return null;
    const candidates=[];
    for(const room of world.rooms||[]){
      if(!room)continue;
      const x=Math.floor(room.x+room.w/2),y=Math.floor(room.y+room.h/2);
      if(!W.walkable(world.map,x,y,host))continue;
      if((host.enemies||[]).some(e=>e.alive&&e.x===x&&e.y===y))continue;
      candidates.push({x,y,d:Math.hypot(x-player.x,y-player.y)});
    }
    if(!candidates.length){
      for(let attempt=0;attempt<120;attempt++){
        const x=Math.floor(Math.random()*C.worldWidth),y=Math.floor(Math.random()*C.worldHeight);
        if(W.walkable(world.map,x,y,host))candidates.push({x,y,d:Math.hypot(x-player.x,y-player.y)});
      }
    }
    candidates.sort((a,b)=>b.d-a.d);
    return candidates[0]||null;
  }

  function teleportFarSide(player,config){
    const q=farSideCell(player);if(!q)return;
    try{burst(player.x,player.y,P.purple,20,1.4);ring(player.x,player.y,P.purple,40)}catch(_){}
    player.x=q.x;player.y=q.y;player.rx=q.x;player.ry=q.y;
    try{burst(q.x,q.y,P.cyan,24,1.6);ring(q.x,q.y,P.cyan,46);S.sfx("warp")}catch(_){}
    overhead(player,config?.popup||"TELEPORTED!",P.purple);
    try{showToast("HOW TO BE A COMPLETE BASTARD",`The collectible has dumped you on the far side of the floor. Charming.`,"purple",7200)}catch(_){}
    try{host.revision++;broadcastWorld()}catch(_){}
  }

  function findHorrorSpawn(player){
    if(!player||!world?.map)return null;
    const options=[];
    for(let attempt=0;attempt<180;attempt++){
      const radius=8+Math.floor(Math.random()*10),angle=Math.random()*Math.PI*2;
      const x=Math.max(1,Math.min(C.worldWidth-2,Math.round(player.x+Math.cos(angle)*radius)));
      const y=Math.max(1,Math.min(C.worldHeight-2,Math.round(player.y+Math.sin(angle)*radius)));
      if(!W.walkable(world.map,x,y,host))continue;
      if((host.enemies||[]).some(e=>e.alive&&e.x===x&&e.y===y))continue;
      if(window.CCGSystems?.inSanctuary?.(world,x,y))continue;
      options.push({x,y,d:Math.hypot(x-player.x,y-player.y)});
    }
    if(options.length)return options.sort((a,b)=>Math.abs(12-a.d)-Math.abs(12-b.d))[0];
    return farSideCell(player);
  }

  function spawnArchiveWraith(player,title,config={}){
    if(!player||!host?.enemies)return;
    const q=findHorrorSpawn(player);if(!q)return;
    const hp=50;
    const creature={
      id:`archive-wraith-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      x:q.x,y:q.y,kind:"hunter",horrorCreature:true,horrorSource:title,
      hp,maxHp:hp,armor:0,maxArmor:0,alive:true,
      aiState:"chase",facing:{x:1,y:0},lastSeen:{x:player.x,y:player.y},targetId:player.id,
      memoryMs:999999,searchMs:0,moveCooldown:80,attackCooldown:620,chargeCooldown:0,healCooldown:999999,
      flash:0,hpBarMs:3600,moveSpeedScale:.48,_v104BaseMaxHp:1
    };
    host.enemies.push(creature);host.revision=(host.revision||0)+1;
    try{S.sfx("stalker");showToast("HORROR GAME DISTURBED THE ARCHIVE",`${title} has dragged an Archive Wraith into the dungeon. 50 HP, no armour — and it only wants to stalk you down.`,"red",10000);if(typeof floatPickupText==="function")floatPickupText(player,"ARCHIVE WRAITH SUMMONED",P.red);else floatText(player.x,player.y,"SOMETHING FOLLOWED YOU OUT...",P.red);broadcastWorld()}catch(_){}
  }

  function applyRule(rule,player,title){
    const duration=Math.max(0,Number(rule?.duration_ms||0)),config=rule?.config||{};
    switch(rule?.effect_type){
      case "slippery":
        setEffect(player,"slippery",duration,config);player._v104SlideDir={...(player.dir||{x:1,y:0})};player._v104NextSlide=0;overhead(player,config.popup||"Woahhh slidy",P.cyan);break;
      case "reverse_controls":
        setEffect(player,"reverse_controls",duration,config);overhead(player,config.popup||"Controls reversed!",P.pink);break;
      case "teleport_far_side":
        teleportFarSide(player,config);break;
      case "spin":
        setEffect(player,"spin",duration,config);overhead(player,config.popup||"Wally spin!",P.gold);break;
      case "transform":
        setEffect(player,"transform",duration,config);overhead(player,config.popup||"Transformation!",P.cyan);break;
      case "spawn_horror_creature":
        spawnArchiveWraith(player,title,config);break;
    }
  }

  async function triggerGameEffects(title,player){
    if(!title||!player)return;
    try{await ready}catch(_){}
    const matches=matchingRules(title);
    for(const rule of matches)applyRule(rule,player,title);
  }

  if(typeof applyItem==="function"){
    const originalApplyItem=applyItem;
    applyItem=function applyItemV104CollectibleEffects(item,player){
      const result=originalApplyItem.apply(this,arguments);
      if(item?.kind==="game"&&player)triggerGameEffects(item.title,player);
      return result;
    };
  }

  if(typeof d1==="function"){
    const originalD1=d1;
    d1=function d1V104Effects(){const d=originalD1();if(!d||!effectActive(p1,"reverse_controls"))return d;return{x:-d.x,y:-d.y}};
  }
  if(typeof d2==="function"){
    const originalD2=d2;
    d2=function d2V104Effects(){const d=originalD2();if(!d||!effectActive(p2,"reverse_controls"))return d;return{x:-d.x,y:-d.y}};
  }

  if(typeof movePlayer==="function"){
    const originalMovePlayer=movePlayer;
    movePlayer=function movePlayerV104Effects(player,dx,dy){
      if(player&&effectActive(player,"slippery")&&(dx||dy))player._v104SlideDir={x:Math.sign(dx),y:Math.sign(dy)};
      return originalMovePlayer.apply(this,arguments);
    };
  }

  if(window.CCGAI?.stepEnemies){
    const originalStepEnemies=window.CCGAI.stepEnemies.bind(window.CCGAI);
    window.CCGAI.stepEnemies=function stepEnemiesV104Horror(hostState,map,players,dt,hooks,worldState){
      for(const enemy of hostState?.enemies||[]){
        if(!enemy?.alive||!enemy.horrorCreature)continue;
        const target=(players||[]).filter(p=>p&&p.health>0).sort((a,b)=>Math.hypot(enemy.x-a.x,enemy.y-a.y)-Math.hypot(enemy.x-b.x,enemy.y-b.y))[0];
        enemy.kind="hunter";enemy.armor=0;enemy.maxArmor=0;enemy.maxHp=50;enemy.hp=Math.min(50,Math.max(0,Number(enemy.hp||50)));enemy._v104BaseMaxHp=1;
        enemy.moveSpeedScale=.48;enemy.memoryMs=999999;enemy.aiState="chase";
        if(target){enemy.targetId=target.id;enemy.lastSeen={x:target.x,y:target.y};enemy.searchMs=0;enemy.moveCooldown=Math.min(Number(enemy.moveCooldown||0),90)}
      }
      return originalStepEnemies(hostState,map,players,dt,hooks,worldState);
    };
  }

  function drawArchiveWraith(enemy){
    if(!enemy?.alive||!visibleTo(focus,enemy.x,enemy.y))return;
    const s=typeof enemyScreen==="function"?enemyScreen(enemy):ws(enemy.x,enemy.y),cx=s.x+C.tile/2,cy=s.y+C.tile/2,t=performance.now()/120;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.shadowColor="#b0002d";ctx.shadowBlur=18;
    ctx.fillStyle="rgba(0,0,0,.55)";ctx.beginPath();ctx.ellipse(cx,s.y+C.tile-2,17,5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#0b0710";ctx.beginPath();ctx.moveTo(cx,cy-17);ctx.lineTo(cx+13,cy-5);ctx.lineTo(cx+10,cy+15);ctx.lineTo(cx+4,cy+10);ctx.lineTo(cx,cy+18);ctx.lineTo(cx-5,cy+10);ctx.lineTo(cx-12,cy+15);ctx.lineTo(cx-13,cy-5);ctx.closePath();ctx.fill();
    ctx.fillStyle="#d7d1d8";ctx.fillRect(cx-7,cy-13,14,10);ctx.fillStyle="#211620";ctx.fillRect(cx-5,cy-10,3,2);ctx.fillRect(cx+2,cy-10,3,2);ctx.fillStyle="#ff315f";ctx.fillRect(cx-4,cy-10,1,1);ctx.fillRect(cx+3,cy-10,1,1);
    const claw=Math.sin(t)*2;ctx.strokeStyle="#b7aab9";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-9,cy-3);ctx.lineTo(cx-18,cy+5+claw);ctx.lineTo(cx-21,cy+3+claw);ctx.moveTo(cx+9,cy-3);ctx.lineTo(cx+18,cy+5-claw);ctx.lineTo(cx+21,cy+3-claw);ctx.stroke();
    ctx.globalAlpha=.32;ctx.strokeStyle="#ff174b";ctx.beginPath();ctx.arc(cx,cy,18+Math.sin(t)*2,0,Math.PI*2);ctx.stroke();ctx.restore();
    label("ARCHIVE WRAITH",s,P.red);drawTransientHealth(enemy,s,P.red);
    if((enemy.hitStunMs||0)>0){ctx.save();ctx.font='bold 9px "Courier New"';ctx.textAlign="center";ctx.fillStyle=P.cyan;ctx.fillText("STUNNED",cx,s.y-25);ctx.restore()}
  }

  if(typeof drawEnemy==="function"){
    const originalDrawEnemy=drawEnemy;
    drawEnemy=function drawEnemyV104Horror(enemy){if(enemy?.horrorCreature)return drawArchiveWraith(enemy);return originalDrawEnemy.apply(this,arguments)};
  }

  function drawParadroid001(player,kind){
    const s=ws(player.rx,player.ry),col=kind==="p2"?P.green:kind==="remote"?P.cyan:P.gold,cx=s.x+C.tile/2,cy=s.y+C.tile/2;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.shadowColor=P.cyan;ctx.shadowBlur=12;
    ctx.fillStyle="rgba(0,0,0,.45)";ctx.beginPath();ctx.ellipse(cx,s.y+C.tile-2,14,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#10151a";ctx.fillRect(cx-12,cy-8,24,17);ctx.fillStyle="#a7b6bd";ctx.fillRect(cx-10,cy-6,20,13);ctx.fillStyle="#dbe8ed";ctx.fillRect(cx-7,cy-4,14,7);ctx.strokeStyle=P.cyan;ctx.lineWidth=2;ctx.strokeRect(cx-12,cy-8,24,17);
    ctx.fillStyle="#17252d";ctx.fillRect(cx-5,cy-2,10,4);ctx.fillStyle=P.cyan;ctx.font='bold 7px "Courier New"';ctx.textAlign="center";ctx.fillText("001",cx,cy+2);
    ctx.fillStyle="#7a8990";ctx.fillRect(cx-15,cy-3,4,8);ctx.fillRect(cx+11,cy-3,4,8);ctx.fillRect(cx-8,cy+9,5,5);ctx.fillRect(cx+3,cy+9,5,5);ctx.fillStyle="#f4fbff";ctx.fillRect(cx-6,cy-11,12,3);ctx.restore();
    if(kind==="remote")label(player.name,{x:s.x,y:s.y-2},col);drawTransientHealth(player,s,col);drawPlayerResources(player,s,col,kind);
  }

  if(typeof drawPlayer==="function"){
    const originalDrawPlayer=drawPlayer;
    drawPlayer=function drawPlayerV104Effects(player,kind="p1"){
      const transform=player?._v104Effects?.transform;
      if(transform&&transform.until>now()&&transform.config?.transform==="paradroid_001")return drawParadroid001(player,kind);
      if(player&&effectActive(player,"spin")){
        const s=ws(player.rx,player.ry),cx=s.x+C.tile/2,cy=s.y+C.tile/2,angle=(now()/105)%(Math.PI*2);
        ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.translate(-cx,-cy);const result=originalDrawPlayer.apply(this,arguments);ctx.restore();return result;
      }
      return originalDrawPlayer.apply(this,arguments);
    };
  }

  function ensureHorrorAudio(){
    if(horrorCtx)return true;
    try{
      horrorCtx=new (window.AudioContext||window.webkitAudioContext)();
      horrorGain=horrorCtx.createGain();horrorGain.gain.value=.0001;horrorGain.connect(horrorCtx.destination);return true;
    }catch(_){return false}
  }
  function startHorrorMusic(){
    if(horrorMusicActive||!S?.isEnabled?.()||!ensureHorrorAudio())return;
    horrorMusicActive=true;horrorCtx.resume?.().catch(()=>{});horrorGain.gain.cancelScheduledValues(horrorCtx.currentTime);horrorGain.gain.setTargetAtTime(.035,horrorCtx.currentTime,.35);
    const makeDrone=(freq,type,detune)=>{const osc=horrorCtx.createOscillator(),gain=horrorCtx.createGain();osc.type=type;osc.frequency.value=freq;osc.detune.value=detune;gain.gain.value=.26;osc.connect(gain).connect(horrorGain);osc.start();horrorNodes.push(osc,gain)};
    makeDrone(46,"sawtooth",-8);makeDrone(69,"triangle",7);makeDrone(92,"sine",-13);
    horrorBeatTimer=setInterval(()=>{if(!horrorMusicActive||!S?.isEnabled?.())return;const t=horrorCtx.currentTime;for(const offset of [0,.17]){const osc=horrorCtx.createOscillator(),gain=horrorCtx.createGain();osc.type="sine";osc.frequency.setValueAtTime(58,t+offset);osc.frequency.exponentialRampToValueAtTime(38,t+offset+.13);gain.gain.setValueAtTime(.0001,t+offset);gain.gain.exponentialRampToValueAtTime(.18,t+offset+.02);gain.gain.exponentialRampToValueAtTime(.0001,t+offset+.18);osc.connect(gain).connect(horrorGain);osc.start(t+offset);osc.stop(t+offset+.2)}},1050);
    try{S.setMusicLevel?.(.035)}catch(_){}
  }
  function stopHorrorMusic(){
    if(!horrorMusicActive)return;horrorMusicActive=false;
    if(horrorBeatTimer){clearInterval(horrorBeatTimer);horrorBeatTimer=null}
    if(horrorGain&&horrorCtx)horrorGain.gain.setTargetAtTime(.0001,horrorCtx.currentTime,.35);
    for(const node of horrorNodes){try{node.stop?.()}catch(_){}try{node.disconnect?.()}catch(_){}}horrorNodes=[];
    try{S.setMusicLevel?.(.075)}catch(_){}
  }

  setInterval(()=>{
    if(typeof mode==="undefined"||mode!=="playing")return;
    const t=now();
    for(const player of localPlayersSafe()){
      if(effectActive(player,"slippery")&&player._v104SlideDir&&t>=Number(player._v104NextSlide||0)){
        player._v104NextSlide=t+165;
        const d=player._v104SlideDir;
        if(d.x||d.y){try{movePlayer(player,d.x,d.y)}catch(_){}}
      }
      if(player?._v104Effects){for(const [key,value] of Object.entries(player._v104Effects))if(value?.until&&value.until<=t)delete player._v104Effects[key]}
    }
    const horrorAlive=(host?.enemies||[]).some(enemy=>enemy?.alive&&enemy.horrorCreature);
    if(horrorAlive)startHorrorMusic();else stopHorrorMusic();
  },80);

  window.CCGLostSizzlerCollectibleEffects={
    reload:async()=>{await loadRulesAndMetadata();return rules.length},
    getRules:()=>rules.map(rule=>({...rule,config:{...(rule.config||{})}})),
    trigger:(title,player)=>triggerGameEffects(title,player)
  };
})();
