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
    // Enemy entries do not depend on the async games catalogue: retain the
    // existing section and its focus target while game links are enriched.
    if(document.getElementById("v106-enemy-credits"))return;
    UI.endText.insertAdjacentHTML("beforeend",`<section id="v106-enemy-credits" class="v104-retro-credits v106-enemy-credits"><h3>ENEMIES DEFEATED THIS RUN — ${total}</h3><div class="v106-enemy-grid">${block}</div>${rows.some(row=>row.named)?'<small>Named enemies are recorded as freed from the dungeon corruption, while all other enemies are recorded as defeated.</small>':""}</section>`);
    document.querySelectorAll("#v106-enemy-credits [data-enemy-avatar-index]").forEach(canvas=>{const row=rows[Number(canvas.dataset.enemyAvatarIndex)];try{window.CCGRenderEnemyCreditAvatar?.(canvas,row)}catch(error){console.warn("Enemy credit avatar render failed",error)}})
  }

  function campaignComplete(){
    return Boolean(run?.runComplete&&!run.dailyFailed&&!run.xpGameOver&&Number(run.floor||0)>=Number(window.CCG_CONFIG?.maxFloors||15));
  }

  // R130 is strictly end-screen presentation, after canonical endRun has
  // resolved the game outcome. No rewards or save state change here.
  function finalRunHighlights(){
    const count=value=>Math.max(0,Math.floor(Number(value)||0));
    const elapsed=Math.floor(count(run?.elapsed)/1000);
    const minutes=Math.floor(elapsed/60),seconds=elapsed%60;
    return {
      floor:count(window.CCG_CONFIG?.maxFloors||15),
      level:count(p1?.level)||1,
      score:count(score),
      kills:count(run?.stats?.kills),
      secrets:count(run?.stats?.secrets),
      elapsed:`${minutes}:${String(seconds).padStart(2,"0")}`
    };
  }
  function renderCompletionCredits(){
    if(!UI?.endText)return;
    const existing=document.getElementById("v108-completion-credits");
    if(!campaignComplete()){existing?.remove();return}
    // The asynchronous C64 slug lookup renders retro credits again. Do not
    // restart music, replace DOM or restart the ceremony when it finishes.
    if(existing)return;
    const highlights=finalRunHighlights();
    UI.endText.insertAdjacentHTML("afterbegin",`<section id="v108-completion-credits" class="v104-retro-credits v108-completion-credits v130-finale" aria-labelledby="v130-victory-heading">
      <div class="v130-cinematic-header">
        <span class="v130-victory-kicker">FLOOR ${highlights.floor} — THE FINAL DESCENT</span>
        <span class="v130-victory-mark" aria-hidden="true"><span class="v130-mark-ring"><span class="v130-mark-core">CCG</span></span></span>
        <h3 id="v130-victory-heading">CAMPAIGN COMPLETE — BLOOD CITADEL CLEARED</h3>
        <p class="v130-victory-lead">The Blood Archivist is defeated. The Iron, Bone and Ash keys have served their purpose, and your escape from the Citadel is complete.</p>
      </div>
      <div class="v130-final-chapters" aria-label="Campaign finale">
        <article class="v130-final-chapter"><b>01</b><div><strong>THE THREE KEYS</strong><span>Iron. Bone. Ash. The journey through all ${highlights.floor} floors is over.</span></div></article>
        <article class="v130-final-chapter"><b>02</b><div><strong>THE LAST GUARDIAN</strong><span>The Citadel's final keeper has fallen. The path out is yours.</span></div></article>
        <article class="v130-final-chapter"><b>03</b><div><strong>THE RECORD REMAINS</strong><span>Your defeated enemies and recovered Commodore classics are listed below.</span></div></article>
      </div>
      <div class="v130-victory-scoreboard" aria-label="Final run highlights">
        <div><strong>${highlights.score.toLocaleString("en-GB")}</strong><span>FINAL SCORE</span></div>
        <div><strong>${highlights.level}</strong><span>HERO LEVEL</span></div>
        <div><strong>${highlights.kills}</strong><span>ENEMIES DEFEATED</span></div>
        <div><strong>${highlights.secrets}</strong><span>SECRETS FOUND</span></div>
        <div><strong>${highlights.elapsed}</strong><span>RUN TIME</span></div>
      </div>
      <div class="v130-credits-navigation" aria-label="Jump to detailed credits">
        <button type="button" id="v130-jump-bestiary">Skip Ceremony — Enemy Bestiary</button>
        <button type="button" id="v130-jump-pickups">C64 Games Collected</button>
      </div>
      <div class="v108-special-thanks"><b>SPECIAL THANKS</b><span>Patreon and long-term supporters, including AZALEA and CPU, for supporting C64 Dungeon Carnage and the Cheeky Commodore Gamer channel.</span></div>
      <div class="v108-end-actions">
        <button id="v108-end-share" type="button" class="primary">Share Completion</button>
        <a href="https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL" target="_blank" rel="noopener noreferrer">Donate / Buy Joe a Beer</a>
        <a href="mailto:info@cheekycommodoregamer.co.uk?subject=C64%20Dungeon%20Carnage%20Feedback">Send Feedback</a>
        <a href="https://www.cheekycommodoregamer.co.uk/support.html" target="_blank" rel="noopener noreferrer">CCG Support Page</a>
      </div>
      <small>Completion sharing uses the current game-page URL so the final public address can change without hardcoding a purchase link here. Continue scrolling for the actual enemy sprites and retro game pickups from your run.</small>
    </section>`);
    const jump=(buttonId,targetId)=>{
      document.getElementById(buttonId)?.addEventListener("click",()=>{
        const target=document.getElementById(targetId);
        if(!target)return;
        target.setAttribute("tabindex","-1");
        target.scrollIntoView({behavior:"auto",block:"start"});
        target.focus({preventScroll:true});
      });
    };
    jump("v130-jump-bestiary","v106-enemy-credits");
    jump("v130-jump-pickups","v104-retro-credits");
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
    const content=`<h3>C64 GAME PICKUPS COLLECTED THIS RUN — ${history.length}</h3>${block}${note}`;
    // Preserve the focused section node during async slug-link enrichment.
    // Only its contents change; skip links retain a stable keyboard target.
    if(old){if(old.innerHTML!==content)old.innerHTML=content}
    else UI.endText.insertAdjacentHTML("beforeend",`<section id="v104-retro-credits" class="v104-retro-credits">${content}</section>`);
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

    /* R130 finale: simple transform/opacity only; no timers or new game loops. */
    .v130-finale{position:relative;overflow:hidden;border-color:rgba(255,138,88,.7);background:linear-gradient(155deg,#210e17 0%,#100910 48%,#080c17 100%);box-shadow:inset 0 0 0 1px rgba(255,216,90,.08)}
    .v130-cinematic-header{text-align:center;padding:16px 8px 22px;border-bottom:1px solid rgba(255,216,90,.3)}
    .v130-victory-kicker{display:block;font-size:10px;letter-spacing:2.5px;color:#f6af78;font-weight:900}
    .v130-victory-mark{display:grid;place-items:center;height:112px;margin:12px auto;color:#ffd85a}
    .v130-mark-ring{display:grid;place-items:center;width:94px;height:94px;border:3px solid #d17d4e;outline:1px solid rgba(255,216,90,.6);outline-offset:6px;transform:rotate(45deg);box-shadow:0 0 21px rgba(222,64,47,.24),inset 0 0 18px rgba(160,34,31,.18)}
    .v130-mark-core{display:grid;place-items:center;width:57px;height:57px;border:2px solid #ffd85a;transform:rotate(-45deg);font:bold 24px/1 Consolas,'Courier New',monospace;color:#fff2c5;text-shadow:0 0 14px rgba(255,216,90,.5)}
    .v130-cinematic-header h3{color:#fff1d8;font-size:clamp(16px,3vw,27px);line-height:1.2;margin:0 auto 12px;letter-spacing:1.2px;max-width:680px}
    .v130-victory-lead{max-width:590px;margin:0 auto!important;color:#e5c4b9!important;font-size:12px!important}
    .v130-final-chapters{display:grid;gap:10px;margin:18px auto}
    .v130-final-chapter{display:flex;gap:12px;align-items:center;padding:12px;background:rgba(3,3,10,.6);border-left:3px solid #c76a4b;animation:v130-ceremony-enter .7s ease-out both}
    .v130-final-chapter:nth-child(2){animation-delay:.65s;border-left-color:#eb9948}
    .v130-final-chapter:nth-child(3){animation-delay:1.3s;border-left-color:#ffd85a}
    .v130-final-chapter>b{font:bold 24px/1 Consolas,'Courier New',monospace;color:#ecad73;min-width:40px}
    .v130-final-chapter div{display:grid;gap:4px;text-align:left}
    .v130-final-chapter strong{font-size:11px;letter-spacing:1.2px;color:#fff0d0}
    .v130-final-chapter span{font-size:11px;line-height:1.5;color:#c4b4c6}
    .v130-victory-scoreboard{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:18px 0}
    .v130-victory-scoreboard>div{display:grid;gap:7px;place-items:center;align-content:center;min-height:72px;padding:9px 4px;text-align:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,216,90,.18)}
    .v130-victory-scoreboard strong{font:bold clamp(15px,2.4vw,22px)/1 Consolas,'Courier New',monospace;color:#fff2ce}
    .v130-victory-scoreboard span{font-size:9px;line-height:1.3;letter-spacing:.5px;color:#cfbcae}
    .v130-credits-navigation{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:16px 0 20px}
    .v130-credits-navigation button{min-height:40px;padding:8px 12px;background:rgba(255,216,90,.1);border:1px solid rgba(255,216,90,.45);color:#ffdfa0;font:bold 11px/1.3 Consolas,'Courier New',monospace;cursor:pointer}
    .v130-credits-navigation button:hover,.v130-credits-navigation button:focus-visible{background:rgba(255,216,90,.22);outline:2px solid #ffd85a;outline-offset:2px}
    @keyframes v130-ceremony-enter{from{opacity:.1;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
    @media(max-width:680px){.v130-victory-scoreboard{grid-template-columns:repeat(2,minmax(0,1fr))}.v130-victory-scoreboard>div:last-child{grid-column:span 2}.v130-victory-kicker{letter-spacing:1.1px}.v130-final-chapter{padding:10px 8px}}
    @media(prefers-reduced-motion:reduce){.v130-final-chapter{animation:none!important;transform:none!important}}

    #end>.panel{width:min(900px,96%)!important;max-height:min(92vh,880px);overflow:auto}
    .v106-enemy-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:8px}.v106-enemy-credit{display:grid;grid-template-columns:58px 1fr;gap:10px;align-items:center;padding:8px;border:1px solid rgba(108,236,255,.18);background:rgba(3,2,5,.42)}.v106-enemy-credit.named{border-color:rgba(255,216,90,.38)}.v106-enemy-avatar{position:relative;display:grid;place-items:center;width:54px;height:54px;border:1px solid rgba(108,236,255,.45);background:#120c1b;overflow:hidden}.v106-enemy-credit.named .v106-enemy-avatar{border-color:#ffd85a}.v106-enemy-avatar img,.v106-enemy-avatar-fallback,.v106-enemy-avatar-canvas{position:absolute;inset:0;width:100%;height:100%}.v106-enemy-avatar img{z-index:1;object-fit:cover;image-rendering:pixelated}.v106-enemy-avatar-fallback{z-index:1;display:grid;place-items:center;color:#6cecff;font-weight:bold;font-size:12px;background:radial-gradient(circle at 50% 35%,#2f2550,#090611 72%)}.v106-enemy-avatar-canvas{z-index:2;image-rendering:pixelated}.v106-enemy-credit h4{margin:0;color:#faf4ff;font-size:11px}.v106-enemy-credit h4 b{color:#ffd85a}.v106-enemy-credit p{margin:3px 0 0;color:#9f93ad;font-size:9px}.v106-enemy-credit small{margin-top:3px;color:#6cecff;font-size:9px}
  `;
  document.head.appendChild(style);
  loadGameSlugs();
})();
