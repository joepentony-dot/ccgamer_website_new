/* The Lost Sizzler V10.41 r45 — Spy trap presentation finalizer.
 *
 * Spy-only visual layer for trap placement and trigger feedback.
 * - placement feedback is shown only to the agent who armed the hidden trap;
 * - triggered traps receive slot-specific visual treatment and written effects;
 * - remote Player 2 receives the same victim feedback as Player 1;
 * - no trap location is persistently exposed to the opposing player;
 * - gameplay rules, damage, counters and transport remain owned by r32/r35/r36.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R45_SPY_TRAP_PRESENTATION__)return;
  window.__CCG_LOST_SIZZLER_V141_R45_SPY_TRAP_PRESENTATION__=true;

  const MODE_ID="sizzler-saboteurs";
  const TICK_MS=40,EVENT_MEMORY=320,PLACED_MS=1450;
  const TRAPS=Object.freeze({
    powerBrick:Object.freeze({name:"BOMB",effect:"-2 HP · ITEMS DROPPED",tone:"bomb",duration:1900,glyph:"✹"}),
    spring:Object.freeze({name:"SPRING",effect:"-1 HP · SLOWED",tone:"spring",duration:3550,glyph:"↟"}),
    custard:Object.freeze({name:"WATER BUCKET",effect:"SLOWED · VISION HIT",tone:"water",duration:3000,glyph:"≋"})
  });

  const state={
    timer:0,installed:false,seen:new Set(),order:[],slotTimers:new Map(),
    placementVisuals:0,triggerVisuals:0,remoteVictimVisuals:0,hiddenRemotePlacements:0,lastEvent:""
  };

  const active=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const match=()=>active()?.state||null;
  const spyActive=()=>active()?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID;
  const actorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};
  const modelFor=id=>match()?.players?.find?.(row=>String(row?.id||"")===String(id||""))||null;
  const liveFor=id=>{try{return String(p1?.id||"")===String(id||"")?p1:remote?.get?.(id)||null}catch(_){return null}};
  const trapDef=id=>TRAPS[String(id||"")]||null;
  const now=()=>Date.now();

  function remember(key){
    if(!key||state.seen.has(key))return false;
    state.seen.add(key);state.order.push(key);
    while(state.order.length>EVENT_MEMORY){const old=state.order.shift();state.seen.delete(old)}
    return true
  }

  function slotFor(id){
    const m=match(),model=modelFor(id);let slot=Number(model?.slot||0);
    if(slot===1||slot===2)return slot;
    const index=(m?.players||[]).findIndex(row=>String(row?.id||"")===String(id||""));
    return index===1?2:1
  }

  function installStyles(){
    if(document.getElementById("ccg-spy-r45-trap-style"))return true;
    const style=document.createElement("style");style.id="ccg-spy-r45-trap-style";
    style.textContent=`
      .spy-r45-trap-fx{display:none;position:absolute;left:0;width:77%;height:50%;z-index:131;pointer-events:none;overflow:hidden;isolation:isolate;font-family:"Courier New",monospace}
      body[data-special-mode="sizzler-saboteurs"] .spy-r45-trap-fx[data-visible="true"]{display:block}
      .spy-r45-trap-fx[data-slot="1"]{top:0}.spy-r45-trap-fx[data-slot="2"]{bottom:0}
      .spy-r45-trap-fx .spy-r45-screen{position:absolute;inset:0;opacity:0;animation:spy-r45-screen .82s ease-out forwards}
      .spy-r45-trap-fx .spy-r45-burst{position:absolute;left:50%;top:50%;width:32px;height:32px;transform:translate(-50%,-50%);border-radius:50%;opacity:0;animation:spy-r45-burst .9s ease-out forwards}
      .spy-r45-trap-fx .spy-r45-glyph{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);font:900 clamp(36px,5vw,72px)/1 "Courier New",monospace;text-shadow:0 3px 8px #000;opacity:0;animation:spy-r45-glyph .78s cubic-bezier(.2,.8,.2,1) forwards}
      .spy-r45-trap-fx .spy-r45-card{position:absolute;left:50%;top:68%;transform:translate(-50%,-50%);min-width:min(440px,78%);padding:9px 14px;border:2px solid currentColor;background:rgba(3,4,9,.9);box-shadow:0 8px 28px rgba(0,0,0,.78);text-align:center;text-shadow:0 2px 3px #000;opacity:0;animation:spy-r45-card .28s .12s ease-out forwards}
      .spy-r45-trap-fx .spy-r45-card strong{display:block;font-size:clamp(13px,1.7vw,22px);letter-spacing:.06em}.spy-r45-trap-fx .spy-r45-card span{display:block;margin-top:3px;font:900 clamp(8px,1vw,12px)/1.3 "Courier New",monospace;color:#fff}
      .spy-r45-trap-fx[data-phase="placed"] .spy-r45-screen{background:radial-gradient(circle at 50% 52%,rgba(255,216,90,.18),transparent 34%)}
      .spy-r45-trap-fx[data-phase="placed"] .spy-r45-burst{border:3px solid #ffd85a;box-shadow:0 0 28px #ffd85a}.spy-r45-trap-fx[data-phase="placed"] .spy-r45-glyph,.spy-r45-trap-fx[data-phase="placed"] .spy-r45-card{color:#ffd85a}
      .spy-r45-trap-fx[data-tone="bomb"] .spy-r45-screen{background:radial-gradient(circle at 50% 50%,rgba(255,238,140,.62) 0 5%,rgba(255,84,44,.44) 16%,rgba(120,0,0,.3) 34%,transparent 62%);animation-name:spy-r45-bomb-screen}
      .spy-r45-trap-fx[data-tone="bomb"] .spy-r45-burst{border:5px solid #ff6b45;box-shadow:0 0 0 8px rgba(255,216,90,.35),0 0 50px #ff3d24}.spy-r45-trap-fx[data-tone="bomb"] .spy-r45-glyph,.spy-r45-trap-fx[data-tone="bomb"] .spy-r45-card{color:#ff8b68}
      .spy-r45-trap-fx[data-tone="spring"] .spy-r45-screen{background:repeating-linear-gradient(0deg,rgba(255,216,90,.08) 0 5px,transparent 5px 16px);animation-name:spy-r45-spring-screen}.spy-r45-trap-fx[data-tone="spring"] .spy-r45-burst{border:4px dashed #ffd85a;box-shadow:0 0 32px rgba(255,216,90,.8)}.spy-r45-trap-fx[data-tone="spring"] .spy-r45-glyph{color:#fff09a;animation-name:spy-r45-spring-glyph;animation-duration:.9s}.spy-r45-trap-fx[data-tone="spring"] .spy-r45-card{color:#ffd85a}
      .spy-r45-trap-fx[data-tone="water"]{backdrop-filter:blur(1.4px) saturate(.78)}.spy-r45-trap-fx[data-tone="water"] .spy-r45-screen{background:linear-gradient(165deg,rgba(108,236,255,.3),rgba(32,90,180,.16) 42%,transparent 76%);animation-name:spy-r45-water-screen}.spy-r45-trap-fx[data-tone="water"] .spy-r45-burst{border:4px solid #6cecff;box-shadow:0 0 34px rgba(108,236,255,.9)}.spy-r45-trap-fx[data-tone="water"] .spy-r45-glyph,.spy-r45-trap-fx[data-tone="water"] .spy-r45-card{color:#8cecff}
      .spy-r45-drops{display:none}.spy-r45-trap-fx[data-tone="water"] .spy-r45-drops{display:block;position:absolute;inset:-25% 0 0;background:repeating-linear-gradient(104deg,transparent 0 18px,rgba(190,249,255,.45) 19px 22px,transparent 23px 39px);animation:spy-r45-rain 1.15s linear infinite;opacity:.65}
      @keyframes spy-r45-screen{0%{opacity:0}20%{opacity:1}100%{opacity:0}}@keyframes spy-r45-burst{0%{opacity:.95;transform:translate(-50%,-50%) scale(.25)}100%{opacity:0;transform:translate(-50%,-50%) scale(9)}}
      @keyframes spy-r45-glyph{0%{opacity:0;transform:translate(-50%,-50%) scale(.35) rotate(-8deg)}35%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(3deg)}100%{opacity:.1;transform:translate(-50%,-50%) scale(.92)}}
      @keyframes spy-r45-card{to{opacity:1}}@keyframes spy-r45-bomb-screen{0%,100%{opacity:0}12%{opacity:1}23%{opacity:.25}33%{opacity:.85}72%{opacity:.16}}
      @keyframes spy-r45-spring-screen{0%{opacity:0;transform:translateY(0)}30%{opacity:.8;transform:translateY(-9px)}55%{opacity:.35;transform:translateY(5px)}100%{opacity:0;transform:translateY(0)}}
      @keyframes spy-r45-spring-glyph{0%{opacity:0;transform:translate(-50%,25%) scaleY(.25)}35%{opacity:1;transform:translate(-50%,-72%) scaleY(1.4)}60%{transform:translate(-50%,-42%) scaleY(.7)}100%{opacity:.2;transform:translate(-50%,-50%) scaleY(1)}}
      @keyframes spy-r45-water-screen{0%{opacity:0}12%{opacity:.95}100%{opacity:.22}}@keyframes spy-r45-rain{to{transform:translateY(26%)}}
      @media(max-width:900px){.spy-r45-trap-fx{width:72%}.spy-r45-trap-fx .spy-r45-card{min-width:min(330px,86%);padding:7px 9px}}
      @media(prefers-reduced-motion:reduce){.spy-r45-trap-fx *{animation-duration:.01ms!important;animation-iteration-count:1!important}}
    `;
    document.head.appendChild(style);return true
  }

  function ensureFx(slot){
    installStyles();const wrap=document.querySelector(".canvas-wrap");if(!wrap)return null;
    let node=wrap.querySelector(`.spy-r45-trap-fx[data-slot="${slot}"]`);
    if(!node){
      node=document.createElement("div");node.className="spy-r45-trap-fx";node.dataset.slot=String(slot);node.dataset.visible="false";
      node.setAttribute("aria-hidden","true");node.innerHTML='<div class="spy-r45-screen"></div><div class="spy-r45-drops"></div><div class="spy-r45-burst"></div><div class="spy-r45-glyph"></div><div class="spy-r45-card"><strong></strong><span></span></div>';wrap.appendChild(node)
    }
    return node
  }

  function clearSlot(slot){
    const timer=state.slotTimers.get(slot);if(timer)clearTimeout(timer);state.slotTimers.delete(slot);
    const node=document.querySelector(`.spy-r45-trap-fx[data-slot="${slot}"]`);if(!node)return false;
    node.dataset.visible="false";node.dataset.phase="";node.dataset.tone="";node.dataset.trap="";return true
  }

  function showFx(slot,{phase="triggered",trapId,title,effect,duration=1800,glyph="!"}={}){
    const node=ensureFx(slot);if(!node)return false;const current=state.slotTimers.get(slot);if(current)clearTimeout(current);
    node.dataset.visible="false";void node.offsetWidth;
    node.dataset.phase=phase;node.dataset.trap=String(trapId||"");node.dataset.tone=phase==="placed"?"placed":String(trapDef(trapId)?.tone||"");
    node.querySelector(".spy-r45-glyph").textContent=String(glyph||"!");node.querySelector(".spy-r45-card strong").textContent=String(title||"");node.querySelector(".spy-r45-card span").textContent=String(effect||"");node.dataset.visible="true";
    state.slotTimers.set(slot,setTimeout(()=>clearSlot(slot),Math.max(500,Number(duration)||1800)));return true
  }

  function worldText(id,text,colour){
    const live=liveFor(id);if(!live)return false;
    try{if(typeof floatText==="function")floatText(Number(live.x),Number(live.y),String(text||""),colour)}catch(_){}
    return true
  }

  function placementVisual(event){
    const placer=String(event?.playerId||event?.trap?.ownerId||"");if(!placer)return false;
    if(placer!==actorId()){state.hiddenRemotePlacements++;return false}
    const trap=event?.trap||{},trapId=String(trap.trapId||event?.trapType||event?.trapId||""),def=trapDef(trapId);if(!def)return false;
    const slot=slotFor(placer);showFx(slot,{phase:"placed",trapId,title:`${def.name} ARMED`,effect:"Hidden trap set · opponent cannot see its position",duration:PLACED_MS,glyph:def.glyph});
    try{if(typeof floatText==="function"&&Number.isFinite(Number(trap.x))&&Number.isFinite(Number(trap.y)))floatText(Number(trap.x),Number(trap.y),`${def.name} ARMED`,"#ffd85a")}catch(_){}
    state.placementVisuals++;state.lastEvent=`placed:${trapId}:${placer}`;return true
  }

  function triggerVisual(event){
    const victim=String(event?.victimId||event?.playerId||""),trapId=String(event?.trapType||event?.trap?.trapId||event?.trapId||""),def=trapDef(trapId);if(!victim||!def)return false;
    const slot=slotFor(victim),local=victim===actorId();showFx(slot,{phase:"triggered",trapId,title:`${def.name}!`,effect:def.effect,duration:def.duration,glyph:def.glyph});
    worldText(victim,`${def.name}! ${def.effect}`,def.tone==="water"?"#6cecff":def.tone==="spring"?"#ffd85a":"#ff6868");
    if(!local)state.remoteVictimVisuals++;
    state.triggerVisuals++;state.lastEvent=`triggered:${trapId}:${victim}`;return true
  }

  function eventKey(event){return [event?.type,event?.at,event?.trapId,event?.trapType,event?.playerId,event?.victimId,event?.trap?.id].join("|")}
  function processEvents(){
    if(!spyActive())return false;let changed=false;
    for(const event of match()?.events||[]){
      const type=String(event?.type||"");if(type!=="trap-armed"&&type!=="trap-triggered")continue;
      if(!remember(eventKey(event)))continue;
      changed=(type==="trap-armed"?placementVisual(event):triggerVisual(event))||changed
    }
    return changed
  }

  function resetOutsideSpy(){
    clearSlot(1);clearSlot(2);document.querySelectorAll(".spy-r45-trap-fx").forEach(node=>node.dataset.visible="false");return false
  }
  function tick(){
    if(!spyActive())return resetOutsideSpy();ensureFx(1);ensureFx(2);processEvents();state.installed=true;document.body.dataset.spyR45TrapPresentation="true";return true
  }

  tick();state.timer=setInterval(()=>{try{tick()}catch(error){console.warn("[Lost Sizzler r45] Spy trap presentation failed safely",error)}},TICK_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);for(const timer of state.slotTimers.values())clearTimeout(timer);state.slotTimers.clear()},{once:true});

  window.CCGLostSizzlerV141R45SpyTrapPresentation={processEvents,placementVisual,triggerVisual,showFx,clearSlot,tick,TRAPS,get state(){return state}};
})();
