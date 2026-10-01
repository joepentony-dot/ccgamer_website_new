/* The Lost Sizzler V10.4 — final lighting and retro-run credits. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_FINAL_UI_V104__)return;
  window.__CCG_LOST_SIZZLER_FINAL_UI_V104__=true;

  const NORMAL_SIGHT_RADIUS=4.5;
  const gameSlugs=new Map();let slugLoad=null;
  function normalTitle(value){return String(value||"").trim().toLocaleLowerCase("en-GB")}
  function loadGameSlugs(){return slugLoad||(slugLoad=fetch("/games/games.json",{cache:"no-cache"}).then(r=>r.ok?r.json():[]).then(rows=>{for(const game of Array.isArray(rows)?rows:[])if(game?.title&&game?.slug&&!gameSlugs.has(normalTitle(game.title)))gameSlugs.set(normalTitle(game.title),String(game.slug));return gameSlugs}).catch(()=>gameSlugs))}

  if(window.CCGProgression?.effectiveSight){
    const originalEffectiveSight=window.CCGProgression.effectiveSight.bind(window.CCGProgression);
    window.CCGProgression.effectiveSight=function effectiveSightV104(player,runState){
      if(player?.torchMs>0)return window.CCG_CONFIG.player.torchRadius;
      let radius=NORMAL_SIGHT_RADIUS;
      if(runState?.modifier?.id==="EXTRA_DARK")radius=Math.max(3,radius-1);
      return radius;
    };
    window.CCGProgression._v104OriginalEffectiveSight=originalEffectiveSight;
  }

  function recordGame(title){
    if(!run)return;
    const name=String(title||"").trim();
    if(!name)return;
    run.v104CollectedGameHistory=Array.isArray(run.v104CollectedGameHistory)?run.v104CollectedGameHistory:[];
    run.v104CollectedGameHistory.push(name);
  }

  if(typeof onCollected==="function"){
    const originalOnCollected=onCollected;
    onCollected=function onCollectedV104RetroHistory(event){
      const item=event?.item;
      if(item?.kind==="game")recordGame(item.title||"Unknown C64 Game");
      return originalOnCollected.apply(this,arguments);
    };
  }

  function gameHistory(){
    const history=Array.isArray(run?.v104CollectedGameHistory)?run.v104CollectedGameHistory:[];
    if(history.length)return history;
    return [...(run?.bankedGames||[]),...(run?.floorGames||[])].filter(Boolean);
  }

  function renderEnemyCredits(){
    if(!UI?.endText)return;const rows=Array.isArray(run?.enemyDefeats)?run.enemyDefeats:[],total=rows.reduce((sum,row)=>sum+Number(row.count||0),0);
    const block=rows.length?rows.map((row,index)=>{
      const initials=esc(row.initials||String(row.name||"Enemy").slice(0,2).toUpperCase()),fallback=row.avatar?`<img src="${esc(row.avatar)}" alt="">`:`<span class="v106-enemy-avatar-fallback">${initials}</span>`,avatar=`<canvas class="v106-enemy-avatar-canvas" data-enemy-avatar-index="${index}" width="64" height="64" role="img" aria-label="${esc(row.name||"Enemy")} in-game sprite"></canvas>${fallback}`;
      const floors=(row.floors||[]).sort((a,b)=>a.floor-b.floor).map(f=>`F${Number(f.floor||1)} ×${Number(f.count||0)}`).join(" • ");
      const killers=(row.killers||[]).map(k=>`${esc(k.name||"The Dungeon")} ×${Number(k.count||0)}`).join(" • ")||"The Dungeon";
      return `<article class="v106-enemy-credit ${row.named?"named":""}"><span class="v106-enemy-avatar">${avatar}</span><div><h4>${esc(row.name||"Enemy")} <b>×${Number(row.count||0)}</b></h4><p>${esc(floors||"Floor unknown")}</p><small>${row.named?"Freed by":"Defeated by"}: ${killers}</small></div></article>`
    }).join(""):'<div class="v104-credit-empty">No enemies were defeated on this run.</div>';
    document.getElementById("v106-enemy-credits")?.remove();
    UI.endText.insertAdjacentHTML("beforeend",`<section id="v106-enemy-credits" class="v104-retro-credits v106-enemy-credits"><h3>ENEMIES DEFEATED THIS RUN — ${total}</h3><div class="v106-enemy-grid">${block}</div>${rows.some(row=>row.named)?'<small>Named enemies are recorded as freed from the dungeon corruption, while all other enemies are recorded as defeated.</small>':""}</section>`);
    document.querySelectorAll("#v106-enemy-credits [data-enemy-avatar-index]").forEach(canvas=>{const row=rows[Number(canvas.dataset.enemyAvatarIndex)];try{window.CCGRenderEnemyCreditAvatar?.(canvas,row)}catch(error){console.warn("Enemy credit avatar render failed",error)}})
  }

  function campaignComplete(){
    return Boolean(run?.runComplete&&!run.dailyFailed&&!run.xpGameOver&&Number(run.floor||0)>=Number(window.CCG_CONFIG?.maxFloors||15));
  }

  function renderCompletionCredits(){
    if(!UI?.endText)return;
    document.getElementById("v108-completion-credits")?.remove();
    if(!campaignComplete())return;
    UI.endText.insertAdjacentHTML("beforeend",`<section id="v108-completion-credits" class="v104-retro-credits v108-completion-credits">
      <h3>CAMPAIGN COMPLETE — BLOOD CITADEL CLEARED</h3>
      <p>You made it through all ${Number(window.CCG_CONFIG?.maxFloors||15)} floors, completed the Sigil and escaped the dungeon.</p>
      <div class="v108-special-thanks"><b>SPECIAL THANKS</b><span>Patreon and long-term supporters, including AZALEA and CPU, for supporting C64 Dungeon Carnage and the Cheeky Commodore Gamer channel.</span></div>
      <div class="v108-end-actions">
        <button id="v108-end-share" type="button" class="primary">Share Completion</button>
        <a href="https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL" target="_blank" rel="noopener noreferrer">Donate / Buy Joe a Beer</a>
        <a href="mailto:info@cheekycommodoregamer.co.uk?subject=C64%20Dungeon%20Carnage%20Feedback">Send Feedback</a>
        <a href="https://www.cheekycommodoregamer.co.uk/support.html" target="_blank" rel="noopener noreferrer">CCG Support Page</a>
      </div>
      <small>Completion sharing uses the current game-page URL so the final public address can change without hardcoding a purchase link here.</small>
    </section>`);
    document.getElementById("v108-end-share")?.addEventListener("click",()=>{try{shareQuest()}catch(_){try{document.getElementById("share-btn")?.click()}catch(__){}}});
    if(!run.v108CreditsMusicStarted){
      run.v108CreditsMusicStarted=true;
      try{window.CCGEndCreditsMusic?.play?.({reason:"campaign-complete",run})}catch(_){}
    }
  }

  function renderRetroCredits(){
    if(!UI?.endText)return;
    renderEnemyCredits();
    const history=gameHistory();
    const counts=new Map();
    for(const raw of history){const title=String(raw||"").trim();if(title)counts.set(title,(counts.get(title)||0)+1)}
    const entries=[...counts.entries()];
    const block=entries.length
      ? entries.map(([title,count])=>{const slug=gameSlugs.get(normalTitle(title)),link=slug?`<a href="/games/${encodeURIComponent(slug)}/" target="_blank" rel="noopener noreferrer">View game page</a>`:"";return `<div class="v104-credit-game"><span>▸ ${esc(title)}</span><span class="v104-credit-actions">${count>1?`<b>×${count}</b>`:""}${link}</span></div>`}).join("")
      : '<div class="v104-credit-empty"><b>None collected.</b> Look for glowing boxed pickups marked C64 and labelled with a game title, then walk over one to register it. Keys, ammo, doors and ordinary loot do not count.</div>';
    const note=entries.length?'<small>Every title you picked up during this run is shown here, even if it was later lost with an unrecovered death cache.</small>':"";
    const old=document.getElementById("v104-retro-credits");
    if(old)old.remove();
    UI.endText.insertAdjacentHTML("beforeend",`<section id="v104-retro-credits" class="v104-retro-credits"><h3>C64 GAME PICKUPS COLLECTED THIS RUN — ${history.length}</h3>${block}${note}</section>`);
    renderCompletionCredits();
  }

  if(typeof endRun==="function"){
    const originalEndRun=endRun;
    endRun=function endRunV104RetroCredits(){
      const result=originalEndRun.apply(this,arguments);
      renderRetroCredits();
      loadGameSlugs().then(renderRetroCredits);
      return result;
    };
  }

  const style=document.createElement("style");
  style.id="lost-sizzler-v104-final-ui-style";
  style.textContent=`
    .v104-retro-credits{margin-top:18px;padding:14px;border:1px solid rgba(255,216,90,.5);background:rgba(15,9,20,.72);text-align:left}
    .v104-retro-credits h3{margin:0 0 10px;color:#ffd85a;font-size:13px;letter-spacing:.6px}
    .v104-credit-game{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px dotted rgba(255,255,255,.12);color:#faf4ff;font-size:11px;line-height:1.35}
    .v104-credit-actions{display:flex;align-items:center;gap:10px}.v104-credit-game b{color:#6cecff}.v104-credit-game a{color:#ffd85a;text-decoration:underline;text-underline-offset:2px}.v104-credit-empty{color:#b9aec8;font-size:11px}.v104-retro-credits small{display:block;margin-top:10px;color:#9f93ad;font-size:9px;line-height:1.45}.v108-completion-credits p{margin:0 0 12px;color:#faf4ff;font-size:11px;line-height:1.5}.v108-special-thanks{display:grid;gap:5px;padding:10px;border:1px solid rgba(255,216,90,.28);background:rgba(255,216,90,.06);font-size:10px;line-height:1.45}.v108-special-thanks b{color:#ffd85a}.v108-end-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.v108-end-actions a,.v108-end-actions button{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:8px 10px;border:1px solid rgba(108,236,255,.42);background:rgba(108,236,255,.08);color:#faf4ff;text-decoration:none;font-size:10px}.v108-end-actions .primary{border-color:rgba(255,216,90,.55);background:rgba(255,216,90,.12);color:#ffd85a}
    #end>.panel{width:min(900px,96%)!important;max-height:min(92vh,880px);overflow:auto}
    .v106-enemy-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:8px}.v106-enemy-credit{display:grid;grid-template-columns:58px 1fr;gap:10px;align-items:center;padding:8px;border:1px solid rgba(108,236,255,.18);background:rgba(3,2,5,.42)}.v106-enemy-credit.named{border-color:rgba(255,216,90,.38)}.v106-enemy-avatar{position:relative;display:grid;place-items:center;width:54px;height:54px;border:1px solid rgba(108,236,255,.45);background:#120c1b;overflow:hidden}.v106-enemy-credit.named .v106-enemy-avatar{border-color:#ffd85a}.v106-enemy-avatar img,.v106-enemy-avatar-fallback,.v106-enemy-avatar-canvas{position:absolute;inset:0;width:100%;height:100%}.v106-enemy-avatar img{z-index:1;object-fit:cover;image-rendering:pixelated}.v106-enemy-avatar-fallback{z-index:1;display:grid;place-items:center;color:#6cecff;font-weight:bold;font-size:12px;background:radial-gradient(circle at 50% 35%,#2f2550,#090611 72%)}.v106-enemy-avatar-canvas{z-index:2;image-rendering:pixelated}.v106-enemy-credit h4{margin:0;color:#faf4ff;font-size:11px}.v106-enemy-credit h4 b{color:#ffd85a}.v106-enemy-credit p{margin:3px 0 0;color:#9f93ad;font-size:9px}.v106-enemy-credit small{margin-top:3px;color:#6cecff;font-size:9px}
  `;
  document.head.appendChild(style);
  loadGameSlugs();
})();
