/* The Lost Sizzler V10.41 — sanctuary lake scenes, AZALEA and map marker polish. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_SANCTUARY_AZALEA__)return;
  window.__CCG_LOST_SIZZLER_V141_SANCTUARY_AZALEA__=true;

  const state={installed:false,startWrapped:false,updateWrapped:false,renderWrapped:false,enemyWrapped:false,radarWrapped:false,timer:0,sceneKey:"",greetings:new Map()};
  const cellKey=(x,y)=>`${Math.round(x)},${Math.round(y)}`;
  const md=(a,b)=>Math.abs(Number(a?.x||0)-Number(b?.x||0))+Math.abs(Number(a?.y||0)-Number(b?.y||0));

  function applyAzaleaDefinition(){
    const rows=window.CCG_CONFIG?.followerElites;
    if(Array.isArray(rows)){
      const row=rows.find(entry=>String(entry?.name||"").toLowerCase()==="parsnip celery")||rows.find(entry=>String(entry?.name||"").toUpperCase()==="AZALEA");
      if(row){Object.assign(row,{name:"AZALEA",initials:"AZ",kind:"root",hp:7,armor:4,avatar:"",musicKey:row.musicKey||"parsnip-celery",strength:"Root projectiles pin down open lanes while AZALEA keeps pressure from range.",weakness:"Walls stop the shots; break line of sight and close from cover."})}
    }
    const overrides=window.CCG_ASSET_OVERRIDES?.images?.namedEnemies;
    if(overrides&&typeof overrides==="object"){
      if(!Object.prototype.hasOwnProperty.call(overrides,"AZALEA"))overrides.AZALEA=overrides["Parsnip Celery"]??null;
      delete overrides["Parsnip Celery"];
    }
  }

  function roomDoors(room){
    return (host?.doors||[]).filter(door=>door?.type!=="secret"&&(Number(door.roomId)===Number(room.id)||(
      door.x>=room.x-1&&door.x<=room.x+room.w+1&&door.y>=room.y-1&&door.y<=room.y+room.h+1
    )));
  }

  function reserveLane(set,a,b,width=1){
    if(!a||!b)return;
    const add=(x,y)=>{for(let oy=-width;oy<=width;oy++)for(let ox=-width;ox<=width;ox++)set.add(cellKey(x+ox,y+oy))};
    let x=Math.round(a.x),y=Math.round(a.y),tx=Math.round(b.x),ty=Math.round(b.y);
    add(x,y);
    while(x!==tx){x+=Math.sign(tx-x);add(x,y)}
    while(y!==ty){y+=Math.sign(ty-y);add(x,y)}
  }

  function floorCell(room,x,y){
    return x>=room.x+1&&x<=room.x+room.w-1&&y>=room.y+1&&y<=room.y+room.h-1&&world?.map?.[y]?.[x]===0;
  }

  function sceneFor(room){
    const regen=(host?.sanctuaryRegeneration||[]).find(tile=>Number(tile.roomId)===Number(room.id));
    const centre=regen||{x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.h/2)};
    const reserved=new Set();
    reserveLane(reserved,centre,centre,1);
    for(const door of roomDoors(room)){
      const doorway={x:Math.max(room.x+1,Math.min(room.x+room.w-1,door.x)),y:Math.max(room.y+1,Math.min(room.y+room.h-1,door.y))};
      reserveLane(reserved,doorway,centre,1);
    }
    for(const tile of host?.sanctuaryRegeneration||[])if(Number(tile.roomId)===Number(room.id))reserveLane(reserved,tile,tile,1);
    const blocked=new Set((host?.blockingDecor||[]).map(q=>cellKey(q.x,q.y)));
    const dims=[[4,3],[3,3],[3,2],[2,2]];
    let lake=[];
    outer:for(const [w,h] of dims){
      for(let y=room.y+2;y<=room.y+room.h-h-1;y++)for(let x=room.x+2;x<=room.x+room.w-w-1;x++){
        const cells=[];let good=true;
        for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
          if(!floorCell(room,xx,yy)||reserved.has(cellKey(xx,yy))||blocked.has(cellKey(xx,yy))){good=false;break}
          cells.push({x:xx,y:yy});
        }
        if(good){lake=cells;break outer}
      }
    }
    if(!lake.length)return null;
    const lakeSet=new Set(lake.map(q=>cellKey(q.x,q.y))),edge=[];
    for(const q of lake)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const x=q.x+dx,y=q.y+dy,k=cellKey(x,y);
      if(!lakeSet.has(k)&&floorCell(room,x,y)&&!reserved.has(k)&&!blocked.has(k)&&!edge.some(v=>v.x===x&&v.y===y))edge.push({x,y});
    }
    const trees=edge.filter((_,i)=>i%2===0).slice(0,4);
    const dancerCandidates=edge.filter(q=>!trees.some(t=>t.x===q.x&&t.y===q.y));
    const dancers=dancerCandidates.slice(0,Math.min(2,dancerCandidates.length)).map((q,index)=>({...q,id:`sanctuary-dancer-${room.id}-${index+1}`,variant:index}));
    return{id:`sanctuary-scene-${room.id}`,roomId:room.id,lake,trees,dancers,regen:{x:centre.x,y:centre.y}};
  }

  function clearOldLakeCollision(){
    if(host?.blockingDecor)host.blockingDecor=host.blockingDecor.filter(row=>row?.type!=="sanctuaryLake");
    if(world?.decor)world.decor=world.decor.filter(row=>row?.type!=="sanctuaryLake");
  }

  function buildScenes(){
    if(!world||!host)return 0;
    clearOldLakeCollision();
    const scenes=[];
    for(const room of world.rooms||[]){if(!room?.sanctuary)continue;const scene=sceneFor(room);if(scene)scenes.push(scene)}
    host.sanctuaryScenes=scenes;
    host.blockingDecor=host.blockingDecor||[];world.decor=world.decor||[];
    for(const scene of scenes)for(const [index,q] of scene.lake.entries()){
      const id=`${scene.id}-water-${index}`;
      host.blockingDecor.push({id,x:q.x,y:q.y,type:"sanctuaryLake",roomId:scene.roomId,hp:999,maxHp:999,structural:true});
      world.decor.push({id,x:q.x,y:q.y,type:"sanctuaryLake",roomId:scene.roomId,blocking:true,structural:true,hp:999,maxHp:999});
    }
    host.revision=(host.revision||0)+1;
    state.sceneKey=`${run?.seed||"run"}|${run?.floor||1}|${scenes.length}`;
    return scenes.length;
  }

  function visible(q){try{return !focus||typeof visibleTo!=="function"||visibleTo(focus,q.x,q.y)}catch(_){return true}}

  function drawLake(scene){
    const time=performance.now();
    for(const [index,q] of scene.lake.entries()){
      if(!visible(q))continue;const s=ws(q.x,q.y),wave=Math.sin(time/420+index*1.7);
      ctx.save();ctx.fillStyle="#092f49";ctx.fillRect(s.x+2,s.y+2,C.tile-4,C.tile-4);ctx.fillStyle="#0d5570";ctx.fillRect(s.x+4,s.y+5,C.tile-8,C.tile-10);ctx.globalAlpha=.48;ctx.strokeStyle="#6cecff";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(s.x+6,s.y+12+wave*2);ctx.lineTo(s.x+C.tile-7,s.y+12-wave*2);ctx.moveTo(s.x+9,s.y+29-wave*2);ctx.lineTo(s.x+C.tile-10,s.y+29+wave*2);ctx.stroke();
      const fishX=s.x+10+((time/22+index*13)%(Math.max(12,C.tile-20))),fishY=s.y+17+((index*9)%14)+Math.sin(time/330+index)*3;ctx.globalAlpha=.9;ctx.fillStyle=index%2?"#ffd85a":"#ff8b5e";ctx.fillRect(Math.round(fishX),Math.round(fishY),6,3);ctx.fillRect(Math.round(fishX)-3,Math.round(fishY)-1,3,5);ctx.restore();
    }
  }

  function drawTree(q,index){
    if(!visible(q))return;const s=ws(q.x,q.y),sway=Math.round(Math.sin(performance.now()/700+index)*2),cx=s.x+C.tile/2;
    ctx.save();ctx.fillStyle="#6e4527";ctx.fillRect(cx-4,s.y+21,8,20);ctx.fillStyle="#184c32";ctx.fillRect(cx-15+sway,s.y+7,30,17);ctx.fillStyle="#257044";ctx.fillRect(cx-10-sway,s.y+2,22,15);ctx.fillStyle="#55a85c";ctx.fillRect(cx-5+sway,s.y+5,9,7);ctx.restore();
  }

  function drawDancer(q){
    if(!visible(q))return;const s=ws(q.x,q.y),phase=performance.now()/230+q.variant*2,step=Math.round(Math.sin(phase)*2),cx=s.x+C.tile/2;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.shadowColor="#ff5bae";ctx.shadowBlur=7;
    ctx.fillStyle=q.variant?"#6d1d63":"#28142d";ctx.fillRect(cx-7+step,s.y+25,14,12);ctx.fillStyle="#d98979";ctx.fillRect(cx-6+step,s.y+13,12,13);
    // Adult pin-up styling: low-cut but clothed, kept deliberately non-explicit.
    ctx.fillStyle="#c52f75";ctx.fillRect(cx-6+step,s.y+19,5,8);ctx.fillRect(cx+1+step,s.y+19,5,8);ctx.fillStyle="#8b174d";ctx.fillRect(cx-1+step,s.y+22,2,5);
    ctx.fillStyle="#d98979";ctx.fillRect(cx-9+step,s.y+19,3,12);ctx.fillRect(cx+6+step,s.y+19,3,12);ctx.fillStyle="#15121b";ctx.fillRect(cx-6+step,s.y+37,5,5);ctx.fillRect(cx+2+step,s.y+37,5,5);
    ctx.fillStyle=q.variant?"#e349a7":"#7b2cff";ctx.fillRect(cx-7+step,s.y+7,14,7);ctx.fillRect(cx-8+step,s.y+10,4,9);ctx.fillStyle="#f0b097";ctx.fillRect(cx-5+step,s.y+10,10,8);ctx.fillStyle="#211526";ctx.fillRect(cx-3+step,s.y+13,2,2);ctx.fillRect(cx+2+step,s.y+13,2,2);ctx.restore();
  }

  function drawSunlight(scene){
    const target=scene.lake[Math.floor(scene.lake.length/2)]||scene.regen;if(!target||!visible(target))return;const s=ws(target.x,target.y),width=C.tile*2.4;
    ctx.save();const g=ctx.createLinearGradient(s.x,s.y-C.tile*3,s.x,s.y+C.tile*2);g.addColorStop(0,"rgba(255,246,190,.25)");g.addColorStop(1,"rgba(255,246,190,0)");ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(s.x+C.tile/2-width*.2,s.y-C.tile*3);ctx.lineTo(s.x+C.tile/2+width*.2,s.y-C.tile*3);ctx.lineTo(s.x+C.tile/2+width/2,s.y+C.tile*2);ctx.lineTo(s.x+C.tile/2-width/2,s.y+C.tile*2);ctx.closePath();ctx.fill();ctx.restore();
  }

  function drawScenes(){
    for(const scene of host?.sanctuaryScenes||[]){drawSunlight(scene);drawLake(scene);scene.trees.forEach(drawTree);scene.dancers.forEach(drawDancer)}
  }

  function updateGreetings(){
    if(mode!=="playing")return;const now=Date.now();
    for(const player of typeof localPlayers==="function"?localPlayers():[p1].filter(Boolean))for(const scene of host?.sanctuaryScenes||[])for(const dancer of scene.dancers){
      if(player.x!==dancer.x||player.y!==dancer.y)continue;const key=`${player.id}|${dancer.id}`;if(now-Number(state.greetings.get(key)||0)<5500)continue;state.greetings.set(key,now);
      try{showToast("SANCTUARY GREETING","Hello big boy","pink",2600)}catch(_){try{say("Hello big boy","pink")}catch(__){}}
    }
  }

  function drawAzalea(e,cx,cy){
    const name=String(e?.follower?.name||e?.championName||e?.name||"").toUpperCase();if(name!=="AZALEA")return false;
    const phase=performance.now()/210,bob=Math.round(Math.sin(phase)*1.5),facing=(e.facing?.x||1)<0?-1:1;
    ctx.save();ctx.translate(Math.round(cx),Math.round(cy+bob));ctx.scale(facing,1);ctx.imageSmoothingEnabled=false;ctx.shadowColor="#ff4fc7";ctx.shadowBlur=13;
    ctx.fillStyle="#15131c";ctx.fillRect(-13,-4,26,20);ctx.fillStyle="#30243d";ctx.fillRect(-10,-9,20,15);ctx.fillStyle="#6d2675";ctx.fillRect(-12,-5,5,15);ctx.fillRect(7,-5,5,15);
    ctx.fillStyle="#d49a91";ctx.fillRect(-7,-21,14,13);ctx.fillStyle="#241522";ctx.fillRect(-4,-16,2,2);ctx.fillRect(3,-16,2,2);
    ctx.fillStyle="#b51a89";ctx.fillRect(-10,-27,19,8);ctx.fillStyle="#f04bc0";ctx.fillRect(-8,-29,15,5);ctx.fillRect(6,-24,6,14);ctx.fillStyle="#7e155f";ctx.fillRect(-11,-24,5,13);
    ctx.fillStyle="#79678b";ctx.fillRect(-15,0,5,14);ctx.fillRect(10,0,5,14);ctx.fillStyle="#0d0c12";ctx.fillRect(-9,16,7,8);ctx.fillRect(3,16,7,8);
    ctx.fillStyle="#ff4fc7";ctx.fillRect(-2,-2,4,4);ctx.restore();return true;
  }

  function drawRadarOverlay(p){
    const canvas=document.getElementById("radar-canvas"),g=canvas?.getContext?.("2d");if(!canvas||!g||!world||!p)return;
    const rw=canvas.width,rh=canvas.height,pad=9,cols=Math.min(C.worldWidth,Math.max(46,Math.floor(rw/6))),rows=Math.min(C.worldHeight,Math.max(24,Math.floor(rh/5.5))),minX=Math.max(0,Math.min(C.worldWidth-cols,Math.round(p.x-cols/2))),minY=Math.max(0,Math.min(C.worldHeight-rows,Math.round(p.y-rows/2))),sc=Math.min((rw-pad*2)/cols,(rh-pad*2)/rows),mw=cols*sc,mh=rows*sc,ox=(rw-mw)/2,oy=(rh-mh)/2;
    const toScreen=q=>({x:ox+(Number(q.x)-minX+.5)*sc,y:oy+(Number(q.y)-minY+.5)*sc});
    const edgePoint=q=>{const raw=toScreen(q);return{x:Math.max(ox+5,Math.min(ox+mw-5,raw.x)),y:Math.max(oy+5,Math.min(oy+mh-5,raw.y))}};
    g.save();
    for(const marker of host?.progressionRecoveryMarkers||[]){if(!marker?.active)continue;const s=edgePoint(marker);g.fillStyle=marker.kind==="exitSigil"?"#b978ff":"#ffd85a";g.strokeStyle="#fff";g.lineWidth=1;g.translate(s.x,s.y);g.rotate(Math.PI/4);g.fillRect(-4,-4,8,8);g.strokeRect(-4,-4,8,8);g.rotate(-Math.PI/4);g.translate(-s.x,-s.y)}
    const s=toScreen(p);g.fillStyle="#6cecff";g.strokeStyle="#071017";g.lineWidth=2;g.beginPath();g.moveTo(s.x,s.y-6);g.lineTo(s.x+6,s.y+5);g.lineTo(s.x-6,s.y+5);g.closePath();g.fill();g.stroke();g.restore();
  }

  function wrapRuntime(){
    if(!state.startWrapped&&typeof startWorld==="function"){
      const original=startWorld;startWorld=function startWorldV141SanctuaryScenes(){const result=original.apply(this,arguments);try{buildScenes()}catch(error){console.warn("[Lost Sizzler V10.41] sanctuary scene build failed",error)}return result};state.startWrapped=true;
    }
    if(!state.updateWrapped&&typeof update==="function"){
      const original=update;update=function updateV141SanctuaryScenes(dt){const result=original.apply(this,arguments);try{updateGreetings()}catch(_){}return result};state.updateWrapped=true;
    }
    if(!state.renderWrapped&&typeof drawSpecialObjects==="function"){
      const original=drawSpecialObjects;drawSpecialObjects=function drawSpecialObjectsV141SanctuaryScenes(){const result=original.apply(this,arguments);try{drawScenes()}catch(_){}return result};state.renderWrapped=true;
    }
    if(!state.enemyWrapped&&typeof drawPixelEnemySprite==="function"){
      const original=drawPixelEnemySprite;drawPixelEnemySprite=function drawPixelEnemySpriteV141Azalea(e,cx,cy){if(drawAzalea(e,cx,cy))return;return original.apply(this,arguments)};state.enemyWrapped=true;
    }
    if(!state.radarWrapped&&typeof renderRadarPanel==="function"){
      const original=renderRadarPanel;renderRadarPanel=function renderRadarPanelV141PlayerMarker(p){const result=original.apply(this,arguments);try{drawRadarOverlay(p)}catch(_){}return result};state.radarWrapped=true;
    }
  }

  function install(){
    applyAzaleaDefinition();const gate=window.CCGLostSizzlerReleaseGate;if(gate&&!gate.state?.ready)return false;wrapRuntime();
    if(!state.startWrapped||!state.updateWrapped||!state.enemyWrapped||!state.radarWrapped)return false;
    if(world&&host&&!host.sanctuaryScenes)try{buildScenes()}catch(_){}
    state.installed=true;document.body.dataset.v141SanctuaryAzalea="true";return true;
  }

  state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},100);install();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141SanctuaryAzalea={buildScenes,drawScenes,drawAzalea,drawRadarOverlay,get state(){return state}};
})();