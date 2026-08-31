/* The Lost Sizzler V10.41 r51 — visual, lighting, character and menu overhaul.
 *
 * Presentation only. This layer never changes coordinates, hitboxes, health,
 * damage, AI, inventory, saves, score or network authority. It wraps the
 * established player/enemy renderers and enhances the existing DOM/menu.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R51_VISUAL_UI_OVERHAUL__)return;
  window.__CCG_LOST_SIZZLER_V141_R51_VISUAL_UI_OVERHAUL__=true;

  const STYLE_PATH="css/v10-41-r51-visual-ui-overhaul.css";
  const STARTUP_DELAY_MS=2200;
  const INSTALL_POLL_MS=1500;
  const LIGHTING_POLL_MS=250;
  const state={startupTimer:0,installTimer:0,lightingTimer:0,playerSource:null,playerWrapper:null,enemySource:null,enemyWrapper:null,playerFrames:0,enemyFrames:0,attackFx:0,hitFx:0,menuEnhanced:false,lightingUpdates:0,lastTheme:"",lastError:""};
  const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
  const reduced=()=>document.body?.classList?.contains("ccg-reduced-motion")||(()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(_){return false}})();
  const performanceTier=()=>String(document.body?.dataset?.v141R47PerformanceTier||"normal");
  const constrained=()=>performanceTier()!=="normal";
  const severePressure=()=>performanceTier()==="severe";
  const activeGameplay=()=>document.body?.dataset?.runActive==="true";
  const now=()=>performance.now();

  function installStylesheet(){
    if(document.querySelector('link[data-ccg-v141-r51-style="true"]'))return true;
    const rev=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||"latest"),link=document.createElement("link");link.rel="stylesheet";link.href=`${STYLE_PATH}?v=${encodeURIComponent(rev)}`;link.dataset.ccgV141R51Style="true";document.head.appendChild(link);return true
  }

  function buttonMeta(id,kicker,desc){const el=document.getElementById(id);if(!el)return;el.dataset.r51Kicker=kicker;el.dataset.r51Desc=desc}
  function enhanceMenu(){
    const menu=document.getElementById("menu"),panel=menu?.querySelector(".panel");if(!panel)return false;
    panel.classList.add("r51-menu-panel");
    buttonMeta("solo-btn","SOLO DUNGEON","Five floors · full progression · local save");
    buttonMeta("tutorial-zone-btn","LEARN THE DUNGEON","Controls, combat, items and objectives");
    buttonMeta("create-btn","ONLINE CO-OP","Up to four players · shared dungeon expedition");
    buttonMeta("horde-mode-btn","ONLINE SURVIVAL","Up to four players · dedicated Horde server");
    buttonMeta("saboteurs-mode-btn","ONLINE VERSUS","Two players · traps, sabotage and score");
    buttonMeta("continue-save-btn","CONTINUE","Resume your saved Solo floor checkpoint");
    buttonMeta("daily-btn","WEEKLY CHALLENGE","Shared seed · one ranked attempt per account");
    buttonMeta("split-btn","LOCAL TWO PLAYER","Two controllers or shared keyboard");
    if(!document.getElementById("ccg-r51-menu-guide")){
      const guide=document.createElement("div");guide.id="ccg-r51-menu-guide";guide.setAttribute("aria-label","Menu quick guide");guide.innerHTML="<span><b>SOLO</b> saves locally + cloud when signed in</span><span><b>ONLINE</b> room code remains your rejoin key</span><span><b>CONTROLLER</b> D-pad/stick + A works in menus</span><span><b>OPTIONS</b> accessibility and audio are stored in this browser</span>";
      panel.querySelector(".mode-select-label")?.insertAdjacentElement("beforebegin",guide)
    }
    const modeButtons=panel.querySelectorAll(".game-mode-buttons button");for(const button of modeButtons){if(!button.getAttribute("type"))button.type="button";const desc=button.dataset.r51Desc;if(desc&&!button.getAttribute("aria-label"))button.setAttribute("aria-label",`${button.textContent.trim()}. ${desc}`)}
    state.menuEnhanced=true;document.body.dataset.v141R51Menu="true";return true
  }

  function colourForTheme(theme){
    const key=String(theme||"").toUpperCase();
    if(/EMBER|FIRE/.test(key))return"255,112,54";
    if(/MOSS|CRYPT|ROOT/.test(key))return"104,196,118";
    if(/SPIDER|VOID/.test(key))return"185,105,255";
    if(/SID|MODEM|WARP/.test(key))return"93,224,255";
    if(/ZZAP|ARCHIVE|TAPE|1541/.test(key))return"166,108,255";
    return"142,92,255"
  }
  function ensureLighting(){
    let host=document.querySelector(".canvas-wrap");if(!host)return null;host.classList.add("r51-canvas-wrap");let layer=document.getElementById("ccg-r51-world-lighting");if(!layer){layer=document.createElement("div");layer.id="ccg-r51-world-lighting";layer.setAttribute("aria-hidden","true");host.appendChild(layer)}return layer
  }
  function updateLighting(){
    const layer=ensureLighting();if(!layer)return false;
    layer.classList.toggle("r51-performance-constrained",constrained());
    if(severePressure()){state.lightingUpdates++;return true}
    let px=50,py=50,theme="";try{
      if(typeof p1!=="undefined"&&p1&&typeof ws==="function"&&typeof ctx!=="undefined"&&ctx?.canvas){const s=ws(num(p1.rx,p1.x),num(p1.ry,p1.y));px=Math.max(0,Math.min(100,(s.x+num(C?.tile,48)/2)/ctx.canvas.width*100));py=Math.max(0,Math.min(100,(s.y+num(C?.tile,48)/2)/ctx.canvas.height*100))}
      if(typeof world!=="undefined"&&typeof W!=="undefined"&&p1){const roomId=W.roomAt?.(world,Math.round(num(p1.x,p1.rx)),Math.round(num(p1.y,p1.ry))),room=world?.rooms?.[roomId];theme=room?.theme||""}
    }catch(error){state.lastError=String(error?.message||error)}
    layer.style.setProperty("--r51-light-x",`${px}%`);layer.style.setProperty("--r51-light-y",`${py}%`);layer.style.setProperty("--r51-ambient-rgb",colourForTheme(theme));layer.classList.toggle("r51-torch-live",(()=>{try{return num(p1?.torchMs)>0}catch(_){return false}})());state.lastTheme=theme;state.lightingUpdates++;return true
  }

  function playerScreen(p){try{const s=ws(num(p.rx,p.x),num(p.ry,p.y)),tile=num(C?.tile,48);return{x:s.x+tile/2,y:s.y+tile/2,tile}}catch(_){return null}}
  function drawPlayerBackdrop(p,kind){
    if(severePressure())return;const s=playerScreen(p);if(!s)return;const col=kind==="p2"?(P?.green||"#72ff9b"):kind==="remote"?(P?.cyan||"#6cecff"):(P?.gold||"#ffd85a"),torch=num(p?.torchMs)>0;
    ctx.save();const radius=s.tile*(torch?1.35:.72),g=ctx.createRadialGradient(s.x,s.y,2,s.x,s.y,radius);g.addColorStop(0,torch?"rgba(255,205,92,.18)":`${col}22`);g.addColorStop(.48,torch?"rgba(255,135,54,.075)":`${col}0c`);g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.fillRect(s.x-radius,s.y-radius,radius*2,radius*2);
    const moving=Math.abs(num(p?.x,p?.rx)-num(p?.rx))+Math.abs(num(p?.y,p?.ry)-num(p?.ry))>.025;if(moving&&!reduced()&&!constrained()){
      const phase=now()/95+(String(p?.id||kind).length%5),spread=8+Math.abs(Math.sin(phase))*4;ctx.globalAlpha=.18;ctx.fillStyle=col;for(let i=0;i<3;i++){const ox=(i-1)*spread*.55,oy=s.tile*.36+((i+Math.floor(phase))%2)*2;ctx.fillRect(Math.round(s.x+ox)-1,Math.round(s.y+oy),2,1)}
    }ctx.restore()
  }
  function drawPlayerOverlay(p,kind){
    if(severePressure())return;const s=playerScreen(p);if(!s)return;const col=kind==="p2"?(P?.green||"#72ff9b"):kind==="remote"?(P?.cyan||"#6cecff"):(P?.gold||"#ffd85a"),t=now(),swingMs=Math.max(1,num(p?._meleeSwingMs,260)),age=t-num(p?._meleeSwingAt,-Infinity),swing=age>=0&&age<swingMs;
    ctx.save();
    if(swing){const d=p?._meleeSwingDir||p?.dir||{x:1,y:0},base=Math.atan2(num(d.y),num(d.x,1)),progress=Math.max(0,Math.min(1,age/swingMs)),start=base-1.18+progress*.25,end=base+.72+progress*.45;ctx.globalAlpha=.52*(1-progress*.55);ctx.strokeStyle=p?._meleeSwingColour||p?.meleeWeapon?.colour||col;ctx.lineWidth=Math.max(2,s.tile*.055);ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=constrained()?0:10;ctx.beginPath();ctx.arc(s.x,s.y,s.tile*.48,start,end);ctx.stroke();if(!constrained()){ctx.globalAlpha=.24;ctx.lineWidth=1;ctx.strokeStyle="#fff";ctx.beginPath();ctx.arc(s.x,s.y,s.tile*.56,start+.08,end-.04);ctx.stroke()}state.attackFx++}
    if(num(p?.hitStunMs)>0){ctx.globalAlpha=.42;ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.shadowColor=P?.red||"#ff6868";ctx.shadowBlur=constrained()?0:14;ctx.beginPath();ctx.arc(s.x,s.y,s.tile*.42,0,Math.PI*2);ctx.stroke()}
    if(!constrained()&&(num(p?.dashMs)>0||num(p?._dashMs)>0)){ctx.globalAlpha=.22;ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x,s.y,s.tile*.38,0,Math.PI*2);ctx.stroke()}
    ctx.restore()
  }
  function playerTransform(p){
    if(reduced()||constrained())return{sx:1,sy:1,dy:0};const t=now(),moving=Math.abs(num(p?.x,p?.rx)-num(p?.rx))+Math.abs(num(p?.y,p?.ry)-num(p?.ry))>.025,swingMs=Math.max(1,num(p?._meleeSwingMs,260)),age=t-num(p?._meleeSwingAt,-Infinity),swing=age>=0&&age<swingMs;
    if(num(p?.hitStunMs)>0)return{sx:1.045,sy:.955,dy:1};
    if(swing){const q=Math.sin(Math.max(0,Math.min(1,age/swingMs))*Math.PI);return{sx:1+.055*q,sy:1-.045*q,dy:-1*q}}
    if(moving){const q=Math.sin(t/92);return{sx:1+.018*q,sy:1-.022*q,dy:-Math.abs(q)*.7}}
    return{sx:1,sy:1,dy:Math.sin(t/520)*.25}
  }

  function installPlayerWrapper(){
    const current=window.drawPlayer;if(typeof current!=="function")return false;if(current.__ccgV141R51VisualPolish){state.playerWrapper=current;return true}if(current===state.playerSource)return true;
    const wrapped=function drawPlayerV141R51(p,kind="p1"){
      state.playerFrames++;let s=null;try{s=playerScreen(p);drawPlayerBackdrop(p,kind)}catch(error){state.lastError=String(error?.message||error)}
      if(!s)return current.apply(this,arguments);const tr=playerTransform(p);ctx.save();ctx.translate(s.x,s.y+tr.dy);ctx.scale(tr.sx,tr.sy);ctx.translate(-s.x,-s.y);let result;try{result=current.apply(this,arguments)}finally{ctx.restore()}
      try{drawPlayerOverlay(p,kind)}catch(error){state.lastError=String(error?.message||error)}return result
    };
    wrapped.__ccgV141R51VisualPolish=true;wrapped.__ccgOriginal=current;window.drawPlayer=wrapped;state.playerSource=current;state.playerWrapper=wrapped;return true
  }

  function enemyScreenPoint(e){try{const s=enemyScreen(e),tile=num(C?.tile,48);return{x:s.x+tile/2,y:s.y+tile/2,tile}}catch(_){return null}}
  function enemyAccent(e){
    if(e?.deathStalker&&e?.voidStalker)return P?.red||"#ff6868";if(e?.exitWarden)return P?.gold||"#ffd85a";if(e?.guardian)return P?.red||"#ff6868";if(e?.champion)return P?.cyan||"#6cecff";if(e?.follower)return P?.gold||"#ffd85a";
    const map={spider:"#c38ed2",skeleton:"#e7d8a8",knight:"#b7c2d1",hunter:"#ffcb63",ambusher:"#ff82d1",ranger:"#79aaf0",root:"#9dc46f",firebreather:"#ff7a35",ghost:"#8edcff",charger:"#63d6ef"};return map[e?.kind]||"#a66cff"
  }
  function drawEnemyBackdrop(e){
    if(severePressure())return;const s=enemyScreenPoint(e);if(!s)return;const col=enemyAccent(e),elite=Boolean(e?.follower||e?.champion||e?.guardian||e?.exitWarden||e?.deathStalker);ctx.save();const r=s.tile*(elite?.78:.5),g=ctx.createRadialGradient(s.x,s.y,2,s.x,s.y,r);g.addColorStop(0,`${col}${elite?"20":"10"}`);g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.fillRect(s.x-r,s.y-r,r*2,r*2);
    if(!constrained()&&e?.aiState==="chase"){ctx.globalAlpha=elite?.28:.12;ctx.strokeStyle=col;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(s.x,s.y+s.tile*.33,s.tile*(elite?.34:.27),s.tile*.11,0,0,Math.PI*2);ctx.stroke()}ctx.restore()
  }
  function drawEnemyOverlay(e){
    if(severePressure())return;const s=enemyScreenPoint(e);if(!s)return;const col=enemyAccent(e),t=now();ctx.save();
    if(num(e?.flash)>0){const life=Math.max(.15,Math.min(1,num(e.flash)/180));ctx.globalAlpha=.72*life;ctx.strokeStyle="#fff";ctx.shadowColor=col;ctx.shadowBlur=constrained()?0:10;ctx.lineWidth=1.4;const rays=constrained()?3:6;for(let i=0;i<rays;i++){const a=t*.01+i*Math.PI/(rays/2),r1=s.tile*.22,r2=s.tile*(.33+.06*((i+2)%3));ctx.beginPath();ctx.moveTo(s.x+Math.cos(a)*r1,s.y+Math.sin(a)*r1);ctx.lineTo(s.x+Math.cos(a)*r2,s.y+Math.sin(a)*r2);ctx.stroke()}state.hitFx++}
    if(!constrained()&&(e?.follower||e?.champion||e?.guardian||e?.exitWarden)){const pulse=reduced()?.4:.28+.12*Math.sin(t/380);ctx.globalAlpha=pulse;ctx.strokeStyle=col;ctx.lineWidth=1;ctx.beginPath();ctx.arc(s.x,s.y,s.tile*.48,0,Math.PI*2);ctx.stroke()}
    ctx.restore()
  }
  function enemyTransform(e){
    if(reduced()||constrained())return{sx:1,sy:1,dy:0};const t=now(),walking=e?.aiState==="chase"||e?.aiState==="search",seed=String(e?.id||e?.kind||"").length;
    if(num(e?.flash)>0)return{sx:1.06,sy:.94,dy:1};
    if(walking){const q=Math.sin(t/105+seed);return{sx:1+.014*q,sy:1-.025*Math.abs(q),dy:-Math.abs(q)*.7}}
    return{sx:1,sy:1,dy:Math.sin(t/610+seed)*.18}
  }
  function installEnemyWrapper(){
    const current=window.drawEnemy;if(typeof current!=="function")return false;if(current.__ccgV141R51VisualPolish){state.enemyWrapper=current;return true}if(current===state.enemySource)return true;
    const wrapped=function drawEnemyV141R51(e){
      if(!e?.alive)return current.apply(this,arguments);state.enemyFrames++;let s=null;try{s=enemyScreenPoint(e);drawEnemyBackdrop(e)}catch(error){state.lastError=String(error?.message||error)}
      if(!s)return current.apply(this,arguments);const tr=enemyTransform(e);ctx.save();ctx.translate(s.x,s.y+tr.dy);ctx.scale(tr.sx,tr.sy);ctx.translate(-s.x,-s.y);let result;try{result=current.apply(this,arguments)}finally{ctx.restore()}
      try{drawEnemyOverlay(e)}catch(error){state.lastError=String(error?.message||error)}return result
    };
    wrapped.__ccgV141R51VisualPolish=true;wrapped.__ccgOriginal=current;window.drawEnemy=wrapped;state.enemySource=current;state.enemyWrapper=wrapped;return true
  }

  function install(){installStylesheet();enhanceMenu();ensureLighting();if(activeGameplay())updateLighting();const player=installPlayerWrapper(),enemy=installEnemyWrapper();document.body.dataset.v141R51Visual="true";return player&&enemy}
  function start(){
    if(state.startupTimer||state.installTimer)return;
    state.startupTimer=setTimeout(()=>{
      state.startupTimer=0;install();state.installTimer=setInterval(install,INSTALL_POLL_MS);state.lightingTimer=setInterval(()=>{if(activeGameplay())updateLighting()},LIGHTING_POLL_MS)
    },STARTUP_DELAY_MS)
  }
  window.CCGLostSizzlerV141R51VisualUIOverhaul={install,enhanceMenu,updateLighting,playerTransform,enemyTransform,performanceTier,get state(){return state}};
  start();
  addEventListener("pagehide",()=>{if(state.startupTimer)clearTimeout(state.startupTimer);if(state.installTimer)clearInterval(state.installTimer);if(state.lightingTimer)clearInterval(state.lightingTimer);state.startupTimer=state.installTimer=state.lightingTimer=0},{once:true});
})();
