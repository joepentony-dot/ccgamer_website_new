/* The Lost Sizzler V10.35 — atlas rendering, sanctuary safety and geometry validation. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_QUALITY_V135__)return;
  window.__CCG_LOST_SIZZLER_QUALITY_V135__=true;

  const CELL=64;
  const FRAME_GUTTER=1;
  const assets={};
  for(const [key,src] of Object.entries({
    a:"assets/pixel/enemy-atlas-standard-a-v10-35.png",
    b:"assets/pixel/enemy-atlas-standard-b-v10-35.png",
    h:"assets/pixel/enemy-atlas-horde-v10-35.png",
    environment:"assets/pixel/environment-atlas-v10-35.png"
  })){
    const image=new Image();
    image.src=src;
    assets[key]=image;
  }

  const key=(x,y)=>`${x},${y}`;
  const dirs=d=>d?.orientation==="horizontal"?[[0,-1],[0,1]]:[[-1,0],[1,0]];
  const roomFor=(x,y)=>world?.rooms?.[W.roomAt(world,x,y)]||null;
  const inSanctuary=entity=>Boolean(entity&&roomFor(entity.x,entity.y)?.sanctuary);

  /* Pixel art must land on whole canvas pixels. The original renderer mixed
   * fractional camera/interpolation coordinates with nearest-neighbour art,
   * which makes tiles and sprites shimmer against each other while moving. */
  if(typeof ws==="function"){
    const oldWs=ws;
    ws=function wsV135Stable(x,y){
      const point=oldWs.apply(this,arguments);
      return{x:Math.round(point.x),y:Math.round(point.y)};
    };
  }

  function clearDoorApproach(x,y){
    if(!world?.map?.[y]||x<=0||y<=0||x>=world.map[0].length-1||y>=world.map.length-1)return false;
    host.blockingDecor=(host.blockingDecor||[]).filter(q=>q.x!==x||q.y!==y);
    for(const d of world.decor||[])if(d.x===x&&d.y===y&&d.blocking)d.destroyed=true;
    const framed=(world.doorFrameCells||[]).some(q=>q.x===x&&q.y===y);
    if(world.map[y][x]!==0){
      world.map[y][x]=0;
      world.doorRepairCells=world.doorRepairCells||[];
      world.doorRepairCells.push({x,y,wasFrame:framed});
    }
    world.doorFrameCells=(world.doorFrameCells||[]).filter(q=>q.x!==x||q.y!==y);
    return W.walkable(world.map,x,y,host);
  }

  function validateDoorAccess(){
    if(!world||!host)return{checked:0,repaired:0,invalid:0};
    let checked=0,repaired=0,invalid=0;
    const groups=new Map();
    for(const d of host.doors||[]){
      if(d.type==="secret")continue;
      const id=d.groupId||d.id||`${d.x},${d.y}`;
      if(!groups.has(id))groups.set(id,[]);
      groups.get(id).push(d);
    }
    for(const leaves of groups.values()){
      checked++;
      const sides=dirs(leaves[0]).map(([dx,dy])=>leaves.map(d=>({x:d.x+dx,y:d.y+dy})));
      for(const side of sides){
        if(side.some(q=>W.walkable(world.map,q.x,q.y,host)))continue;
        let fixed=false;
        for(const q of side)if(clearDoorApproach(q.x,q.y)){repaired++;fixed=true;break}
        if(!fixed)invalid++;
      }
    }
    host.doorAccessValidation={checked,repaired,invalid,at:Date.now()};
    return host.doorAccessValidation;
  }

  function safeEnemyCell(enemy){
    const cells=[];
    for(const room of world?.rooms||[]){
      if(room.sanctuary)continue;
      for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++){
        if(!W.walkable(world.map,x,y,host))continue;
        if((host.enemies||[]).some(e=>e!==enemy&&e.alive&&e.x===x&&e.y===y))continue;
        if(allPlayers().some(p=>p.health>0&&p.x===x&&p.y===y))continue;
        cells.push({x,y,d:Math.hypot(x-enemy.x,y-enemy.y)});
      }
    }
    cells.sort((a,b)=>a.d-b.d);
    return cells[0]||null;
  }

  function expelSanctuaryEnemies(){
    let moved=0;
    for(const enemy of host?.enemies||[]){
      if(!enemy?.alive||!inSanctuary(enemy))continue;
      const q=safeEnemyCell(enemy);
      if(q){
        enemy.x=q.x;enemy.y=q.y;enemy.aiState="idle";enemy.lastSeen=null;enemy.memoryMs=0;moved++;
      }else enemy.alive=false;
    }
    if(moved)host.revision=(host.revision||0)+1;
    return moved;
  }

  function regenCell(room){
    const collect=margin=>{
      const candidates=[];
      for(let y=room.y+margin;y<=room.y+room.h-margin-1;y++)for(let x=room.x+margin;x<=room.x+room.w-margin-1;x++){
        if(!W.walkable(world.map,x,y,host))continue;
        if((host.blockingDecor||[]).some(q=>q.x===x&&q.y===y))continue;
        if((host.doors||[]).some(q=>q.x===x&&q.y===y))continue;
        candidates.push({x,y,d:Math.hypot(x-(room.x+room.w/2),y-(room.y+room.h/2))});
      }
      candidates.sort((a,b)=>a.d-b.d);
      return candidates[0]||null;
    };
    return collect(2)||collect(1);
  }

  function installSanctuaryTiles(){
    if(!host)return 0;
    host.sanctuaryRegeneration=[];
    for(const room of world?.rooms||[]){
      if(!room.sanctuary)continue;
      const q=regenCell(room);
      if(q)host.sanctuaryRegeneration.push({id:`sanctuary-regen-${room.id}`,...q,roomId:room.id,periodMs:3000,accumulators:{}});
    }
    return host.sanctuaryRegeneration.length;
  }

  function ensureSanctuaryTiles(){
    if(!host||!world)return 0;
    const sanctuaryCount=(world.rooms||[]).filter(room=>room?.sanctuary).length;
    if(!sanctuaryCount)return 0;
    if((host.sanctuaryRegeneration||[]).length!==sanctuaryCount)return installSanctuaryTiles();
    return host.sanctuaryRegeneration.length;
  }

  function updateSanctuaryRegen(dt){
    ensureSanctuaryTiles();
    for(const tile of host?.sanctuaryRegeneration||[])for(const p of localPlayers()){
      const on=p.x===tile.x&&p.y===tile.y&&p.health>0&&p.health<p.maxHealth;
      const current=Number(tile.accumulators[p.id]||0);
      if(!on){tile.accumulators[p.id]=0;continue}
      tile.accumulators[p.id]=current+dt;
      if(tile.accumulators[p.id]<tile.periodMs)continue;
      tile.accumulators[p.id]-=tile.periodMs;
      p.health=Math.min(p.maxHealth,p.health+1);
      p.hpBarMs=2200;
      try{S.sfx("potion");floatText(p.x,p.y,"SANCTUARY +1 HP",P.green);ring(p.x,p.y,P.green,28);sync()}catch(_){}
    }
  }

  function purgeCampingHazards(player){
    if(typeof hazards==="undefined"||!Array.isArray(hazards))return 0;
    let removed=0;
    for(let i=hazards.length-1;i>=0;i--){
      if(hazards[i]?.campOwner!==player?.id)continue;
      hazards.splice(i,1);removed++;
    }
    return removed;
  }

  if(typeof updateCamping==="function"){
    const oldCamping=updateCamping;
    updateCamping=function updateCampingV135Sanctuary(player,dt){
      if(inSanctuary(player)){
        try{resetCamp(player,true)}catch(_){}
        purgeCampingHazards(player);
        return;
      }
      return oldCamping.apply(this,arguments);
    };
  }

  function prepareFloor(){
    validateDoorAccess();
    expelSanctuaryEnemies();
    installSanctuaryTiles();
  }

  if(typeof startWorld==="function"){
    const old=startWorld;
    startWorld=function startWorldV135Quality(){
      const result=old.apply(this,arguments);
      try{prepareFloor()}catch(error){console.warn("[Lost Sizzler V10.35] floor quality pass failed",error)}
      return result;
    };
  }

  /* Quit means silence. game-main historically restarted the exploration track
   * after returning to the title screen, so block that restart and also stop
   * any track that reaches menu state through another route. */
  if(typeof S!=="undefined"&&S?.startMusic&&!S.__ccgV135MenuMusicGuard){
    const oldStartMusic=S.startMusic.bind(S);
    S.startMusic=function startMusicV135(){
      if(typeof mode!=="undefined"&&mode==="menu"){S.stopMusic?.();return}
      return oldStartMusic.apply(S,arguments);
    };
    S.__ccgV135MenuMusicGuard=true;
  }

  if(typeof update==="function"){
    const old=update;
    update=function updateV135Quality(dt){
      const result=old.apply(this,arguments);
      if(typeof mode!=="undefined"&&mode==="menu"){
        try{S.stopMusic?.()}catch(_){}
        return result;
      }
      if(mode==="playing"&&host){
        try{expelSanctuaryEnemies();updateSanctuaryRegen(Number(dt)||0)}catch(_){}
      }
      return result;
    };
  }

  function drawRegenTiles(){
    ensureSanctuaryTiles();
    for(const tile of host?.sanctuaryRegeneration||[]){
      if(!focus||!visibleTo(focus,tile.x,tile.y))continue;
      const s=ws(tile.x,tile.y),t=performance.now()/500,pulse=.55+.25*Math.sin(t);
      ctx.save();
      ctx.globalAlpha=.76;
      ctx.fillStyle=`rgba(44,194,116,${.18+pulse*.16})`;
      ctx.fillRect(s.x+3,s.y+3,C.tile-6,C.tile-6);
      ctx.strokeStyle=P.green;ctx.lineWidth=2;ctx.shadowColor=P.green;ctx.shadowBlur=Math.round(10+pulse*8);
      ctx.strokeRect(s.x+5,s.y+5,C.tile-10,C.tile-10);
      ctx.fillStyle=P.green;
      ctx.fillRect(s.x+C.tile/2-3,s.y+10,6,C.tile-20);
      ctx.fillRect(s.x+10,s.y+C.tile/2-3,C.tile-20,6);
      ctx.restore();
      if(md(tile,focus)<=1)label("REGENERATION · +1 HP / 3 SEC",s,P.green);
    }
  }

  /* renderView calls drawSpecialObjects, not drawItems. Hook the function that
   * is actually in the live render path so the regeneration tile cannot vanish. */
  if(typeof drawSpecialObjects==="function"){
    const old=drawSpecialObjects;
    drawSpecialObjects=function drawSpecialObjectsV135(){
      const result=old.apply(this,arguments);
      drawRegenTiles();
      return result;
    };
  }else if(typeof drawItems==="function"){
    const old=drawItems;
    drawItems=function drawItemsV135(){const result=old.apply(this,arguments);drawRegenTiles();return result};
  }

  const enemyRows={
    scout:["a",0],ambusher:["a",1],hunter:["a",2],guard:["a",3],ghost:["a",4],
    ranger:["b",0],charger:["b",1],root:["b",2],cook:["b",3],firebreather:["b",4],
    spider:["h",0],skeleton:["h",1],knight:["h",2],guardian:["h",3],warden:["h",4]
  };

  function atlasEnemy(e,cx,cy){
    if(e.follower||e.deathStalker||e.treasureGoblin)return false;
    const kind=e.hordeWarden?"warden":e.exitWarden?"warden":e.kind,row=enemyRows[kind];
    if(!row)return false;
    const image=assets[row[0]];
    if(!image.complete||!image.naturalWidth)return false;
    const attacking=(e.meleeSwingMs||0)>0||(e.chargeTelegraphMs||0)>0;
    const walking=e.aiState==="chase"||e.aiState==="search";
    const frame=attacking?4:walking?2+(Math.floor(performance.now()/170)%2):Math.floor(performance.now()/620)%2;
    const facing=(e.facing?.x||1)<0?-1:1;
    const sx=frame*CELL+FRAME_GUTTER,sy=row[1]*CELL+FRAME_GUTTER,sw=CELL-FRAME_GUTTER*2,sh=CELL-FRAME_GUTTER*2;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(cx),Math.round(cy));ctx.scale(facing,1);
    ctx.shadowColor=e.hordeWarden?P.red:e.champion?P.gold:"rgba(0,0,0,.55)";
    ctx.shadowBlur=e.hordeWarden?18:e.champion?10:4;
    ctx.drawImage(image,sx,sy,sw,sh,-28,-30,56,56);
    if(e.flash>0){ctx.globalCompositeOperation="screen";ctx.globalAlpha=Math.min(.6,e.flash/200);ctx.fillStyle="#fff";ctx.fillRect(-18,-24,36,43)}
    ctx.restore();
    return true;
  }

  if(typeof drawPixelEnemySprite==="function"){
    const old=drawPixelEnemySprite;
    drawPixelEnemySprite=function drawPixelEnemySpriteV135(e,cx,cy){
      if(!atlasEnemy(e,cx,cy))return old.apply(this,arguments);
    };
  }

  /* The 32px player sheet has no guard pixels between neighbouring animation
   * cells. Copy each frame through a transparent one-pixel gutter so a browser
   * can never expose part of the previous/next animation at a frame boundary. */
  function installExplorerFrameGutters(){
    try{
      if(typeof lostSizzlerPixelAssets==="undefined")return;
      const source=lostSizzlerPixelAssets.explorer;
      if(!source||source.__ccgV135Guttered)return;
      const build=()=>{
        if(!source.naturalWidth||!source.naturalHeight||source.naturalWidth%32||source.naturalHeight%32)return;
        const canvas=document.createElement("canvas");canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
        const g=canvas.getContext("2d");if(!g)return;g.imageSmoothingEnabled=false;g.clearRect(0,0,canvas.width,canvas.height);
        for(let y=0;y<source.naturalHeight;y+=32)for(let x=0;x<source.naturalWidth;x+=32)g.drawImage(source,x+1,y+1,30,30,x+1,y+1,30,30);
        const clean=new Image();clean.onload=()=>{clean.__ccgV135Guttered=true;lostSizzlerPixelAssets.explorer=clean};clean.src=canvas.toDataURL("image/png");
      };
      if(source.complete)build();else source.addEventListener("load",build,{once:true});
    }catch(error){console.warn("[Lost Sizzler V10.35] player sprite gutter pass skipped",error)}
  }
  installExplorerFrameGutters();

  function envRow(d){return d.sigilGate?3:d.type==="switch"?2:d.type==="bronze"?1:0}

  function overlayAtlasDoors(){
    const image=assets.environment;if(!image.complete||!image.naturalWidth)return;
    const t=performance.now();
    for(const d of host?.doors||[]){
      if(d.type==="secret"||!visibleTo(focus,d.x,d.y))continue;
      const duration=Math.max(1,(d.openAt||0)-(d.openingStart||0));
      const progress=d.open?1:d.opening?Math.max(0,Math.min(1,(t-(d.openingStart||t))/duration)):0;
      const frame=Math.max(0,Math.min(5,Math.round(progress*5))),s=ws(d.x,d.y);
      const sx=frame*CELL+FRAME_GUTTER,sy=envRow(d)*CELL+FRAME_GUTTER,sw=CELL-FRAME_GUTTER*2,sh=CELL-FRAME_GUTTER*2;
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(s.x+C.tile/2),Math.round(s.y+C.tile/2));if(d.orientation!=="horizontal")ctx.rotate(Math.PI/2);
      ctx.drawImage(image,sx,sy,sw,sh,-30,-30,60,60);ctx.restore();
      if(md(d,focus)<=2){
        const text=d.sigilGate&&d.locked?"REINFORCED SIGIL GATE":d.locked?(d.type==="switch"?"SWITCH GATE":d.type==="bronze"?"LOCKED BRONZE DOOR":"SEALED DOOR"):d.open?"OPEN DOOR":d.opening?"DOOR OPENING…":"CLOSED DOOR";
        label(text,{x:s.x,y:s.y-2},d.locked?P.gold:d.open?P.green:P.cyan);
      }
    }
  }

  if(typeof drawDoors==="function"){
    const old=drawDoors;
    drawDoors=function drawDoorsV135AtlasOnly(){
      /* Keep the masonry renderer only for secret walls. Normal/bronze/switch/
       * sigil doors are atlas-only; this removes the legacy door underneath. */
      const all=host?.doors||[];
      const secrets=all.filter(d=>d.type==="secret");
      if(secrets.length){
        try{host.doors=secrets;old.apply(this,arguments)}finally{host.doors=all}
      }
      overlayAtlasDoors();
    };
  }

  function overlayAtlasTorches(){
    const image=assets.environment;if(!image.complete||!image.naturalWidth)return;
    const frame=Math.floor(performance.now()/115)%6;
    const sx=frame*CELL+FRAME_GUTTER,sy=4*CELL+FRAME_GUTTER,sw=CELL-FRAME_GUTTER*2,sh=CELL-FRAME_GUTTER*2;
    for(const l of world?.wallLights||[]){
      if(!visibleTo(focus,l.x,l.y)&&md(focus,l)>12)continue;
      const s=ws(l.x,l.y);
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,sx,sy,sw,sh,Math.round(s.x-3),Math.round(s.y-16),48,48);ctx.restore();
    }
  }

  if(typeof drawWallLights==="function"){
    drawWallLights=function drawWallLightsV135AtlasOnly(){overlayAtlasTorches()};
  }

  if(typeof render==="function"){
    const old=render;
    render=function renderV135Copyright(){
      /* Tiny residual shake values used to leave a visible random tremble for
       * several extra frames. End the effect once it is below a useful pixel. */
      if(typeof shake!=="undefined"&&shake>0&&shake<1.25)shake=0;
      const result=old.apply(this,arguments);
      if(mode==="playing"){
        ctx.save();ctx.font='bold 10px "Courier New",monospace';ctx.textAlign="right";ctx.fillStyle="rgba(250,244,255,.55)";ctx.shadowColor="#030205";ctx.shadowBlur=4;
        ctx.fillText("© 2026 CHEEKY COMMODORE GAMER",canvas.width-12,canvas.height-10);ctx.restore();
      }
      return result;
    };
  }

  window.CCGLostSizzlerQualityV135={
    validateDoorAccess,expelSanctuaryEnemies,installSanctuaryTiles,ensureSanctuaryTiles,purgeCampingHazards,inSanctuary,
    get assets(){return assets}
  };
})();
