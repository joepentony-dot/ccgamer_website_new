/* C64 Dungeon Carnage V10.42 r21 — public release presentation cleanup. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R21ReleasePresentation)return;

  const DISCORD_URL="https://discord.gg/83Xw9ktAn4";
  const PUBLIC_NOTE="Solo, Tutorial and 2P Split Screen run locally in your browser. Weekly High-Score Vault remains available for registered CCG website accounts.";
  const BLURB="A five-floor pixel dungeon crawl with shifting objectives, rare loot, hidden routes, distinct biome districts, character progression and dangerous encounters.";
  const obsoleteSelectors=["#create-btn","#horde-mode-btn","#saboteurs-mode-btn",".online-howto",".join-row","#online-lobby"];
  const state={removed:0,repairs:0,discordReady:false,logoReady:false};

  function removeObsoleteOnlineUi(){
    for(const selector of obsoleteSelectors){
      for(const node of document.querySelectorAll(selector)){node.remove();state.removed++}
    }
  }
  function setText(selector,value){const node=document.querySelector(selector);if(node&&node.textContent!==value){node.textContent=value;state.repairs++}return node}
  function ensureLogo(){
    const logo=document.querySelector(".v102-brand img,.brand img");if(!logo)return false;
    const source="/resources/images/ccgamer-logo.png";
    if(logo.getAttribute("src")!==source){logo.setAttribute("src",source);state.repairs++}
    logo.setAttribute("alt","Cheeky Commodore Gamer logo");state.logoReady=true;return true;
  }
  function ensureDiscord(){
    const menu=document.querySelector("#menu .panel");if(!menu)return false;
    let link=menu.querySelector(".lost-sizzler-discord-cta");
    if(!link){
      link=document.createElement("a");link.className="lost-sizzler-discord-cta";
      const anchor=menu.querySelector(".desktop-play-recommendation")||menu.querySelector(".menu-blurb");
      anchor?.insertAdjacentElement("afterend",link);
    }
    link.href=DISCORD_URL;link.target="_blank";link.rel="noopener noreferrer";
    link.innerHTML="<b>JOIN OUR DISCORD TO DISCUSS THE GAME</b><span>Feedback, playtesting and C64 Dungeon Carnage discussion.</span>";
    state.discordReady=true;return true;
  }
  function rewriteFeatures(){
    const rows=document.querySelectorAll("#menu .feature-strip > span");if(rows.length<3)return false;
    const values=[
      ["5-FLOOR RUN","Changing objectives, rare routes and increasing danger"],
      ["RPG PROGRESSION","Combat and XP pickups drive levels, build choices and equipment"],
      ["EXPANDED BIOMES","Forest, prison, library, forge, flooded, mines, graveyard, web and outdoor districts"]
    ];
    rows.forEach((row,index)=>{const spec=values[index];if(!spec)return;const html=`<b>${spec[0]}</b>${spec[1]}`;if(row.innerHTML!==html){row.innerHTML=html;state.repairs++}});return true;
  }
  function tidy(){
    removeObsoleteOnlineUi();ensureLogo();ensureDiscord();rewriteFeatures();
    setText("#menu .menu-blurb",BLURB);
    setText("#menu-note",PUBLIC_NOTE);
    document.body.dataset.v142ReleasePresentation="true";
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",tidy,{once:true});else tidy();
  addEventListener("ccg:v142-ready",()=>queueMicrotask(tidy));

  window.CCGLostSizzlerV142R21ReleasePresentation=Object.freeze({version:"V10.42-r21",DISCORD_URL,PUBLIC_NOTE,BLURB,state,tidy});
})();
