/* C64 Dungeon Carnage V10.42 r46 — final visual maximisation layer.
 * Presentation only. Reuses established room/biome metadata and render owners.
 * No collision, combat, AI, progression, inventory, save or economy ownership.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R46_FINAL_VISUAL_POLISH__)return;
  window.__CCG_LOST_SIZZLER_V142_R46_FINAL_VISUAL_POLISH__=true;

  const STYLE_PATH="css/v10-42-r46-final-visual-polish.css";
  const state={renderInstalls:0,trapInstalls:0,roomEntries:0,overlayFrames:0,trapFrames:0,lastRoom:-1,lastBiome:""};
  const seenRooms=new Set();
  const entries=new Map();
  const PALETTE={
    threshold:{accent:"#6cceb2",soft:"rgba(108,206,178,.16)",deep:"rgba(40,92,82,.28)"},
    iron:{accent:"#cf894c",soft:"rgba(207,137,76,.16)",deep:"rgba(104,61,28,.30)"},
    bone:{accent:"#7ab069",soft:"rgba(122,176,105,.16)",deep:"rgba(48,84,45,.30)"},
    ash:{accent:"#ff6734",soft:"rgba(255,103,52,.17)",deep:"rgba(124,42,20,.32)"},
    sigil:{accent:"#b068ff",soft:"rgba(176,104,255,.17)",deep:"rgba(76,39,128,.32)"}
  };
  const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
  const active=()=>document.body?.dataset?.runActive==="true";
  const constrained=()=>String(document.body?.dataset?.v141R47PerformanceTier||"normal")!=="normal";
  const severe=()=>String(document.body?.dataset?.v141R47PerformanceTier||"normal")==="severe";
  const reduced=()=>document.body?.classList?.contains("ccg-reduced-motion")||(()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(_){return false}})();

  function installStylesheet(){
    if(document.querySelector('link[data-ccg-v142-r46-visual="true"]'))return true;
    const cache=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||"latest");
    const link=document.createElement("link");link.rel="stylesheet";link.href=STYLE_PATH+"?v="+encodeURIComponent(cache);link.dataset.ccgV142R46Visual="true";document.head.appendChild(link);return true
  }

  function roomProfile(player){
    try{
      if(!player||typeof W==="undefined"||typeof world==="undefined")return null;
      const roomId=W.roomAt(world,Math.round(num(player.rx,player.x)),Math.round(num(player.ry,player.y)));
      const room=world?.rooms?.[roomId];if(!room)return null;
      const env=room.v142Environment||{},grammar=room.v142RoomGrammar||env.roomGrammar||{};
      const biome=String(env.biome||grammar.biome||"threshold").toLowerCase();
      const palette=PALETTE[biome]||PALETTE.threshold;
      return{roomId,room,env,grammar,biome,palette,
        identity:String(grammar.biomeIdentity||host?.v142RoomGrammar?.identity||env.biomeName||"DUNGEON"),
        archetype:String(grammar.archetype||env.role||"chamber"),
        landmark:String(grammar.landmark||env.variant||""),
        routeMood:String(grammar.routeMood||""),
        floor:Math.max(1,Number(run?.floor||1))
      };
    }catch(_){return null}
  }

  function syncHud(profile,player){
    if(!profile||player!==globalThis.p1)return false;
    const body=document.body;if(!body)return false;
    if(body.dataset.v142R46Biome!==profile.biome){
      body.dataset.v142R46Biome=profile.biome;
      body.style.setProperty("--r46-accent",profile.palette.accent);
      body.style.setProperty("--r46-accent-soft",profile.palette.soft);
      body.style.setProperty("--r46-accent-deep",profile.palette.deep);
      state.lastBiome=profile.biome;
    }
    body.dataset.v142R46RoomRole=String(profile.env?.role||"chamber");
    return true
  }

  function noteEntry(player,profile){
    if(!profile||!player)return;
    const playerKey=String(player.id||(player===globalThis.p2?"P2":"P1")),key=profile.floor+":"+profile.roomId;
    const current=entries.get(playerKey);
    if(current?.key===key)return;
    const first=!seenRooms.has(key);seenRooms.add(key);
    entries.set(playerKey,{key,at:performance.now(),first});
    state.roomEntries++;state.lastRoom=profile.roomId;
  }

  function drawViewFinish(player,viewBox){
    if(!active()||typeof ctx==="undefined"||!viewBox)return;
    const profile=roomProfile(player);if(!profile)return;
    syncHud(profile,player);noteEntry(player,profile);
    const entry=entries.get(String(player.id||(player===globalThis.p2?"P2":"P1")));
    const now=performance.now(),age=now-num(entry?.at,now),showEntry=Boolean(entry?.first&&age<3100);
    ctx.save();ctx.beginPath();ctx.rect(viewBox.x,viewBox.y,viewBox.w,viewBox.h);ctx.clip();

    // Cheap biome framing: four translucent edge strips, no extra simulation or offscreen canvas.
    const edge=severe()?1:2;ctx.globalAlpha=severe()?.32:.55;ctx.fillStyle=profile.palette.accent;
    ctx.fillRect(viewBox.x,viewBox.y,viewBox.w,edge);ctx.fillRect(viewBox.x,viewBox.y+viewBox.h-edge,viewBox.w,edge);
    ctx.fillRect(viewBox.x,viewBox.y,edge,viewBox.h);ctx.fillRect(viewBox.x+viewBox.w-edge,viewBox.y,edge,viewBox.h);

    if(showEntry){
      const fade=reduced()?1:Math.max(0,Math.min(1,age<350?age/350:(3100-age)/650));
      const x=viewBox.x+12,y=viewBox.y+12,w=Math.min(430,Math.max(250,viewBox.w*.58)),h=profile.landmark?58:44;
      ctx.globalAlpha=.88*fade;ctx.fillStyle="rgba(4,2,8,.90)";ctx.fillRect(x,y,w,h);
      ctx.globalAlpha=.9*fade;ctx.strokeStyle=profile.palette.accent;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
      ctx.textAlign="left";ctx.fillStyle=profile.palette.accent;ctx.font='bold 10px Consolas, "Courier New"';
      ctx.fillText("FLOOR "+profile.floor+"  ·  "+profile.identity.toUpperCase(),x+10,y+16);
      ctx.fillStyle="#f6f0ff";ctx.font='bold 13px Consolas, "Courier New"';
      ctx.fillText(profile.archetype.toUpperCase(),x+10,y+34);
      if(profile.landmark){ctx.fillStyle="#bdb2ca";ctx.font='10px Consolas, "Courier New"';ctx.fillText(profile.landmark.toUpperCase(),x+10,y+50)}
    }
    ctx.restore();state.overlayFrames++;
  }

  function installRenderView(){
    const current=window.renderView;if(typeof current!=="function")return false;
    if(current.__ccgV142R46FinalVisual)return true;
    const wrapped=function renderViewV142R46(player,viewBox){
      const result=current.apply(this,arguments);
      try{drawViewFinish(player,viewBox)}catch(_){}
      return result
    };
    wrapped.__ccgV142R46FinalVisual=true;wrapped.__ccgOriginal=current;window.renderView=wrapped;state.renderInstalls++;return true
  }

  function drawTrapTelegraph(){
    if(!active()||severe()||typeof ctx==="undefined")return;
    const now=performance.now(),traps=host?.traps||[];
    for(const trap of traps){
      if(!trap?.active||!visibleTo?.(focus,trap.x,trap.y))continue;
      let live=false;try{live=Boolean(SYS?.trapActive?.(trap,now))}catch(_){live=false}
      if(!live)continue;
      const s=ws(trap.x,trap.y),col=trap.kind==="fire"?"#ff7138":trap.kind==="shock"?"#66eaff":"#ff6578";
      const pulse=reduced()?.55:.48+.18*Math.sin(now/115+trap.x+trap.y);
      ctx.save();ctx.globalAlpha=pulse;ctx.strokeStyle=col;ctx.lineWidth=2;
      const m=4,l=8,x=s.x+m,y=s.y+m,r=s.x+C.tile-m,b=s.y+C.tile-m;
      ctx.beginPath();
      ctx.moveTo(x+l,y);ctx.lineTo(x,y);ctx.lineTo(x,y+l);
      ctx.moveTo(r-l,y);ctx.lineTo(r,y);ctx.lineTo(r,y+l);
      ctx.moveTo(x,b-l);ctx.lineTo(x,b);ctx.lineTo(x+l,b);
      ctx.moveTo(r-l,b);ctx.lineTo(r,b);ctx.lineTo(r,b-l);ctx.stroke();
      if(!constrained()){ctx.globalAlpha=.12;ctx.fillStyle=col;ctx.fillRect(s.x+3,s.y+3,C.tile-6,C.tile-6)}
      ctx.restore();state.trapFrames++;
    }
  }

  function installTrapWrapper(){
    const current=window.drawTraps;if(typeof current!=="function")return false;
    if(current.__ccgV142R46FinalVisual)return true;
    const wrapped=function drawTrapsV142R46(){const result=current.apply(this,arguments);try{drawTrapTelegraph()}catch(_){}return result};
    wrapped.__ccgV142R46FinalVisual=true;wrapped.__ccgOriginal=current;window.drawTraps=wrapped;state.trapInstalls++;return true
  }

  function install(){installStylesheet();installRenderView();installTrapWrapper();return true}
  install();
  addEventListener("ccg:v142-ready",install);
  document.addEventListener("ccg:floor-start",()=>{entries.clear();install()});

  window.CCGLostSizzlerV142R46FinalVisualPolish={
    version:"V10.42-r46",presentationOnly:true,simulationOwnership:false,collisionOwnership:false,
    combatOwnership:false,progressionOwnership:false,saveOwnership:false,economyOwnership:false,
    install,roomProfile,get state(){return state}
  };
})();