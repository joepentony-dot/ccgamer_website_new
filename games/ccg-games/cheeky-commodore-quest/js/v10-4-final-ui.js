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
    const block=rows.length?rows.map(row=>{
      const initials=esc(row.initials||String(row.name||"Enemy").slice(0,2).toUpperCase()),avatar=row.avatar?`<img src="${esc(row.avatar)}" alt="${esc(row.name||"Enemy")}">`:`<span class="v106-enemy-avatar-fallback">${initials}</span>`;
      const floors=(row.floors||[]).sort((a,b)=>a.floor-b.floor).map(f=>`F${Number(f.floor||1)} ×${Number(f.count||0)}`).join(" • ");
      const killers=(row.killers||[]).map(k=>`${esc(k.name||"The Dungeon")} ×${Number(k.count||0)}`).join(" • ")||"The Dungeon";
      return `<article class="v106-enemy-credit ${row.named?"named":""}"><span class="v106-enemy-avatar">${avatar}</span><div><h4>${esc(row.name||"Enemy")} <b>×${Number(row.count||0)}</b></h4><p>${esc(floors||"Floor unknown")}</p><small>${row.named?"Freed by":"Defeated by"}: ${killers}</small></div></article>`
    }).join(""):'<div class="v104-credit-empty">No enemies were defeated on this run.</div>';
    document.getElementById("v106-enemy-credits")?.remove();
    UI.endText.insertAdjacentHTML("beforeend",`<section id="v106-enemy-credits" class="v104-retro-credits v106-enemy-credits"><h3>ENEMIES DEFEATED THIS RUN — ${total}</h3><div class="v106-enemy-grid">${block}</div>${rows.some(row=>row.named)?'<small>Named enemies are recorded as freed from the dungeon corruption, while all other enemies are recorded as defeated.</small>':""}</section>`)
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
      : '<div class="v104-credit-empty">No game collectibles were found on this run.</div>';
    const note=entries.length?'<small>Every title you picked up during this run is shown here, even if it was later lost with an unrecovered death cache.</small>':"";
    const old=document.getElementById("v104-retro-credits");
    if(old)old.remove();
    UI.endText.insertAdjacentHTML("beforeend",`<section id="v104-retro-credits" class="v104-retro-credits"><h3>GAMES COLLECTED THIS RUN — ${history.length}</h3>${block}${note}</section>`);
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
    .v104-credit-actions{display:flex;align-items:center;gap:10px}.v104-credit-game b{color:#6cecff}.v104-credit-game a{color:#ffd85a;text-decoration:underline;text-underline-offset:2px}.v104-credit-empty{color:#b9aec8;font-size:11px}.v104-retro-credits small{display:block;margin-top:10px;color:#9f93ad;font-size:9px;line-height:1.45}
    #end>.panel{width:min(900px,96%)!important;max-height:min(92vh,880px);overflow:auto}
    .v106-enemy-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:8px}.v106-enemy-credit{display:grid;grid-template-columns:46px 1fr;gap:10px;align-items:center;padding:8px;border:1px solid rgba(108,236,255,.18);background:rgba(3,2,5,.42)}.v106-enemy-credit.named{border-color:rgba(255,216,90,.38)}.v106-enemy-avatar{display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(108,236,255,.45);background:#120c1b;overflow:hidden}.v106-enemy-credit.named .v106-enemy-avatar{border-color:#ffd85a}.v106-enemy-avatar img{width:100%;height:100%;object-fit:cover;image-rendering:pixelated}.v106-enemy-avatar-fallback{display:grid;place-items:center;width:100%;height:100%;color:#6cecff;font-weight:bold;font-size:12px;background:radial-gradient(circle at 50% 35%,#2f2550,#090611 72%)}.v106-enemy-credit h4{margin:0;color:#faf4ff;font-size:11px}.v106-enemy-credit h4 b{color:#ffd85a}.v106-enemy-credit p{margin:3px 0 0;color:#9f93ad;font-size:9px}.v106-enemy-credit small{margin-top:3px;color:#6cecff;font-size:9px}
  `;
  document.head.appendChild(style);
  loadGameSlugs();
})();
