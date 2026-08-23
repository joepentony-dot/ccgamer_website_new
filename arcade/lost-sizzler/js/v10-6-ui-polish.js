/* The Lost Sizzler — V10.6 concise menu, carried-item HUD and guest Weekly Dungeon pass. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_UI_V106__)return;
  window.__CCG_LOST_SIZZLER_UI_V106__=true;

  const ICON_ROOT="assets/item-icons/";
  const ICONS={
    potion:`${ICON_ROOT}potion.svg`,
    torch:`${ICON_ROOT}torch.svg`,
    teleport:`${ICON_ROOT}teleport.svg`,
    banishment:`${ICON_ROOT}banishment.svg`,
    key:`${ICON_ROOT}main-key.svg`,
    bronze:`${ICON_ROOT}bronze-key.svg`,
    exitSigil:`${ICON_ROOT}exit-sigil.svg`,
    loot:`${ICON_ROOT}artefact.svg`
  };
  const html=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const originalItemIcon=typeof itemIconSVG==="function"?itemIconSVG:null;

  function visualKind(kind){
    if(kind==="artefact")return"loot";
    if(kind==="mana")return"ammo";
    return kind;
  }

  function itemArt(kind,label=""){
    const key=visualKind(kind),custom=window.CCG_ASSET_OVERRIDES?.images?.items?.[kind]||window.CCG_ASSET_OVERRIDES?.images?.items?.[key],src=custom||ICONS[key];
    if(!src)return originalItemIcon?originalItemIcon(kind,label):"";
    return `<span class="item-svg-wrap item-art-wrap item-${html(key)}" title="${html(label||key)}"><img class="item-art" src="${html(src)}" alt="" aria-hidden="true"></span>`;
  }

  if(originalItemIcon){
    try{itemIconSVG=itemArt}catch(error){console.warn("[Lost Sizzler] item art override unavailable",error)}
  }

  function compactMenu(){
    const menu=document.getElementById("menu"),panel=menu?.querySelector(":scope > .panel");
    if(!panel||panel.dataset.conciseMenu==="true")return;
    panel.dataset.conciseMenu="true";

    const title=panel.querySelector("h2"),intro=title?.nextElementSibling;
    if(intro?.tagName==="P")intro.textContent="A five-floor C64 dungeon crawl: rescue games, build your loadout and survive whatever the Vault throws at you.";

    const desktop=panel.querySelector(".desktop-play-recommendation");
    if(desktop)desktop.innerHTML="<strong>DESKTOP RECOMMENDED</strong><span>Mobile works too; keyboard and a larger screen are easier.</span>";

    const features=panel.querySelector(".feature-strip");
    if(features)features.innerHTML="<span><b>5 FLOORS</b>Changing objectives</span><span><b>RPG LOOT</b>Weapons, XP & items</span><span><b>1–4 PLAYERS</b>Solo, local or online</span>";

    const weeklyButton=document.getElementById("daily-btn");
    if(weeklyButton&&!window.CCGWeeklyChallenge?.state?.ready)weeklyButton.textContent="Weekly Dungeon";

    const online=panel.querySelector(".online-howto");
    if(online)online.innerHTML="<div class='online-compact'><b>ONLINE · UP TO 4 PLAYERS</b><span>Create a room, share its code, or enter a code below.</span></div>";

    const join=panel.querySelector(".join-row");
    if(join&&online)online.insertAdjacentElement("afterend",join);

    const section=document.getElementById("weekly-vault");
    if(section&&section.tagName!=="DETAILS"){
      const details=document.createElement("details");
      details.id=section.id;
      details.className=section.className;
      details.dataset.weeklyDetails="true";
      const summary=document.createElement("summary");
      summary.innerHTML="<b>WEEKLY LEADERBOARD</b><span>Optional — sign in only to compete</span>";
      details.appendChild(summary);
      for(const child of [...section.children]){
        if(child.id==="weekly-vault-title")continue;
        details.appendChild(child);
      }
      section.replaceWith(details);
      const note=details.querySelector(".weekly-leaderboard-note");
      if(note)note.textContent="Same dungeon seed for everyone. Ranked scores reset every Monday.";
      const links=details.querySelectorAll(".weekly-auth-actions a");
      if(links[0])links[0].textContent="Create account for leaderboard";
      if(links[1])links[1].textContent="Sign in";
    }

    const secondary=panel.querySelector(".secondary-menu");
    if(secondary){
      const rulebook=document.getElementById("rulebook-btn"),support=document.getElementById("support-btn"),exit=secondary.querySelector(".menu-exit-link");
      if(rulebook)rulebook.textContent="Rulebook";
      if(support)support.textContent="Support / Share";
      if(exit)exit.textContent="Exit Game";
    }

    const note=document.getElementById("menu-note");
    if(note)note.textContent="Weekly Dungeon is free to play. Sign in only if you want one ranked leaderboard attempt each week.";

    const controls=panel.querySelector(".keys-help");
    if(controls&&!controls.closest("details")){
      const details=document.createElement("details");
      details.className="menu-details controls-details";
      const summary=document.createElement("summary");
      summary.textContent="Controls";
      controls.parentNode.insertBefore(details,controls);
      details.append(summary,controls);
    }

    const collection=document.getElementById("collection-summary");
    if(collection)collection.classList.add("compact-collection");
  }

  const originalRefreshCollection=typeof refreshCollection==="function"?refreshCollection:null;
  if(originalRefreshCollection){
    try{
      refreshCollection=function(){
        originalRefreshCollection();
        const collection=document.getElementById("collection-summary");
        if(collection)collection.textContent=`RESCUED C64 TITLES ON THIS DEVICE: ${PGR.persistentCollection().length}`;
      };
      refreshCollection();
    }catch(error){console.warn("[Lost Sizzler] collection summary polish unavailable",error)}
  }

  function inventoryCount(kind){
    try{return Math.max(0,Number(PGR.inventoryKindCount(p1,kind)||0))}catch(_){return 0}
  }

  function carriedRow({kind,name,qty,key="",desc,tone=""}){
    return `<div class="carried-item ${tone?`carried-${html(tone)}`:""}">${itemArt(kind,name)}<div class="carried-copy"><b>${html(name)}</b><span>${html(desc)}</span></div><div class="carried-meta">${key?`<kbd>${html(key)}</kbd>`:""}<strong>${html(qty)}</strong></div></div>`;
  }

  function renderCarriedItems(){
    const target=document.getElementById("item-shortcuts");
    if(!target||typeof p1==="undefined"||!p1||typeof host==="undefined"||!host)return;
    const rows=[];
    const potions=inventoryCount("potion"),torches=inventoryCount("torch"),teleports=inventoryCount("teleport"),flasks=inventoryCount("banishment"),artefacts=inventoryCount("artefact");
    if(potions)rows.push(carriedRow({kind:"potion",name:"RESTORATION POTION",qty:`×${potions}`,key:"E",desc:"Restore health and 8 ammo.",tone:"green"}));
    if(torches||p1.torchMs>0)rows.push(carriedRow({kind:"torch",name:"FLAMING TORCH",qty:p1.torchMs>0?`${Math.ceil(p1.torchMs/1000)}s · ×${torches}`:`×${torches}`,key:"Q",desc:"Light the dungeon temporarily.",tone:"gold"}));
    if(teleports)rows.push(carriedRow({kind:"teleport",name:"TELEPORT SPELL",qty:`×${teleports}`,key:"R",desc:"Warp to a safe explored room.",tone:"purple"}));
    if(flasks)rows.push(carriedRow({kind:"banishment",name:"BANISHMENT FLASK",qty:`×${flasks}`,key:"B",desc:"Destroy a nearby Death Stalker.",tone:"purple"}));
    if(artefacts)rows.push(carriedRow({kind:"loot",name:"RARE ARTEFACT",qty:`×${artefacts}`,desc:"Trade 3 at a shop for a Banishment Flask.",tone:"cyan"}));

    rows.push(carriedRow({kind:"key",name:"MAIN VAULT KEYS",qty:`${host.keysCollected||0}/${C.keyTarget}`,desc:"Floor objective — collected automatically.",tone:"gold"}));
    if(p1.bronzeKeys>0)rows.push(carriedRow({kind:"bronze",name:"BRONZE KEYS",qty:`×${p1.bronzeKeys}`,desc:"Open optional bronze doors and chests.",tone:"gold"}));
    if(host.exitSigilCollected)rows.push(carriedRow({kind:"exitSigil",name:"EXIT SIGIL",qty:"HELD",desc:"Required to unlock the floor exit.",tone:"gold"}));

    target.innerHTML=rows.join("");
  }

  const originalSync=typeof sync==="function"?sync:null;
  if(originalSync){
    try{
      sync=function(){const result=originalSync();renderCarriedItems();return result;};
    }catch(error){console.warn("[Lost Sizzler] carried item HUD hook unavailable",error)}
  }

  function prepareCarriedPanel(){
    const dock=document.querySelector(".shortcut-dock"),head=dock?.querySelector(".shortcut-dock-head"),commands=dock?.querySelector(".command-grid"),items=document.getElementById("item-shortcuts");
    if(!dock)return;
    const heading=head?.querySelector("h3"),tag=head?.querySelector("span");
    if(heading)heading.textContent="CARRIED ITEMS";
    if(tag)tag.textContent="LIVE LOADOUT";
    if(items&&commands&&items.nextElementSibling!==commands)dock.insertBefore(items,commands);
    if(commands){
      commands.classList.add("base-controls");
      commands.innerHTML="<span><kbd>WASD</kbd><b>MOVE</b></span><span><kbd>SPACE</kbd><b>FIRE</b></span><span><kbd>SHIFT</kbd><b>DASH</b></span><span><kbd>TAB</kbd><b>FULL INVENTORY</b></span>";
    }
    renderCarriedItems();
  }

  const originalBeginRun=typeof beginRun==="function"?beginRun:null;
  if(originalBeginRun){
    try{
      beginRun=function(options={}){
        const result=originalBeginRun(options);
        if(options.daily&&typeof run!=="undefined"&&run){
          const ranked=Boolean(options.weekly?.attempt?.id);
          run.weeklyRanked=ranked;
          showToast(
            ranked?"WEEKLY DUNGEON — RANKED":"WEEKLY DUNGEON — UNRANKED",
            ranked
              ?`This is your one leaderboard attempt for the week. Same seed, Arcade rules, and death ends the run. Playing as ${playerName()}.`
              :"Same weekly seed and Arcade rules as the leaderboard run. No account is required, and this score will not be submitted.",
            "gold",
            10000
          );
        }
        return result;
      };
    }catch(error){console.warn("[Lost Sizzler] Weekly Dungeon wording hook unavailable",error)}
  }

  const originalEndRun=typeof endRun==="function"?endRun:null;
  if(originalEndRun){
    try{
      endRun=function(reason){
        const weekly=Boolean(run?.daily),ranked=Boolean(run?.weeklyAttemptId),failed=Boolean(run?.dailyFailed);
        const result=originalEndRun(reason);
        if(weekly&&UI?.endTitle)UI.endTitle.textContent=failed?"WEEKLY DUNGEON ENDED":"WEEKLY DUNGEON COMPLETE";
        if(weekly&&!ranked&&UI?.endText){
          const marker="<br><br><strong>WEEKLY RESULT</strong>";
          const current=UI.endText.innerHTML,index=current.indexOf(marker);
          if(index>=0)UI.endText.innerHTML=current.slice(0,index)+"<br><br><strong>UNRANKED WEEKLY DUNGEON</strong><br>This run was not submitted. Play again whenever you like, or sign in before a future run to compete on the leaderboard.";
        }
        return result;
      };
    }catch(error){console.warn("[Lost Sizzler] Weekly Dungeon result hook unavailable",error)}
  }

  async function startGuestWeekly(event){
    const state=window.CCGWeeklyChallenge?.state;
    if(state?.signedIn)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(!state?.ready||!state?.seed){
      showToast("WEEKLY DUNGEON UNAVAILABLE","The weekly seed could not be loaded. Try again in a moment; normal Solo play is still available.","red",7000);
      window.CCGWeeklyChallenge?.refresh?.();
      return;
    }
    const audio=S.start(),fullscreen=requestPlayFullscreen();
    await Promise.all([audio,fullscreen]);
    net.setSolo(playerName());
    beginRun({split:false,daily:true,seed:state.seed,weekly:{weekStart:state.weekStart,attempt:null}});
  }

  const weeklyButton=document.getElementById("daily-btn");
  weeklyButton?.addEventListener("click",startGuestWeekly,true);

  function refreshMusicAfterAdminLoad(){
    if(document.body.dataset.runActive!=="true")return;
    try{S.stopMusic();S.startMusic()}catch(error){console.warn("[Lost Sizzler] could not refresh custom music",error)}
  }
  window.addEventListener("ccg:admin-audio-ready",refreshMusicAfterAdminLoad);
  if(window.CCG_ADMIN_AUDIO_READY)refreshMusicAfterAdminLoad();

  compactMenu();
  prepareCarriedPanel();
  window.CCGWeeklyChallenge?.refresh?.();
})();
