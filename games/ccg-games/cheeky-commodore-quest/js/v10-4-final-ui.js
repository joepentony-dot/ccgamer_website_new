/* The Lost Sizzler V10.4 — final lighting and retro-run credits. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_FINAL_UI_V104__)return;
  window.__CCG_LOST_SIZZLER_FINAL_UI_V104__=true;

  const NORMAL_SIGHT_RADIUS=4.5;

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

  function renderRetroCredits(){
    if(!UI?.endText)return;
    const history=gameHistory();
    const counts=new Map();
    for(const raw of history){const title=String(raw||"").trim();if(title)counts.set(title,(counts.get(title)||0)+1)}
    const entries=[...counts.entries()];
    const block=entries.length
      ? entries.map(([title,count])=>`<div class="v104-credit-game"><span>▸ ${esc(title)}</span>${count>1?`<b>×${count}</b>`:""}</div>`).join("")
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
      return result;
    };
  }

  const style=document.createElement("style");
  style.id="lost-sizzler-v104-final-ui-style";
  style.textContent=`
    .v104-retro-credits{margin-top:18px;padding:14px;border:1px solid rgba(255,216,90,.5);background:rgba(15,9,20,.72);text-align:left}
    .v104-retro-credits h3{margin:0 0 10px;color:#ffd85a;font-size:13px;letter-spacing:.6px}
    .v104-credit-game{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px dotted rgba(255,255,255,.12);color:#faf4ff;font-size:11px;line-height:1.35}
    .v104-credit-game b{color:#6cecff}.v104-credit-empty{color:#b9aec8;font-size:11px}.v104-retro-credits small{display:block;margin-top:10px;color:#9f93ad;font-size:9px;line-height:1.45}
  `;
  document.head.appendChild(style);
})();
