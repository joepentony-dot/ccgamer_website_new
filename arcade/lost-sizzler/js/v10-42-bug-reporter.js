/* C64 Dungeon Carnage V10.42 — bounded developer incident recorder.
 * Observation only: no gameplay/input/render ownership.
 */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerBugReporter)return;

  const MAX_EVENTS=240;
  const TEXT_EVENTS=120;
  const SAMPLE_MS=3000;
  const STYLE_PATH="css/v10-42-bug-reporter.css";
  const events=[];
  const state={installed:false,reports:0,anomalies:0,lastReport:null,preReportSnapshot:null,sampleTimer:0};

  const safe=(fn,fallback=null)=>{try{const value=fn();return value===undefined?fallback:value}catch(_){return fallback}};
  const nowIso=()=>new Date().toISOString();
  const compact=value=>{
    if(value==null||["string","number","boolean"].includes(typeof value))return value;
    if(Array.isArray(value))return value.slice(0,24).map(compact);
    if(typeof value==="object"){
      const out={};let count=0;
      for(const [key,val] of Object.entries(value)){
        if(count++>=32)break;
        out[key]=compact(val);
      }
      return out;
    }
    return String(value);
  };
  function push(type,detail={}){
    events.push({at:nowIso(),ms:Math.round(performance.now()),type:String(type),detail:compact(detail)});
    if(events.length>MAX_EVENTS)events.splice(0,events.length-MAX_EVENTS);
  }

  function panelState(id){
    const node=document.getElementById(id);
    return node?{present:true,hidden:node.classList.contains("hidden"),display:safe(()=>getComputedStyle(node).display,"")}:{present:false};
  }
  function activeElement(){
    const node=document.activeElement;
    if(!(node instanceof Element))return null;
    return{tag:node.tagName,id:node.id||"",className:String(node.className||"").slice(0,160)};
  }
  function weaponState(player){
    const weapon=player?.weapon;
    if(!weapon)return null;
    return{
      id:weapon.id||"",name:weapon.displayName||weapon.name||"",rarity:weapon.rarity||"",
      rating:Number(weapon.rating||0),power:Number(weapon.power||0),delay:Number(weapon.delay||0),
      shots:Number(weapon.shots||1),ammo:Number(weapon.ammo||1),pierce:Number(weapon.pierce||0),
      element:weapon.element||"",mods:Array.isArray(weapon.mods)?weapon.mods.slice(0,12):[]
    };
  }
  function playerState(player){
    if(!player)return null;
    return{
      id:player.id||"",x:Number(player.x),y:Number(player.y),rx:Number(player.rx),ry:Number(player.ry),
      health:Number(player.health),maxHealth:Number(player.maxHealth),mana:Number(player.mana),maxMana:Number(player.maxMana),
      armor:Number(player.armor||0),level:Number(player.level||0),hitStunMs:Number(player.hitStunMs||0),
      invuln:Number(player.invuln||0),controlLocked:Boolean(player.controlLocked),controlsLocked:Boolean(player.controlsLocked),
      firearmUnlocked:player.firearmUnlocked!==false,weaponLevel:Number(player.weaponLevel||0),
      weapon:weaponState(player),ownedWeaponCount:Array.isArray(player.ownedWeapons)?player.ownedWeapons.length:0,
      activeWeaponIndex:Number.isInteger(player.activeWeaponIndex)?player.activeWeaponIndex:null
    };
  }
  function currentSnapshot(reason="snapshot"){
    const player=safe(()=>p1,null),second=safe(()=>p2,null);
    const playerId=player?.id;
    const activeProjectiles=safe(()=>bullets.filter(b=>b&&b.ttl>0&&(!playerId||b.owner===playerId)).length,0);
    const memory=safe(()=>host?.memoryPuzzle,null);
    const build=document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||document.body?.dataset?.v142Build||"";
    const cache=document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||"";
    return{
      capturedAt:nowIso(),reason,
      release:{build,cache,path:location.pathname,bootstrapReady:document.body?.dataset?.v142BootstrapReady||"",releaseReady:document.body?.dataset?.releaseReady||""},
      browser:{
        visibility:document.visibilityState,hasFocus:document.hasFocus(),activeElement:activeElement(),
        viewport:{w:innerWidth,h:innerHeight,dpr:Number(devicePixelRatio||1)},fullscreen:Boolean(document.fullscreenElement),
        coarsePointer:safe(()=>matchMedia("(pointer: coarse)").matches,false),deviceMemory:Number(navigator.deviceMemory||0),
        hardwareConcurrency:Number(navigator.hardwareConcurrency||0),
        heap:safe(()=>performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null,null)
      },
      game:{
        mode:safe(()=>String(mode),""),playMode:safe(()=>String(playMode),""),
        runActive:document.body?.dataset?.runActive==="true",
        floor:safe(()=>Number(run?.floor||0),0),elapsed:safe(()=>Number(run?.elapsed||0),0),
        alert:safe(()=>Number(run?.alert||0),0),floorComplete:safe(()=>Boolean(run?.floorComplete),false),
        score:safe(()=>Number(score||0),0),
        inputKeys:safe(()=>[...input].map(String).sort(),[]),
        fire1:safe(()=>Number(fire1),null),fire2:safe(()=>Number(fire2),null),
        fireBuffer1:safe(()=>Number(fireBuffer1),null),fireBuffer2:safe(()=>Number(fireBuffer2),null),
        projectileCD:safe(()=>Number(projectileCD),null),activeProjectiles,
        maxProjectiles:safe(()=>Number(C?.player?.maxProjectiles||0)+Math.max(0,Number(player?.weapon?.shots||1)-1),null),
        bulletsTotal:safe(()=>bullets.length,0),enemyBulletsTotal:safe(()=>enemyBullets.length,0),
        performanceTier:document.body?.dataset?.v141R47PerformanceTier||"normal"
      },
      player1:playerState(player),player2:playerState(second),
      panels:{
        inventory:panelState("inventory-panel"),pause:panelState("pause-panel"),shop:panelState("shop-panel"),
        itemInfo:panelState("item-info-panel"),dossier:panelState("named-dossier-panel"),save:panelState("save-panel")
      },
      puzzle:memory?{
        roomId:memory.roomId,phase:memory.phase,inputIndex:Number(memory.inputIndex||0),failures:Number(memory.failures||0),
        flashTile:Number(memory.flashTile??-1),solved:Boolean(memory.solved),
        sequence:Array.isArray(memory.sequence)?[...memory.sequence]:[],
        tiles:Array.isArray(memory.tiles)?memory.tiles.map(t=>({index:t.index,x:t.x,y:t.y})):[],
        activator:memory.activator?{x:memory.activator.x,y:memory.activator.y}:null
      }:null,
      diagnostics:{
        pauseAttackLastReset:safe(()=>window.__CCG_PAUSE_ATTACK_LAST_RESET__||null,null),
        attackHold:safe(()=>window.CCGLostSizzlerV142AttackHoldLiveness?.diagnostics||null,null),
        soloStability:safe(()=>window.CCGLostSizzlerV142R18SoloPlaytestStability?.diagnostics||null,null),
        projectileLifecycle:safe(()=>window.CCGLostSizzlerV142ProjectileLifecycle?.state||null,null)
      }
    };
  }

  function snapshotSummary(reason){
    const s=currentSnapshot(reason);
    push("snapshot",{
      reason,mode:s.game.mode,floor:s.game.floor,pos:s.player1?{x:s.player1.x,y:s.player1.y}:null,
      mana:s.player1?.mana,weapon:s.player1?.weapon?.name||"",fire1:s.game.fire1,buffer:s.game.fireBuffer1,
      projectiles:s.game.activeProjectiles,input:s.game.inputKeys,inventoryHidden:s.panels.inventory.hidden,
      visibility:s.browser.visibility,focus:s.browser.hasFocus
    });
    return s;
  }

  function fireProbe(code,before){
    if(!before?.player1||before.game.mode!=="playing"||!before.game.runActive)return;
    if(!before.player1.firearmUnlocked||!before.player1.weapon||before.player1.mana<=0||before.player1.hitStunMs>0)return;
    if(Number(before.game.activeProjectiles)>=Number(before.game.maxProjectiles||Infinity))return;
    setTimeout(()=>{
      const after=currentSnapshot("fire-probe");
      const fired=Number(after.player1?.mana)<Number(before.player1?.mana)||
        Number(after.game.activeProjectiles)>Number(before.game.activeProjectiles)||
        Number(after.game.fire1)>0;
      push("fire-probe",{code,fired,before:{mana:before.player1?.mana,fire1:before.game.fire1,buffer:before.game.fireBuffer1,projectiles:before.game.activeProjectiles,mode:before.game.mode},after:{mana:after.player1?.mana,fire1:after.game.fire1,buffer:after.game.fireBuffer1,projectiles:after.game.activeProjectiles,mode:after.game.mode}});
      if(!fired&&after.game.mode==="playing"&&after.game.runActive&&after.browser.visibility==="visible"){
        state.anomalies++;
        push("ANOMALY_POSSIBLE_FIRE_FAILURE",{
          code,ammo:after.player1?.mana,weapon:after.player1?.weapon?.name||"",input:after.game.inputKeys,
          fire1:after.game.fire1,buffer:after.game.fireBuffer1,projectiles:after.game.activeProjectiles,
          inventoryHidden:after.panels.inventory.hidden,activeElement:after.browser.activeElement
        });
        updateBadge();
      }
    },650);
  }

  function createReport(reason="manual",snapshot=null){
    const current=snapshot||currentSnapshot(reason);
    const report={
      schema:"CCG-DUNGEON-BUG-REPORT-v1",
      createdAt:nowIso(),reason,
      summary:current,
      anomalies:state.anomalies,
      recentEvents:events.slice(-MAX_EVENTS)
    };
    state.lastReport=report;state.reports++;
    push("report-created",{reason,events:report.recentEvents.length,anomalies:state.anomalies});
    try{sessionStorage.setItem("ccg-dungeon-last-bug-report",JSON.stringify(report))}catch(_){}
    return report;
  }
  function formatReport(report){
    const s=report.summary,g=s.game,p=s.player1,mem=s.puzzle;
    const lines=[
      "CCG DUNGEON CARNAGE BUG REPORT",
      `Created: ${report.createdAt}`,
      `Build: ${s.release.build} | Cache: ${s.release.cache}`,
      `Reason: ${report.reason}`,
      `Mode: ${g.mode} / ${g.playMode} | Floor: ${g.floor} | Run active: ${g.runActive}`,
      `P1: ${p?`x${p.x},y${p.y} HP ${p.health}/${p.maxHealth} AMMO ${p.mana}/${p.maxMana} ARM ${p.armor}`:"none"}`,
      `Weapon: ${p?.weapon?.name||"none"} | rating ${p?.weapon?.rating??"-"} | power ${p?.weapon?.power??"-"} | shots ${p?.weapon?.shots??"-"}`,
      `Fire state: fire1=${g.fire1} buffer=${g.fireBuffer1} projectileCD=${g.projectileCD} activeProjectiles=${g.activeProjectiles}/${g.maxProjectiles}`,
      `Input: ${g.inputKeys.join(", ")||"none"}`,
      `Inventory hidden: ${s.panels.inventory.hidden} | Pause hidden: ${s.panels.pause.hidden} | Focus: ${s.browser.hasFocus} | Active element: ${s.browser.activeElement?.tag||""}#${s.browser.activeElement?.id||""}`,
      `Memory puzzle: ${mem?`phase=${mem.phase} input=${mem.inputIndex}/${mem.sequence.length} failures=${mem.failures} flash=${mem.flashTile}`:"none"}`,
      `Recorded anomalies: ${report.anomalies}`,
      "",
      `RECENT EVENTS (latest ${Math.min(TEXT_EVENTS,report.recentEvents.length)})`
    ];
    for(const event of report.recentEvents.slice(-TEXT_EVENTS)){
      let detail="";try{detail=JSON.stringify(event.detail)}catch(_){detail=String(event.detail)}
      lines.push(`[${event.at}] ${event.type} ${detail}`);
    }
    return lines.join("\n");
  }

  function installStylesheet(){
    if(document.querySelector('link[data-ccg-bug-reporter-style="true"]'))return;
    const cache=document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||"latest";
    const link=document.createElement("link");link.rel="stylesheet";link.href=`${STYLE_PATH}?v=${encodeURIComponent(cache)}`;link.dataset.ccgBugReporterStyle="true";document.head.appendChild(link);
  }
  function reporterEnabled(){
    const params=new URLSearchParams(location.search);
    if(params.get("bugreport")==="0"){try{localStorage.removeItem("ccg-dungeon-bug-reporter")}catch(_){}return false}
    if(params.get("bugreport")==="1"||params.get("debug")==="1"){try{localStorage.setItem("ccg-dungeon-bug-reporter","1")}catch(_){}return true}
    return safe(()=>localStorage.getItem("ccg-dungeon-bug-reporter")==="1",false);
  }

  function ensureUi(){
    installStylesheet();
    if(document.getElementById("ccg-bug-report-btn"))return;
    const button=document.createElement("button");
    button.id="ccg-bug-report-btn";button.type="button";button.innerHTML='REPORT BUG <span id="ccg-bug-report-count" aria-hidden="true"></span>';
    button.title="Capture the current Dungeon Carnage state and recent diagnostic history (F8)";
    button.style.cssText="position:fixed!important;right:max(10px,env(safe-area-inset-right));top:max(74px,calc(env(safe-area-inset-top) + 10px));z-index:2147483647!important;pointer-events:auto!important;touch-action:manipulation;";
    button.hidden=!reporterEnabled();
    document.body.appendChild(button);

    const modal=document.createElement("div");modal.id="ccg-bug-report-modal";modal.className="hidden";modal.style.cssText="position:fixed!important;inset:0;z-index:2147483647!important;pointer-events:auto!important;";modal.innerHTML=`
      <section class="ccg-bug-report-card" role="dialog" aria-modal="true" aria-labelledby="ccg-bug-report-title">
        <div class="ccg-bug-report-head"><h2 id="ccg-bug-report-title">DUNGEON BUG REPORT</h2><button type="button" data-bug-close aria-label="Close bug report">×</button></div>
        <p>Capture this immediately after the fault, before refreshing. Paste the text into the development chat, or attach the JSON file.</p>
        <textarea id="ccg-bug-report-text" spellcheck="false" readonly></textarea>
        <div class="ccg-bug-report-actions">
          <button type="button" data-bug-copy>COPY REPORT</button>
          <button type="button" data-bug-save>SAVE JSON</button>
          <button type="button" data-bug-close>CLOSE</button>
        </div>
        <small id="ccg-bug-report-status">F8 also opens this reporter on desktop.</small>
      </section>`;
    document.body.appendChild(modal);

    const captureBefore=()=>{state.preReportSnapshot=currentSnapshot("manual-pre-ui")};
    button.addEventListener("pointerdown",captureBefore,{passive:true});
    button.addEventListener("click",()=>openReporter("manual-button",state.preReportSnapshot));

    modal.querySelectorAll("[data-bug-close]").forEach(node=>node.addEventListener("click",closeReporter));
    modal.querySelector("[data-bug-copy]")?.addEventListener("click",copyReport);
    modal.querySelector("[data-bug-save]")?.addEventListener("click",saveReport);
  }
  function updateBadge(){
    const badge=document.getElementById("ccg-bug-report-count");
    if(badge)badge.textContent=state.anomalies?String(state.anomalies):"";
  }
  function openReporter(reason="manual",snapshot=null){
    ensureUi();
    const report=createReport(reason,snapshot||currentSnapshot(reason));
    const textarea=document.getElementById("ccg-bug-report-text"),modal=document.getElementById("ccg-bug-report-modal");
    if(textarea)textarea.value=formatReport(report);
    modal?.classList.remove("hidden");
    document.getElementById("ccg-bug-report-status").textContent=`Captured ${report.recentEvents.length} recent events and ${report.anomalies} anomaly flag${report.anomalies===1?"":"s"}.`;
  }
  function closeReporter(){
    document.getElementById("ccg-bug-report-modal")?.classList.add("hidden");
    if(safe(()=>mode==="playing",false))try{focusGameplayKeyboard()}catch(_){}
  }
  async function copyReport(){
    const text=document.getElementById("ccg-bug-report-text")?.value||"";
    let ok=false;
    try{await navigator.clipboard.writeText(text);ok=true}catch(_){
      const area=document.getElementById("ccg-bug-report-text");
      try{area?.focus();area?.select();ok=document.execCommand("copy")}catch(__){}
    }
    const status=document.getElementById("ccg-bug-report-status");if(status)status.textContent=ok?"REPORT COPIED — paste it into the development chat.":"Copy was blocked by the browser. Select the report text manually.";
  }
  function saveReport(){
    const report=state.lastReport||createReport("manual-save");
    const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=`ccg-dungeon-bug-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),0);
  }

  const interesting=new Set(["Space","Enter","KeyF","Numpad0","Tab","Escape","KeyP","F8"]);
  addEventListener("keydown",event=>{
    if(event.code==="F8"){
      if(event.target instanceof Element&&event.target.matches("input,textarea,select,[contenteditable='true'],[contenteditable='']"))return;
      event.preventDefault();
      const snap=currentSnapshot("f8-pre-ui");push("hotkey-report",{code:event.code,mode:snap.game.mode});
      openReporter("F8",snap);return;
    }
    if(!interesting.has(event.code))return;
    const before=currentSnapshot(`keydown-${event.code}`);
    push("keydown",{code:event.code,repeat:Boolean(event.repeat),mode:before.game.mode,input:before.game.inputKeys,fire1:before.game.fire1,buffer:before.game.fireBuffer1,inventoryHidden:before.panels.inventory.hidden});
    if(["Space","KeyF","Numpad0"].includes(event.code)&&!event.repeat)fireProbe(event.code,before);
    if(["Tab","Escape","KeyP"].includes(event.code))setTimeout(()=>snapshotSummary(`after-${event.code}`),80);
  },true);
  addEventListener("keyup",event=>{if(interesting.has(event.code))push("keyup",{code:event.code,mode:safe(()=>String(mode),""),input:safe(()=>[...input].map(String),[])})},true);
  addEventListener("focus",()=>push("window-focus",{mode:safe(()=>String(mode),"")}),true);
  addEventListener("blur",()=>push("window-blur",{mode:safe(()=>String(mode),""),input:safe(()=>[...input].map(String),[])}),true);
  document.addEventListener("visibilitychange",()=>push("visibility",{state:document.visibilityState,mode:safe(()=>String(mode),"")}));
  document.addEventListener("fullscreenchange",()=>push("fullscreen",{active:Boolean(document.fullscreenElement)}));
  addEventListener("error",event=>push("window-error",{message:String(event.message||""),file:String(event.filename||""),line:Number(event.lineno||0),column:Number(event.colno||0)}));
  addEventListener("unhandledrejection",event=>push("unhandled-rejection",{reason:String(event.reason?.stack||event.reason||"").slice(0,2000)}));
  document.addEventListener("click",event=>{
    const target=event.target instanceof Element?event.target.closest("#inventory-close,#inventory-close-top,#resume-btn,[data-ccg-equip-weapon],[data-bug-close]"):null;
    if(!target)return;
    push("ui-click",{id:target.id||"",action:target.getAttribute("data-ccg-equip-weapon")!=null?"equip-weapon":target.hasAttribute("data-bug-close")?"bug-close":"",mode:safe(()=>String(mode),"")});
    setTimeout(()=>snapshotSummary(`after-click-${target.id||"control"}`),80);
  },true);

  ensureUi();
  snapshotSummary("reporter-installed");
  state.sampleTimer=setInterval(()=>{
    if(document.body?.dataset?.runActive==="true"||safe(()=>String(mode)!=="menu",false))snapshotSummary("periodic");
  },SAMPLE_MS);
  addEventListener("pagehide",()=>{if(state.sampleTimer)clearInterval(state.sampleTimer)},{once:true});
  state.installed=true;

  window.CCGLostSizzlerBugReporter=Object.freeze({
    version:"V10.42-bug-reporter-v1",observationOnly:true,gameplayOwnership:false,inputOwnership:false,renderOwnership:false,
    get state(){return state},get events(){return [...events]},
    snapshot:currentSnapshot,createReport,formatReport,open:openReporter,close:closeReporter,
    enable(){try{localStorage.setItem("ccg-dungeon-bug-reporter","1")}catch(_){}ensureUi();const b=document.getElementById("ccg-bug-report-btn");if(b)b.hidden=false},
    disable(){try{localStorage.removeItem("ccg-dungeon-bug-reporter")}catch(_){}const b=document.getElementById("ccg-bug-report-btn");if(b)b.hidden=true}
  });
})();
