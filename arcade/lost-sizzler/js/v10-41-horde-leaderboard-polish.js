/* The Lost Sizzler V10.41 — Horde Survivor leaderboard presentation polish. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_HORDE_BOARD_POLISH__)return;
  window.__CCG_LOST_SIZZLER_V141_HORDE_BOARD_POLISH__=true;

  const STORAGE_KEY="ccg-lost-sizzler:horde-leaderboard:v1";
  const CATEGORIES=["SOLO","DUO","TRIO","SQUAD"];
  let observer=null,timer=0;

  function readCounts(){
    const counts=Object.fromEntries(CATEGORIES.map(category=>[category,0]));
    try{
      const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
      if(parsed&&typeof parsed==="object")for(const category of CATEGORIES)counts[category]=Array.isArray(parsed[category])?Math.min(10,parsed[category].length):0;
    }catch(_){}
    return counts;
  }

  function ensureStyle(){
    if(document.getElementById("ccg-v141-horde-board-polish-style"))return;
    const style=document.createElement("style");
    style.id="ccg-v141-horde-board-polish-style";
    style.textContent=`
      #horde-leaderboard{position:relative!important;margin:16px 0!important;padding:18px 20px 20px!important;border:1px solid rgba(255,216,90,.48)!important;border-radius:15px!important;background:radial-gradient(circle at 8% 0,rgba(255,216,90,.075),transparent 24rem),linear-gradient(145deg,rgba(18,10,25,.98),rgba(6,4,10,.99))!important;box-shadow:inset 0 1px rgba(255,255,255,.025),0 12px 30px rgba(0,0,0,.22)!important;overflow:hidden}
      #horde-leaderboard:before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:linear-gradient(#ffd85a,#b978ff 62%,transparent);opacity:.92}
      #horde-leaderboard .horde-board-head{display:grid!important;grid-template-columns:minmax(300px,.8fr) minmax(360px,1.2fr)!important;gap:24px!important;align-items:end!important;margin:0 0 15px!important;padding:0 2px 13px!important;border-bottom:1px solid rgba(185,120,255,.17)}
      #horde-leaderboard .horde-title-block{min-width:0}
      #horde-leaderboard .horde-board-kicker{display:block;margin-bottom:5px;color:#b978ff;font:800 8px/1.2 "Courier New",monospace;letter-spacing:.2em;text-transform:uppercase}
      #horde-leaderboard h3{margin:0!important;color:#ffd85a!important;font-size:18px!important;line-height:1.05!important;letter-spacing:.095em!important;text-shadow:0 0 16px rgba(255,216,90,.12)}
      #horde-leaderboard .horde-board-head>span{max-width:none!important;margin:0!important;color:#bdb1c8!important;font-size:9.5px!important;line-height:1.5!important;text-align:right!important}
      #horde-leaderboard .horde-board-tabs{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:7px!important;margin:0 0 11px!important}
      #horde-leaderboard .horde-board-tabs button{display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;min-height:44px!important;padding:7px 10px!important;border:1px solid #7543bb!important;border-bottom-width:3px!important;background:linear-gradient(180deg,#251337,#170c24)!important;color:#ede7f3!important;box-shadow:inset 0 1px rgba(255,255,255,.035)!important;font-size:10px!important;letter-spacing:.055em!important;transition:transform .08s ease,filter .12s ease,border-color .12s ease!important}
      #horde-leaderboard .horde-board-tabs button:hover{filter:brightness(1.14)}
      #horde-leaderboard .horde-board-tabs button[aria-pressed="true"]{border-color:#ffd85a!important;background:linear-gradient(180deg,rgba(255,216,90,.17),rgba(70,45,10,.34))!important;color:#ffd85a!important;box-shadow:inset 0 0 18px rgba(255,216,90,.055),0 0 16px rgba(255,216,90,.055)!important}
      #horde-leaderboard .horde-board-tabs button strong{font:900 10px/1 "Courier New",monospace}
      #horde-leaderboard .horde-tab-count{display:grid;place-items:center;min-width:21px;height:19px;padding:0 5px;border:1px solid rgba(255,255,255,.15);border-radius:9px;background:#09060e;color:#9f93aa;font:800 8px/1 "Courier New",monospace}
      #horde-leaderboard .horde-board-tabs button[aria-pressed="true"] .horde-tab-count{border-color:rgba(255,216,90,.42);color:#ffd85a}
      #horde-leaderboard .horde-board-columns{display:grid;grid-template-columns:48px minmax(0,1fr) 170px 130px;gap:10px;align-items:center;padding:5px 11px 6px;color:#73697c;font:800 7px/1.2 "Courier New",monospace;letter-spacing:.12em;text-transform:uppercase}
      #horde-leaderboard.is-empty .horde-board-columns{display:none}
      #horde-leaderboard ol{display:grid!important;gap:5px!important;margin:0!important;padding:0!important;list-style:none!important;min-height:0!important}
      #horde-leaderboard li:not(.horde-empty){display:grid!important;grid-template-columns:48px minmax(0,1fr) 170px 130px!important;gap:10px!important;align-items:center!important;min-height:45px!important;padding:7px 11px!important;border:1px solid rgba(185,120,255,.16)!important;border-left:3px solid rgba(185,120,255,.27)!important;background:linear-gradient(90deg,rgba(255,255,255,.028),rgba(255,255,255,.012))!important;font:700 9.5px/1.25 "Courier New",monospace!important;transition:border-color .12s ease,background .12s ease!important}
      #horde-leaderboard li:not(.horde-empty):hover{border-color:rgba(185,120,255,.34)!important;background:linear-gradient(90deg,rgba(185,120,255,.07),rgba(255,255,255,.014))!important}
      #horde-leaderboard li[data-rank="1"]{border-left-color:#ffd85a!important;background:linear-gradient(90deg,rgba(255,216,90,.075),rgba(255,255,255,.014))!important}
      #horde-leaderboard li[data-rank="2"]{border-left-color:#c6ced8!important}#horde-leaderboard li[data-rank="3"]{border-left-color:#bc7b49!important}
      #horde-leaderboard li .rank{color:#ffd85a!important;text-align:left!important;font-size:11px!important}#horde-leaderboard li .names{min-width:0;color:#f3edf7!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #horde-leaderboard li .wave{color:#6cecff!important;text-align:right;white-space:nowrap}#horde-leaderboard li .score{color:#72ff9b!important;text-align:right!important;font-size:10px!important;white-space:nowrap}
      #horde-leaderboard li .score:after{content:" PTS";color:#635b69;font-size:6px;letter-spacing:.05em}
      #horde-leaderboard .horde-warden-badge{display:inline-block;margin-left:7px;padding:2px 5px;border:1px solid rgba(255,216,90,.35);border-radius:7px;background:rgba(255,216,90,.07);color:#ffd85a;font-size:6.5px;letter-spacing:.05em;vertical-align:1px}
      #horde-leaderboard .horde-empty{display:flex!important;grid-template-columns:none!important;align-items:center!important;justify-content:center!important;gap:14px!important;min-height:92px!important;padding:16px!important;border:1px dashed rgba(185,120,255,.23)!important;background:linear-gradient(90deg,rgba(185,120,255,.035),rgba(255,216,90,.02))!important;color:#9d91a8!important;text-align:left!important;white-space:normal!important}
      #horde-leaderboard .horde-empty-mark{display:grid;place-items:center;flex:0 0 42px;width:42px;height:42px;border:1px solid rgba(255,216,90,.32);border-radius:50%;background:#09060e;color:#ffd85a;font:900 18px/1 "Courier New",monospace;box-shadow:inset 0 0 14px rgba(255,216,90,.04)}
      #horde-leaderboard .horde-empty-copy{min-width:0}.horde-empty-copy b{display:block;margin-bottom:4px;color:#e9e1ee;font-size:10px;letter-spacing:.06em}.horde-empty-copy span{display:block;color:#82768d;font-size:8px;line-height:1.45}
      @media(max-width:820px){#horde-leaderboard{padding:14px!important}#horde-leaderboard .horde-board-head{grid-template-columns:1fr!important;gap:7px!important;align-items:start!important}#horde-leaderboard .horde-board-head>span{text-align:left!important}#horde-leaderboard .horde-board-columns,#horde-leaderboard li:not(.horde-empty){grid-template-columns:36px minmax(0,1fr) 115px!important}#horde-leaderboard .horde-board-columns span:last-child,#horde-leaderboard .horde-board-score{display:none!important}}
      @media(max-width:560px){#horde-leaderboard .horde-board-tabs{grid-template-columns:1fr 1fr!important}#horde-leaderboard .horde-board-columns{display:none!important}#horde-leaderboard li:not(.horde-empty){grid-template-columns:30px minmax(0,1fr) auto!important;padding:7px 8px!important}.horde-warden-badge{display:none!important}#horde-leaderboard .horde-empty{min-height:78px!important;gap:9px!important}.horde-empty-mark{flex-basis:34px!important;width:34px!important;height:34px!important;font-size:14px!important}}
    `;
    document.head.appendChild(style);
  }

  function decorateHeader(section){
    const head=section.querySelector(".horde-board-head"),title=head?.querySelector("h3");
    if(!head||!title)return;
    if(!head.querySelector(".horde-title-block")){
      const block=document.createElement("div");block.className="horde-title-block";
      const kicker=document.createElement("span");kicker.className="horde-board-kicker";kicker.textContent="LOCAL HALL OF FAME";
      title.before(block);block.append(kicker,title);
    }
    const copy=head.querySelector(":scope > span");
    if(copy)copy.textContent="Your ten strongest runs are kept on this device. Warden kills rank first, followed by highest wave, score and fastest completion.";
  }

  function decorateTabs(section){
    const counts=readCounts();
    for(const button of section.querySelectorAll("[data-horde-category]")){
      const category=String(button.dataset.hordeCategory||"");
      let label=button.querySelector("strong"),count=button.querySelector(".horde-tab-count");
      if(!label){button.textContent="";label=document.createElement("strong");label.textContent=category;button.appendChild(label)}
      if(!count){count=document.createElement("span");count.className="horde-tab-count";button.appendChild(count)}
      count.textContent=String(counts[category]||0);
      count.title=`${counts[category]||0} saved ${category.toLowerCase()} run${counts[category]===1?"":"s"}`;
    }
  }

  function ensureColumns(section,list){
    let columns=section.querySelector(".horde-board-columns");
    if(!columns){
      columns=document.createElement("div");columns.className="horde-board-columns";columns.setAttribute("aria-hidden","true");
      columns.innerHTML="<span>RANK</span><span>PLAYER / TEAM</span><span>RESULT</span><span>SCORE</span>";
      list.before(columns);
    }
  }

  function decorateList(section,list){
    const empty=list.querySelector(".horde-empty");section.classList.toggle("is-empty",Boolean(empty));
    if(empty){
      if(empty.dataset.polished!=="true"){
        const category=String(section.querySelector('[data-horde-category][aria-pressed="true"]')?.dataset?.hordeCategory||"SOLO");
        empty.dataset.polished="true";
        empty.innerHTML=`<span class="horde-empty-mark" aria-hidden="true">★</span><span class="horde-empty-copy"><b>NO ${category} RECORDS YET</b><span>Finish a Horde Survivor run and your best result will appear here automatically.</span></span>`;
      }
      return;
    }
    [...list.children].forEach((row,index)=>{
      if(!(row instanceof HTMLElement))return;row.dataset.rank=String(index+1);
      const names=row.querySelector(".names");
      if(names&&!names.querySelector(".horde-warden-badge")&&names.textContent.includes(" · WARDEN DOWN")){
        names.textContent=names.textContent.replace(" · WARDEN DOWN","");
        const badge=document.createElement("span");badge.className="horde-warden-badge";badge.textContent="WARDEN DOWN";names.appendChild(badge);
      }
    });
  }

  function decorate(){
    const section=document.getElementById("horde-leaderboard"),list=document.getElementById("horde-leaderboard-list");if(!section||!list)return false;
    ensureStyle();decorateHeader(section);decorateTabs(section);ensureColumns(section,list);decorateList(section,list);
    if(!observer){
      observer=new MutationObserver(()=>{decorateTabs(section);decorateList(section,list)});
      observer.observe(section,{subtree:true,childList:true,attributes:true,attributeFilter:["aria-pressed"]});
    }
    return true;
  }

  timer=setInterval(()=>{if(decorate()){clearInterval(timer);timer=0}},100);
  window.addEventListener("storage",event=>{if(event.key===STORAGE_KEY)decorate()});
  window.addEventListener("pagehide",()=>{if(timer)clearInterval(timer);observer?.disconnect?.()},{once:true});
})();
