(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_SPLIT_PLAYER_HUD__)return;
  window.__CCG_LOST_SIZZLER_SPLIT_PLAYER_HUD__=true;

  const hub=document.querySelector(".player-hub");
  if(!hub)return;

  const style=document.createElement("style");
  style.id="ccg-split-player-hud-style";
  style.textContent=`
    .split-player-hud{display:none}
    body.split-hud-active .player-hub{display:block!important;min-height:132px!important;max-height:148px!important;padding:6px 8px!important;overflow:hidden!important}
    body.split-hud-active .player-hub>:not(.split-player-hud){display:none!important}
    body.split-hud-active .split-player-hud{display:grid;grid-template-columns:minmax(0,1fr) 176px minmax(0,1fr);gap:7px;height:100%;min-height:0}
    .split-player-card{--split-accent:#6cecff;display:grid;grid-template-rows:auto auto 1fr;gap:5px;min-width:0;padding:6px;border:1px solid color-mix(in srgb,var(--split-accent) 48%,#25162f);background:linear-gradient(150deg,#0b0710,#050308);box-shadow:inset 0 0 18px color-mix(in srgb,var(--split-accent) 5%,transparent)}
    .split-player-card.player-two{--split-accent:#ffd85a}
    .split-player-head{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;padding-bottom:4px;border-bottom:1px solid #32223e}
    .split-player-head strong{min-width:0;color:var(--split-accent);font-size:10px;letter-spacing:.55px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .split-player-head span{color:#8f839a;font-size:6.8px;white-space:nowrap}
    .split-player-main{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;min-width:0}
    .split-player-stat{position:relative;min-width:0;padding:4px 5px 8px;border:1px solid #392948;background:#08050c;overflow:hidden}
    .split-player-stat span{display:block;color:#8f839a;font-size:6.3px;letter-spacing:.35px;white-space:nowrap}
    .split-player-stat b{display:block;margin-top:3px;color:#fff;font-size:10.5px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .split-player-stat.health b{color:#72ff9b}.split-player-stat.armour b{color:#9ccaff}.split-player-stat.ammo b{color:#6cecff}.split-player-stat.weapon b{color:#ffb36f}
    .split-player-stat::after{content:"";position:absolute;left:4px;right:4px;bottom:3px;height:2px;background:#22172a}
    .split-player-stat i{position:absolute;left:4px;bottom:3px;z-index:1;height:2px;width:var(--meter,0%);max-width:calc(100% - 8px);background:var(--split-accent);box-shadow:0 0 7px currentColor}
    .split-player-stat.health i{background:#72ff9b}.split-player-stat.armour i{background:#79baff}.split-player-stat.ammo i{background:#6cecff}.split-player-stat.weapon i{display:none}
    .split-player-lower{display:grid;grid-template-columns:minmax(160px,1.45fr) repeat(4,minmax(54px,.58fr));gap:4px;min-width:0;align-items:stretch}
    .split-xp{min-width:0;padding:4px 6px;border:1px solid #473454;background:#08050c}
    .split-xp-head{display:flex;align-items:center;justify-content:space-between;gap:7px;min-width:0}
    .split-xp-head b{color:var(--split-accent);font-size:7.5px;white-space:nowrap}.split-xp-head span{min-width:0;color:#6cecff;font-size:6.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .split-xp-track{height:5px;margin:4px 0 2px;border:1px solid #34263e;background:#030205;overflow:hidden}.split-xp-track i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--split-accent),#6cecff)}
    .split-xp small{display:block;color:#8f839a;font-size:5.8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .split-mini{display:flex;flex-direction:column;justify-content:center;min-width:0;padding:4px 3px;border:1px solid #382846;background:#08050c;text-align:center}
    .split-mini span{display:block;color:#8f839a;font-size:5.7px;white-space:nowrap}.split-mini b{display:block;margin-top:3px;color:#fff;font-size:8px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .split-shared{display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:minmax(0,1fr);gap:4px;min-width:0;padding:6px;border:1px solid #4d395b;background:#07040a}
    .split-shared>div{display:flex;flex-direction:column;justify-content:center;min-width:0;padding:4px;border:1px solid #372742;background:#08050c;text-align:center}
    .split-shared .wide{grid-column:1/-1}.split-shared span{color:#8f839a;font-size:5.8px;letter-spacing:.35px;white-space:nowrap}.split-shared b{display:block;margin-top:3px;color:#ffd85a;font-size:8.5px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.split-shared .score b{color:#6cecff}
    @media(max-width:1100px){
      body.split-hud-active .player-hub{min-height:154px!important;max-height:166px!important}
      body.split-hud-active .split-player-hud{grid-template-columns:1fr 1fr;grid-template-rows:minmax(0,1fr) 30px}
      .split-shared{grid-column:1/-1;grid-row:2;grid-template-columns:repeat(6,minmax(0,1fr));padding:3px}.split-shared>div,.split-shared .wide{grid-column:auto;padding:2px 3px}.split-shared span{font-size:5px}.split-shared b{font-size:7px;margin-top:1px}
    }
    @media(max-width:820px){
      body.split-hud-active .player-hub{min-height:166px!important;max-height:178px!important}
      body.split-hud-active .split-player-hud{gap:4px}.split-player-card{padding:4px;gap:4px}.split-player-head span{display:none}.split-player-main{gap:2px}.split-player-stat{padding:3px 3px 7px}.split-player-stat span{font-size:5.2px}.split-player-stat b{font-size:8px}.split-player-lower{grid-template-columns:1fr repeat(2,.45fr);gap:2px}.split-mini:nth-of-type(n+4){display:none}.split-xp{padding:3px 4px}.split-xp small{display:none}
    }
  `;
  document.head.appendChild(style);

  const root=document.createElement("section");
  root.className="split-player-hud";
  root.setAttribute("aria-label","Split-screen player status");
  root.setAttribute("aria-hidden","true");
  root.innerHTML=`
    <section class="split-player-card player-one" data-split-player="1">
      <div class="split-player-head"><strong data-name>PLAYER 1</strong><span>WASD · SPACE · E/Q/R/B</span></div>
      <div class="split-player-main">
        <div class="split-player-stat health"><span>HEALTH</span><b data-health>0/0</b><i data-health-meter></i></div>
        <div class="split-player-stat armour"><span>ARMOUR</span><b data-armour>0</b><i data-armour-meter></i></div>
        <div class="split-player-stat ammo"><span>AMMO</span><b data-ammo>0/0</b><i data-ammo-meter></i></div>
        <div class="split-player-stat weapon"><span>WEAPON</span><b data-weapon>SWORD</b><i></i></div>
      </div>
      <div class="split-player-lower">
        <div class="split-xp"><div class="split-xp-head"><b data-level>LEVEL 1</b><span data-xp-total>XP 0</span></div><div class="split-xp-track"><i data-xp-meter></i></div><small data-xp-next>XP TO NEXT</small></div>
        <div class="split-mini"><span>POTION</span><b data-potions>0</b></div>
        <div class="split-mini"><span>TORCH</span><b data-torches>0</b></div>
        <div class="split-mini"><span>BRONZE</span><b data-bronze>0</b></div>
        <div class="split-mini"><span>POWER</span><b data-power>1</b></div>
      </div>
    </section>
    <section class="split-shared" aria-label="Shared run status">
      <div><span>FLOOR</span><b data-floor>F1</b></div>
      <div><span>OBJECTIVE</span><b data-objective>ACTIVE</b></div>
      <div class="wide score"><span>SHARED SCORE</span><b data-score>000000</b></div>
      <div><span>KILLS</span><b data-kills>0</b></div>
      <div><span>TIME</span><b data-time>00:00</b></div>
    </section>
    <section class="split-player-card player-two" data-split-player="2">
      <div class="split-player-head"><strong data-name>PLAYER 2</strong><span>IJKL · ENTER · O</span></div>
      <div class="split-player-main">
        <div class="split-player-stat health"><span>HEALTH</span><b data-health>0/0</b><i data-health-meter></i></div>
        <div class="split-player-stat armour"><span>ARMOUR</span><b data-armour>0</b><i data-armour-meter></i></div>
        <div class="split-player-stat ammo"><span>AMMO</span><b data-ammo>0/0</b><i data-ammo-meter></i></div>
        <div class="split-player-stat weapon"><span>WEAPON</span><b data-weapon>SWORD</b><i></i></div>
      </div>
      <div class="split-player-lower">
        <div class="split-xp"><div class="split-xp-head"><b data-level>LEVEL 1</b><span data-xp-total>XP 0</span></div><div class="split-xp-track"><i data-xp-meter></i></div><small data-xp-next>XP TO NEXT</small></div>
        <div class="split-mini"><span>POTION</span><b data-potions>0</b></div>
        <div class="split-mini"><span>TORCH</span><b data-torches>0</b></div>
        <div class="split-mini"><span>BRONZE</span><b data-bronze>0</b></div>
        <div class="split-mini"><span>POWER</span><b data-power>1</b></div>
      </div>
    </section>
  `;
  hub.appendChild(root);

  const cards=[root.querySelector('[data-split-player="1"]'),root.querySelector('[data-split-player="2"]')];
  const shared={
    floor:root.querySelector("[data-floor]"),objective:root.querySelector("[data-objective]"),score:root.querySelector("[data-score]"),kills:root.querySelector("[data-kills]"),time:root.querySelector("[data-time]")
  };
  const refs=cards.map(card=>({
    card,name:card.querySelector("[data-name]"),health:card.querySelector("[data-health]"),healthMeter:card.querySelector("[data-health-meter]"),armour:card.querySelector("[data-armour]"),armourMeter:card.querySelector("[data-armour-meter]"),ammo:card.querySelector("[data-ammo]"),ammoMeter:card.querySelector("[data-ammo-meter]"),weapon:card.querySelector("[data-weapon]"),level:card.querySelector("[data-level]"),xpTotal:card.querySelector("[data-xp-total]"),xpMeter:card.querySelector("[data-xp-meter]"),xpNext:card.querySelector("[data-xp-next]"),potions:card.querySelector("[data-potions]"),torches:card.querySelector("[data-torches]"),bronze:card.querySelector("[data-bronze]"),power:card.querySelector("[data-power]")
  }));

  const pct=(value,max)=>`${Math.max(0,Math.min(100,(Number(value)||0)/Math.max(1,Number(max)||1)*100))}%`;
  const countKind=(player,kind)=>{
    try{return Number(PGR?.inventoryKindCount?.(player,kind))||0}catch(_){return 0}
  };
  const runTime=ms=>{
    const total=Math.max(0,Math.floor((Number(ms)||0)/1000)),minutes=Math.floor(total/60),seconds=total%60;
    return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
  };
  const scoreText=value=>String(Math.max(0,Math.floor(Number(value)||0))).padStart(6,"0");

  function renderPlayer(ref,player,index){
    if(!ref||!player)return;
    const weapon=player.weapon||baseWeapon(),cap=PGR.floorLevelCap(run),atCap=player.level>=cap,xpNeed=PGR.xpNeed(player.level),xpPercent=atCap?100:Math.max(0,Math.min(100,(Number(player.xp)||0)/Math.max(1,xpNeed)*100));
    ref.name.textContent=`P${index} · ${String(player.name||`PLAYER ${index}`).slice(0,18).toUpperCase()}`;
    ref.health.textContent=`${player.health}/${player.maxHealth}`;
    ref.healthMeter.style.width=pct(player.health,player.maxHealth);
    ref.armour.textContent=String(player.armor||0);
    ref.armourMeter.style.width=pct(player.armor,12);
    ref.ammo.textContent=`${player.mana}/${player.maxMana}`;
    ref.ammoMeter.style.width=pct(player.mana,player.maxMana);
    ref.weapon.textContent=String(weapon.name||"SWORD").replace(" Blaster","").slice(0,15).toUpperCase();
    ref.level.textContent=`LEVEL ${player.level} / ${cap}`;
    ref.xpTotal.textContent=`XP ${player.totalXp||0}`;
    ref.xpMeter.style.width=`${xpPercent}%`;
    ref.xpNext.textContent=atCap?`FLOOR ${run.floor} CAP REACHED`:`${Math.max(0,xpNeed-(Number(player.xp)||0))} TO NEXT`;
    ref.potions.textContent=String(countKind(player,"potion"));
    ref.torches.textContent=player.torchMs>0?`${Math.ceil(player.torchMs/1000)}s+${countKind(player,"torch")}`:String(countKind(player,"torch"));
    ref.bronze.textContent=String(player.bronzeKeys||0);
    ref.power.textContent=String((weapon.power||1)+(player.damageBonus||0));
  }

  function renderShared(){
    shared.floor.textContent=`F${run?.floor||1}`;
    shared.objective.textContent=host?.objective?.type==="keys"?`${host.keysCollected||0}/${C.keyTarget}`:(host?.objective?.complete?"DONE":"ACTIVE");
    shared.score.textContent=scoreText(score);
    shared.kills.textContent=String(run?.stats?.kills||0);
    shared.time.textContent=runTime(run?.elapsed);
  }

  function setActive(active){
    document.body.classList.toggle("split-hud-active",Boolean(active));
    root.setAttribute("aria-hidden",active?"false":"true");
  }

  function renderSplitHud(){
    const active=playMode==="split"&&Boolean(p1&&p2&&run)&&document.body.dataset.runActive==="true";
    setActive(active);
    if(!active)return;
    renderPlayer(refs[0],p1,1);
    renderPlayer(refs[1],p2,2);
    renderShared();
  }

  const originalSync=sync;
  sync=function(...args){
    const result=originalSync.apply(this,args);
    try{renderSplitHud()}catch(error){console.warn("[Lost Sizzler] split player HUD render failed safely",error)}
    return result;
  };

  const originalSetRunPresentation=setRunPresentation;
  setRunPresentation=function(active){
    const result=originalSetRunPresentation.apply(this,arguments);
    if(!active)setActive(false);
    else queueMicrotask(()=>{try{renderSplitHud()}catch(_){}});
    return result;
  };

  renderSplitHud();
})();
