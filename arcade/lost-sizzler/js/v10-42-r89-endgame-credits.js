/* C64 Dungeon Carnage V10.42 R89 — substantial completion, credits and supporter presentation. */
(()=>{
  "use strict";
  if(window.__CCG_DUNGEON_R89_ENDGAME_CREDITS__)return;
  window.__CCG_DUNGEON_R89_ENDGAME_CREDITS__=true;

  const GAME_URL="https://www.cheekycommodoregamer.co.uk/arcade/c64-dungeon-carnage/";
  const FEEDBACK_EMAIL="info@cheekycommodoregamer.co.uk";
  const DONATE_URL="https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL";
  const SUPPORTERS=Object.freeze(["AZALEA","CPU"]);
  let endMusic=null;

  const escapeHtml=value=>String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const formatScore=value=>Math.max(0,Math.floor(Number(value)||0)).toLocaleString("en-GB");
  function formatTime(value){
    const seconds=Math.max(0,Math.floor((Number(value)||0)/1000)),hours=Math.floor(seconds/3600),mins=Math.floor((seconds%3600)/60),secs=seconds%60;
    return hours?hours+":"+String(mins).padStart(2,"0")+":"+String(secs).padStart(2,"0"):mins+":"+String(secs).padStart(2,"0");
  }

  function ensureStyle(){
    if(document.getElementById("ccg-r89-endgame-style"))return;
    const style=document.createElement("style");style.id="ccg-r89-endgame-style";
    style.textContent="#end .ccg-r89-endgame-panel{width:min(1120px,96vw)!important;max-height:calc(100dvh - 24px)!important;text-align:left!important;padding:0!important;overflow:auto!important;border-color:#ff334b!important;background:radial-gradient(circle at 50% 0,rgba(130,28,43,.28),transparent 36%),linear-gradient(180deg,#16080d,#070409 72%)!important;box-shadow:0 0 0 1px rgba(255,216,90,.22),0 28px 90px rgba(0,0,0,.82),0 0 54px rgba(255,51,75,.18)!important}#end .ccg-r89-endgame-panel>#end-title{margin:0;padding:24px 24px 4px;text-align:center;color:#ffd85a!important;text-shadow:0 0 18px rgba(255,216,90,.32)}#end .ccg-r89-endgame-panel>#end-text{margin:0;padding:0 24px 18px;text-align:center;color:#e8dfe9}.ccg-r89-endgame{padding:0 22px 24px}.ccg-r89-kicker{text-align:center;color:#ff8b9a;font:900 10px/1.4 Courier New,monospace;letter-spacing:.22em}.ccg-r89-lead{max-width:820px;margin:8px auto 18px;text-align:center;color:#d8cfdb;font-size:12px;line-height:1.55}.ccg-r89-stats{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:8px;margin:14px 0 22px}.ccg-r89-stat{padding:11px 10px;border:1px solid rgba(108,236,255,.25);background:rgba(255,255,255,.035);text-align:center}.ccg-r89-stat span{display:block;color:#9e93a5;font:800 8px/1.3 Courier New,monospace;letter-spacing:.08em}.ccg-r89-stat b{display:block;margin-top:4px;color:#fff;font-size:15px}.ccg-r89-section{margin:16px 0;padding:15px;border:1px solid rgba(255,216,90,.24);background:rgba(13,8,17,.72)}.ccg-r89-section h3{margin:0 0 5px;color:#ffd85a;font-size:16px;letter-spacing:.05em}.ccg-r89-section>p{margin:0 0 12px;color:#bbb0c1;font-size:11px;line-height:1.5}.ccg-r89-enemies{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.ccg-r89-enemy{display:grid;grid-template-columns:64px 1fr;gap:9px;align-items:center;min-height:78px;padding:7px;border:1px solid rgba(108,236,255,.2);background:#08060c}.ccg-r89-enemy canvas{width:64px;height:64px;image-rendering:pixelated;border:1px solid rgba(255,255,255,.1);background:#06040a}.ccg-r89-enemy b{display:block;color:#fff;font-size:10px}.ccg-r89-enemy strong{display:block;color:#ff8b9a;font-size:13px}.ccg-r89-enemy small{display:block;margin-top:3px;color:#8f8496;font-size:8px;line-height:1.35}.ccg-r89-supporters{text-align:center;border-color:rgba(255,216,90,.42);background:linear-gradient(135deg,rgba(255,216,90,.07),rgba(185,120,255,.06))}.ccg-r89-supporter-names{margin:8px 0;color:#fff;font-size:20px;font-weight:900;letter-spacing:.12em}.ccg-r89-credits{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ccg-r89-credit{padding:10px;border-left:3px solid #6cecff;background:rgba(108,236,255,.045)}.ccg-r89-credit b{display:block;color:#6cecff;font-size:9px;letter-spacing:.08em}.ccg-r89-credit span{display:block;margin-top:4px;color:#efe7f2;font-size:11px;line-height:1.4}.ccg-r89-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:18px 0 6px}.ccg-r89-actions a,.ccg-r89-actions button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:9px 13px;border:2px solid #b978ff;background:#241336;color:#fff;font-weight:900;text-decoration:none;box-shadow:3px 3px 0 #000}.ccg-r89-actions .primary{border-color:#ffd85a;background:#ffd85a;color:#160b1e}.ccg-r89-actions .support{border-color:#ff8b9a}.ccg-r89-share-status{text-align:center;min-height:18px;color:#72ff9b;font:800 9px/1.4 Courier New,monospace}.ccg-r89-complete-mark{text-align:center;margin:18px 0 6px;color:#ffd85a;font:900 12px/1.4 Courier New,monospace;letter-spacing:.14em}#end .ccg-r89-endgame-panel>#again-btn{display:block;margin:0 auto 24px;min-width:220px}@media(max-width:760px){.ccg-r89-stats{grid-template-columns:repeat(2,1fr)}.ccg-r89-credits{grid-template-columns:1fr}.ccg-r89-enemies{grid-template-columns:1fr}.ccg-r89-endgame{padding:0 10px 18px}#end .ccg-r89-endgame-panel>#end-title{padding:18px 10px 4px}#end .ccg-r89-endgame-panel>#end-text{padding:0 10px 12px}}";
    document.head.appendChild(style);
  }

  function stopEndMusic(){
    try{if(endMusic){endMusic.pause();endMusic.currentTime=0}}catch(_){}
    endMusic=null;
  }

  function playEndMusic(){
    stopEndMusic();
    const src=String(window.CCG_CONFIG&&window.CCG_CONFIG.adminAudio&&window.CCG_CONFIG.adminAudio.endgame||"").trim();
    if(!src)return false;
    try{
      const audio=new Audio(src);audio.preload="auto";audio.volume=.58;audio.loop=false;
      const started=audio.play();if(started&&typeof started.catch==="function")started.catch(()=>{});
      endMusic=audio;return true;
    }catch(_){return false}
  }

  function shareData(snapshot){
    const completed=Boolean(snapshot.completed),score=formatScore(snapshot.score),floors=Math.max(1,Number(snapshot.deepest)||1),maxFloors=Math.max(1,Number(snapshot.maxFloors)||15);
    return{title:"C64 Dungeon Carnage",text:completed?"I cleared all "+maxFloors+" floors of C64 Dungeon Carnage with "+score+" points.":"I reached Floor "+floors+" in C64 Dungeon Carnage with "+score+" points.",url:GAME_URL};
  }

  async function shareCompletion(snapshot,statusNode){
    const data=shareData(snapshot);
    try{
      if(navigator.share){await navigator.share(data);if(statusNode)statusNode.textContent="Completion shared.";return true}
      if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(data.text+" "+data.url);if(statusNode)statusNode.textContent="Completion text and game link copied.";return true}
    }catch(error){
      if(String(error&&error.name||"")!=="AbortError"&&statusNode)statusNode.textContent="Sharing was not completed.";
      return false;
    }
    if(statusNode)statusNode.textContent="Share: "+data.text+" "+data.url;
    return false;
  }

  function feedbackHref(snapshot){
    const subject=encodeURIComponent("C64 Dungeon Carnage feedback");
    const body=encodeURIComponent(["C64 Dungeon Carnage feedback","","Result: "+(snapshot.completed?"CAMPAIGN COMPLETE":"RUN ENDED"),"Score: "+formatScore(snapshot.score),"Deepest floor: "+snapshot.deepest+"/"+snapshot.maxFloors,"Level: "+snapshot.level,"Run time: "+formatTime(snapshot.elapsed),"","My feedback:"].join("\n"));
    return "mailto:"+FEEDBACK_EMAIL+"?subject="+subject+"&body="+body;
  }

  function renderEnemyRoll(root,rows){
    const list=Array.isArray(rows)?rows.filter(row=>Number(row&&row.count)>0):[];
    if(!list.length){root.innerHTML="<p>No defeated-enemy entries were recorded for this run.</p>";return}
    const ordered=list.slice().sort((a,b)=>Number(Boolean(b.named))-Number(Boolean(a.named))||Number(b.count)-Number(a.count)||String(a.name).localeCompare(String(b.name)));
    ordered.forEach((row,index)=>{
      const card=document.createElement("article");card.className="ccg-r89-enemy";card.dataset.creditIndex=String(index);
      const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;canvas.setAttribute("aria-label",String(row.name||"Enemy")+" gameplay sprite");
      const copy=document.createElement("div"),floors=(row.floors||[]).map(entry=>"F"+entry.floor+"×"+entry.count).join(" · ");
      copy.innerHTML="<b>"+escapeHtml(row.name||"Enemy")+"</b><strong>×"+Math.max(1,Number(row.count)||1)+"</strong><small>"+escapeHtml(floors||"Defeated during this run")+"</small>";
      card.append(canvas,copy);root.appendChild(card);
      requestAnimationFrame(()=>{try{if(typeof window.CCGRenderEnemyCreditAvatar==="function")window.CCGRenderEnemyCreditAvatar(canvas,row)}catch(_){}});
    });
  }

  function stat(label,value){return '<div class="ccg-r89-stat"><span>'+escapeHtml(label)+'</span><b>'+escapeHtml(value)+'</b></div>'}

  function render(snapshot){
    snapshot=snapshot||{};ensureStyle();
    const end=document.getElementById("end"),panel=end&&end.querySelector(".panel"),title=document.getElementById("end-title"),text=document.getElementById("end-text"),again=document.getElementById("again-btn");
    if(!end||!panel||!title||!text||!again)return false;
    const old=panel.querySelector("#ccg-r89-endgame-content");if(old)old.remove();
    panel.classList.remove("compact");panel.classList.add("ccg-r89-endgame-panel");

    const completed=Boolean(snapshot.completed),daily=Boolean(snapshot.daily),failed=Boolean(snapshot.dailyFailed||snapshot.xpGameOver),maxFloors=Math.max(1,Number(snapshot.maxFloors)||15);
    title.textContent=completed?"C64 DUNGEON CARNAGE COMPLETE":snapshot.xpGameOver?"GAME OVER — XP DEPLETED":daily?(failed?"WEEKLY VAULT ATTEMPT ENDED":"WEEKLY VAULT COMPLETE"):"RUN COMPLETE";
    text.textContent=completed?"The Blood Citadel is cleared. Your fifteen-floor campaign is complete.":String(snapshot.reason||"Run ended.");
    again.textContent="Return to Menu";

    const root=document.createElement("div");root.id="ccg-r89-endgame-content";root.className="ccg-r89-endgame";
    const player=escapeHtml(snapshot.player||"Player"),weapon=String(snapshot.weapon||"Field Pulse"),collection=Math.max(0,Number(snapshot.collectionCount)||0);
    let html='<div class="ccg-r89-kicker">'+(completed?"THE DESCENT IS OVER":"RUN RECORD")+'</div>';
    html+='<p class="ccg-r89-lead">'+(completed?player+" survived all "+maxFloors+" floors, completed the Sigil and escaped the Blood Citadel. This is the permanent run record before returning to the menu.":"Your run record is shown below. You can share the result, send feedback or return to the menu.")+'</p>';
    html+='<section class="ccg-r89-stats" aria-label="Final run statistics">';
    html+=stat("FINAL SCORE",formatScore(snapshot.score))+stat("DEEPEST FLOOR",Math.max(1,Number(snapshot.deepest)||1)+"/"+maxFloors)+stat("RUN TIME",formatTime(snapshot.elapsed))+stat("FINAL LEVEL",Math.max(1,Number(snapshot.level)||1));
    html+=stat("XP BANKED",formatScore(snapshot.bankedXP))+stat("ENEMIES SLAIN",Math.max(0,Number(snapshot.kills)||0))+stat("CHAMPIONS",Math.max(0,Number(snapshot.champions)||0))+stat("SECRETS FOUND",Math.max(0,Number(snapshot.secrets)||0));
    html+=stat("DAMAGE TAKEN",Math.max(0,Number(snapshot.damageTaken)||0))+stat("CHESTS OPENED",Math.max(0,Number(snapshot.chests)||0))+stat("SAVED C64 TITLES",collection)+stat("FINAL WEAPON",weapon);
    html+="</section>";
    if(completed){
      html+='<section class="ccg-r89-section"><h3>DEFEATED ENEMIES</h3><p>Every recorded enemy type defeated during this campaign, rendered with the same enemy artwork used in the dungeon.</p><div class="ccg-r89-enemies" data-r89-enemy-roll></div></section>';
      html+='<section class="ccg-r89-section ccg-r89-supporters"><h3>SPECIAL ACKNOWLEDGEMENTS</h3><p>Thank you to the Patreon supporters, YouTube members, playtesters and long-term followers who have supported the Cheeky Commodore Gamer channel and this game.</p><div class="ccg-r89-supporter-names">'+SUPPORTERS.join(" · ")+'</div><p>AZALEA and CPU receive a special in-game thank-you for their long-term support.</p></section>';
      html+='<section class="ccg-r89-section"><h3>CREDITS</h3><div class="ccg-r89-credits"><div class="ccg-r89-credit"><b>CREATED FOR</b><span>The Cheeky Commodore Gamer channel</span></div><div class="ccg-r89-credit"><b>GAME</b><span>C64 Dungeon Carnage</span></div><div class="ccg-r89-credit"><b>CAMPAIGN</b><span>15 procedural floors · Blood Citadel finale</span></div><div class="ccg-r89-credit"><b>COMMUNITY</b><span>Patreon supporters, YouTube members, testers and CCG followers</span></div></div></section>';
      html+='<div class="ccg-r89-complete-mark">CAMPAIGN COMPLETE · THANKS FOR PLAYING</div>';
    }
    html+='<div class="ccg-r89-actions"><button type="button" class="primary" data-r89-share>'+(completed?"SHARE COMPLETION":"SHARE RUN")+'</button><a class="support" href="'+DONATE_URL+'" target="_blank" rel="noopener noreferrer">DONATE / BUY JOE A BEER</a><a href="'+feedbackHref(snapshot)+'" data-r89-feedback>SEND FEEDBACK</a></div><div class="ccg-r89-share-status" data-r89-share-status aria-live="polite"></div>';
    root.innerHTML=html;panel.insertBefore(root,again);
    const roll=root.querySelector("[data-r89-enemy-roll]");if(roll)renderEnemyRoll(roll,snapshot.enemyDefeats);
    const share=root.querySelector("[data-r89-share]");if(share)share.addEventListener("click",()=>shareCompletion(snapshot,root.querySelector("[data-r89-share-status]")));
    if(completed)playEndMusic();else stopEndMusic();
    end.classList.remove("hidden");return true;
  }

  addEventListener("pagehide",stopEndMusic,{once:true});
  window.CCGDungeonEndgameCredits=Object.freeze({render,shareCompletion,stopMusic:stopEndMusic,gameUrl:GAME_URL,feedbackEmail:FEEDBACK_EMAIL,donateUrl:DONATE_URL,supporters:SUPPORTERS});
})();
