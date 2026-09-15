/* C64 Dungeon Carnage V10.42 — unified title/menu presentation.
 * Presentation-only layer. It retires duplicate/stale public UI without
 * changing gameplay, progression, multiplayer simulation or save data.
 */
(()=>{
  "use strict";
  if(window.__CCG_DUNGEON_CARNAGE_UNIFIED_UI__)return;
  window.__CCG_DUNGEON_CARNAGE_UNIFIED_UI__=true;

  const RETIRED_ID="ccg-retired-menu-content";
  const HORDE_BOARD_ID="horde-leaderboard";
  const DEV_LOG_ID="developer-changelog";
  let observer=null;
  let sweepQueued=false;

  function injectStyle(){
    if(document.getElementById("ccg-v142-unified-ui-style"))return;
    const style=document.createElement("style");
    style.id="ccg-v142-unified-ui-style";
    style.textContent=`
      /* One public startup owner: the current Dungeon Carnage menu. */
      #ccg-release-loading{display:none!important;visibility:hidden!important;pointer-events:none!important}
      #${HORDE_BOARD_ID}{display:none!important}
      #${RETIRED_ID}{display:none!important}

      body[data-run-active="false"] main.ccg-game>.critical-strip,
      body[data-run-active="false"] main.ccg-game>.mission,
      body[data-run-active="false"] main.ccg-game>.fullscreen-hint,
      body[data-run-active="false"] main.ccg-game>.tactical-zone,
      body[data-run-active="false"] main.ccg-game>.player-hub,
      body[data-run-active="false"] main.ccg-game .game-message-rail,
      body[data-run-active="false"] main.ccg-game .canvas-wrap{display:none!important}

      body[data-run-active="false"] main.ccg-game>.topbar{
        min-height:0!important;margin:0!important;padding:10px 16px!important;
        border:0!important;background:transparent!important;box-shadow:none!important;
        justify-content:flex-end!important
      }
      body[data-run-active="false"] main.ccg-game>.topbar .brand,
      body[data-run-active="false"] main.ccg-game>.topbar #net-status,
      body[data-run-active="false"] main.ccg-game>.topbar .build-badge,
      body[data-run-active="false"] main.ccg-game>.topbar #quit-btn{display:none!important}
      body[data-run-active="false"] main.ccg-game>.topbar .system-buttons{gap:8px!important}
      body[data-run-active="false"] main.ccg-game>.topbar .sound-toggle{
        min-height:36px!important;padding:8px 12px!important;font-size:9px!important;opacity:.82
      }

      body[data-run-active="false"] main.ccg-game>.game-area{
        display:block!important;min-height:0!important;margin:0!important;padding:0 16px 28px!important
      }
      body[data-run-active="false"] #menu.overlay{
        position:relative!important;inset:auto!important;display:block!important;
        min-height:0!important;padding:0!important;background:transparent!important;
        overflow:visible!important;z-index:20!important
      }
      body[data-run-active="false"] #menu.overlay.hidden{display:none!important}
      body[data-run-active="false"] #menu>.panel{
        width:min(880px,100%)!important;max-width:880px!important;max-height:none!important;
        margin:0 auto!important;padding:26px clamp(18px,3vw,34px) 22px!important;
        overflow:visible!important;border:1px solid rgba(108,236,255,.28)!important;
        border-radius:18px!important;background:linear-gradient(155deg,rgba(16,9,25,.985),rgba(5,7,13,.99))!important;
        box-shadow:0 24px 80px rgba(0,0,0,.54),inset 0 1px rgba(255,255,255,.035)!important
      }

      #menu .pixel-title-lockup{margin:0 auto 14px!important;padding:0!important}
      #menu .pixel-title-lockup h2{margin:3px 0 4px!important;font-size:clamp(31px,5.1vw,58px)!important;line-height:.96!important}
      #menu .pixel-title-lockup em{font-size:clamp(8px,1.3vw,11px)!important;letter-spacing:.14em!important}
      #menu .pixel-title-ccg{font-size:8px!important;opacity:.7}
      #menu .pixel-title-quest{font-size:8px!important;letter-spacing:.15em!important;opacity:.8}
      #menu .menu-blurb{max-width:620px!important;margin:10px auto 14px!important;color:#cfc5d8!important;font-size:12px!important;line-height:1.55!important;text-align:center!important}

      #menu .beta-stage-disclaimer,
      #menu .desktop-play-recommendation{
        display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;
        min-height:28px!important;margin:0 4px 14px!important;padding:5px 9px!important;
        border:1px solid rgba(255,255,255,.12)!important;border-radius:999px!important;
        background:rgba(255,255,255,.035)!important;color:#afa5b8!important;
        font-size:7.5px!important;line-height:1.25!important;letter-spacing:.08em!important;vertical-align:top!important
      }
      #menu .beta-stage-disclaimer{border-color:rgba(255,216,90,.28)!important;color:#ffd85a!important}
      #menu .desktop-play-recommendation strong{color:#6cecff!important;font-size:7.5px!important}
      #menu .desktop-play-recommendation span{color:#afa5b8!important}

      #menu .menu-config{
        display:grid!important;grid-template-columns:minmax(0,1fr) minmax(190px,.55fr)!important;
        gap:10px!important;max-width:650px!important;margin:2px auto 18px!important;padding:0!important
      }
      #menu .menu-config .field{margin:0!important}
      #menu .menu-config input,#menu .menu-config select{min-height:42px!important}

      #menu .mode-select-label{
        margin:0 0 9px!important;color:#736a7b!important;font-size:7px!important;letter-spacing:.17em!important
      }
      #menu .game-mode-buttons.ccg-unified-modes{
        display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;
        max-width:760px!important;margin:0 auto 14px!important
      }
      #menu .game-mode-buttons.ccg-unified-modes button{
        min-height:46px!important;margin:0!important;padding:9px 10px!important;border-radius:9px!important;
        font-size:9px!important;line-height:1.15!important;letter-spacing:.035em!important
      }
      #menu .game-mode-buttons.ccg-unified-modes #solo-btn{grid-column:span 2!important;min-height:54px!important;font-size:12px!important}
      #menu .game-mode-buttons.ccg-unified-modes #tutorial-zone-btn{grid-column:span 2!important;min-height:54px!important;font-size:11px!important}
      #menu .game-mode-buttons.ccg-unified-modes #continue-save-btn{grid-column:1/-1!important;order:3!important}
      #menu .game-mode-buttons.ccg-unified-modes #create-btn{order:10!important}
      #menu .game-mode-buttons.ccg-unified-modes #horde-mode-btn{order:11!important}
      #menu .game-mode-buttons.ccg-unified-modes #saboteurs-mode-btn{order:12!important}
      #menu .game-mode-buttons.ccg-unified-modes #split-btn{order:13!important}
      #menu .game-mode-buttons.ccg-unified-modes #daily-btn{order:14!important;grid-column:span 2!important}

      #menu .join-row{
        display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;
        max-width:520px!important;margin:10px auto 12px!important;padding:10px!important;
        border:1px solid rgba(185,120,255,.16)!important;border-radius:10px!important;background:rgba(185,120,255,.035)!important
      }
      #menu .join-row input,#menu .join-row button{min-height:40px!important;margin:0!important}

      #menu .ccg-quick-controls{
        margin:12px auto!important;padding:8px 10px!important;max-width:650px!important;
        border-top:1px solid rgba(255,255,255,.07)!important;border-bottom:1px solid rgba(255,255,255,.07)!important;
        color:#8f8499!important;font:700 8px/1.5 "Courier New",monospace!important;letter-spacing:.035em!important;text-align:center!important
      }
      #menu .ccg-quick-controls kbd{color:#d9d0df!important;background:transparent!important;border:0!important;padding:0!important}

      #menu .secondary-menu{
        display:flex!important;flex-wrap:wrap!important;justify-content:center!important;gap:7px!important;
        margin:12px auto 0!important;padding:0!important
      }
      #menu .secondary-menu>*{min-height:34px!important;margin:0!important;padding:7px 10px!important;font-size:8px!important}
      #menu .game-copyright{margin:14px 0 0!important;color:#5f5765!important;font-size:6.5px!important;letter-spacing:.1em!important}

      #ccg-weekly-board-wrap,
      #${DEV_LOG_ID}{
        max-width:700px!important;margin:9px auto 0!important;border:1px solid rgba(255,255,255,.08)!important;
        border-radius:9px!important;background:rgba(255,255,255,.018)!important
      }
      #ccg-weekly-board-wrap>summary,
      #${DEV_LOG_ID}>summary{
        cursor:pointer!important;padding:9px 11px!important;color:#aaa0b3!important;
        font-size:8px!important;letter-spacing:.07em!important;list-style:none!important
      }
      #ccg-weekly-board-wrap>summary::-webkit-details-marker,
      #${DEV_LOG_ID}>summary::-webkit-details-marker{display:none!important}
      #ccg-weekly-board-wrap[open]>summary,
      #${DEV_LOG_ID}[open]>summary{color:#6cecff!important;border-bottom:1px solid rgba(255,255,255,.06)!important}
      #ccg-weekly-board-wrap #weekly-vault{margin:0!important;padding:12px!important;border:0!important;background:transparent!important}
      #${DEV_LOG_ID} .developer-changelog-body{padding:11px!important}
      #${DEV_LOG_ID} .developer-changelog-intro{margin:0!important;color:#82788c!important;font-size:8px!important;line-height:1.5!important}
      #${DEV_LOG_ID} .developer-changelog-latest{color:#6f6678!important;font-size:7px!important}

      @media(max-width:720px){
        body[data-run-active="false"] main.ccg-game>.topbar{padding:8px 10px!important}
        body[data-run-active="false"] main.ccg-game>.game-area{padding:0 8px 18px!important}
        body[data-run-active="false"] #menu>.panel{padding:20px 13px 16px!important;border-radius:13px!important}
        #menu .menu-config{grid-template-columns:1fr!important;max-width:100%!important}
        #menu .game-mode-buttons.ccg-unified-modes{grid-template-columns:1fr 1fr!important;gap:7px!important}
        #menu .game-mode-buttons.ccg-unified-modes #solo-btn,
        #menu .game-mode-buttons.ccg-unified-modes #tutorial-zone-btn{grid-column:span 1!important;min-height:50px!important}
        #menu .game-mode-buttons.ccg-unified-modes #daily-btn{grid-column:1/-1!important}
        #menu .desktop-play-recommendation span{display:none!important}
      }
      @media(max-width:440px){
        #menu .pixel-title-lockup h2{font-size:30px!important}
        #menu .game-mode-buttons.ccg-unified-modes{grid-template-columns:1fr!important}
        #menu .game-mode-buttons.ccg-unified-modes #solo-btn,
        #menu .game-mode-buttons.ccg-unified-modes #tutorial-zone-btn,
        #menu .game-mode-buttons.ccg-unified-modes #daily-btn{grid-column:1!important}
        #menu .join-row{grid-template-columns:1fr!important}
        #menu .ccg-quick-controls{font-size:7px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function retiredStash(panel){
    let stash=document.getElementById(RETIRED_ID);
    if(stash)return stash;
    stash=document.createElement("div");
    stash.id=RETIRED_ID;
    stash.hidden=true;
    stash.setAttribute("aria-hidden","true");
    panel.appendChild(stash);
    return stash;
  }

  function moveRetiredMenuCopy(panel){
    const stash=retiredStash(panel);
    const selectors=[".feature-strip",".online-howto","#collection-summary","#menu-note",".keys-help"];
    for(const selector of selectors){
      const node=panel.querySelector(selector);
      if(node&&node.parentElement!==stash)stash.appendChild(node);
    }
  }

  function wrapWeeklyBoard(panel){
    const board=document.getElementById("weekly-vault");
    if(!board||board.closest("#ccg-weekly-board-wrap"))return;
    const details=document.createElement("details");
    details.id="ccg-weekly-board-wrap";
    const summary=document.createElement("summary");
    summary.textContent="VIEW WEEKLY HIGH-SCORE VAULT LEADERBOARD";
    board.before(details);
    details.append(summary,board);
  }

  function quickControls(panel){
    if(panel.querySelector(".ccg-quick-controls"))return;
    const row=document.createElement("p");
    row.className="ccg-quick-controls";
    row.innerHTML="<kbd>WASD / ARROWS</kbd> MOVE &nbsp;·&nbsp; <kbd>SPACE</kbd> ATTACK &nbsp;·&nbsp; <kbd>SHIFT</kbd> DASH &nbsp;·&nbsp; <kbd>TAB</kbd> INVENTORY";
    const secondary=panel.querySelector(".secondary-menu");
    if(secondary)secondary.before(row);else panel.appendChild(row);
  }

  function simplifyMenu(){
    const menu=document.getElementById("menu"),panel=menu?.querySelector(":scope > .panel");
    if(!panel)return false;
    if(menu.dataset.ccgUnifiedUi!=="true"){
      menu.dataset.ccgUnifiedUi="true";
      const blurb=panel.querySelector(".menu-blurb");
      if(blurb)blurb.textContent="Five floors. Fight, loot, level up and get out alive — solo, local or online.";
      const beta=panel.querySelector(".beta-stage-disclaimer");
      if(beta)beta.textContent="BETA BUILD";
      const desktop=panel.querySelector(".desktop-play-recommendation");
      if(desktop)desktop.innerHTML="<strong>DESKTOP RECOMMENDED</strong><span>Keyboard and a larger screen give the best experience.</span>";
      const label=panel.querySelector(".mode-select-label");
      if(label)label.textContent="CHOOSE A MODE";
      const modes=panel.querySelector(".game-mode-buttons");
      modes?.classList.add("ccg-unified-modes");
      const labels={
        "solo-btn":"PLAY SOLO",
        "tutorial-zone-btn":"TUTORIAL",
        "create-btn":"DUNGEON CO-OP",
        "horde-mode-btn":"HORDE",
        "saboteurs-mode-btn":"SPY VS SPY",
        "daily-btn":"WEEKLY VAULT",
        "split-btn":"2P SPLIT SCREEN"
      };
      for(const [id,text] of Object.entries(labels)){const button=document.getElementById(id);if(button)button.textContent=text}
      moveRetiredMenuCopy(panel);
      wrapWeeklyBoard(panel);
      quickControls(panel);
    }
    return true;
  }

  function clearDevelopmentLog(){
    const log=document.getElementById(DEV_LOG_ID);
    if(!log)return false;
    log.open=false;
    log.querySelectorAll(".developer-log-day,.developer-log-monitoring,.developer-changelog-foot").forEach(node=>node.remove());
    const latest=log.querySelector(".developer-changelog-latest");
    if(latest)latest.textContent="LOG CLEARED · 15 SEP 2026";
    const intro=log.querySelector(".developer-changelog-intro");
    if(intro){
      intro.innerHTML="<span><strong>LIVE DEVELOPMENT LOG.</strong> No public development entries are currently listed.</span>";
      intro.dataset.ccgCleared="true";
    }
    return true;
  }

  function retireHordeLeaderboard(){
    const board=document.getElementById(HORDE_BOARD_ID);
    if(!board)return false;
    board.remove();
    return true;
  }

  function retireLegacyLoadingUi(){
    const overlay=document.getElementById("ccg-release-loading");
    if(!overlay)return false;
    overlay.setAttribute("aria-hidden","true");
    overlay.setAttribute("inert","");
    overlay.classList.add("ccg-retired-startup-loader");
    return true;
  }

  function sweep(){
    sweepQueued=false;
    injectStyle();
    simplifyMenu();
    clearDevelopmentLog();
    retireHordeLeaderboard();
    retireLegacyLoadingUi();
  }

  function queueSweep(){
    if(sweepQueued)return;
    sweepQueued=true;
    queueMicrotask(sweep);
  }

  injectStyle();
  sweep();
  observer=new MutationObserver(queueSweep);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener("pagehide",()=>{observer?.disconnect();observer=null},{once:true});

  window.CCGDungeonCarnageUnifiedUi={
    simplifyMenu,
    clearDevelopmentLog,
    retireHordeLeaderboard,
    retireLegacyLoadingUi
  };
})();
