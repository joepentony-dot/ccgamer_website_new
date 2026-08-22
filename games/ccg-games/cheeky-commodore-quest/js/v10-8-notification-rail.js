/* The Lost Sizzler — V10.8 tactical notification rail.
 * Important room/item/combat notices temporarily overlay the inventory beneath
 * the radar. The existing showToast pipeline is preserved; only its visual home
 * moves, so every existing game event benefits without duplicating logic.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_NOTIFICATION_RAIL_V108__)return;
  window.__CCG_LOST_SIZZLER_NOTIFICATION_RAIL_V108__=true;

  const toast=document.getElementById("pickup-toast"),dock=document.querySelector(".shortcut-dock"),tactical=document.querySelector(".tactical-zone");
  if(!toast||!dock||!tactical)return;

  let layer=document.getElementById("tactical-notification-layer");
  if(!layer){
    layer=document.createElement("div");
    layer.id="tactical-notification-layer";
    layer.className="tactical-notification-layer";
    layer.setAttribute("aria-live","assertive");
    layer.setAttribute("aria-atomic","true");
    dock.appendChild(layer);
  }
  layer.appendChild(toast);
  toast.dataset.notificationHome="tactical-sidebar";

  function ensureVisible(){
    if(document.body.dataset.runActive!=="true")return;
    layer.classList.add("notification-active");
  }
  function clearLayer(){layer.classList.remove("notification-active")}

  const originalDisplay=typeof displayToast==="function"?displayToast:null;
  if(originalDisplay){
    displayToast=function(entry){
      ensureVisible();
      const result=originalDisplay(entry);
      requestAnimationFrame(()=>toast.classList.add("show"));
      return result;
    };
  }

  const originalUpdate=typeof updateToast==="function"?updateToast:null;
  if(originalUpdate){
    updateToast=function(dt){
      const before=toastTimer,result=originalUpdate(dt);
      if(before>0&&toastTimer<=0)clearLayer();
      return result;
    };
  }

  // Some older room reports were sent only to the small message line. Promote
  // strong room/status reports to the colourful notification rail while keeping
  // the original line updated. Ordinary flavour text remains unobtrusive.
  const originalSay=typeof say==="function"?say:null;
  if(originalSay){
    say=function(message,tone="purple"){
      const result=originalSay(message,tone),plain=String(message||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
      const strong=/<strong>/i.test(String(message||""));
      const important=strong&&/(ROOM|CHAMBER|VAULT|SANCTUARY|ALERT|LOCK|DOOR|RUN STARTED|HOST MIGRATION|KEY|SIGIL|STALKER|GENERATOR|GUARDIAN|RESCUE|TREASURE|SHOP)/i.test(plain);
      if(important&&typeof showToast==="function"){
        const split=plain.match(/^([^.!?]{3,46})[.!?]\s*(.*)$/),title=(split?.[1]||"DUNGEON UPDATE").toUpperCase(),text=split?.[2]||plain;
        showToast(title,text,tone==="purple"?"cyan":tone,6500);
      }
      return result;
    };
  }

  // If another late layer moves the toast, restore it without polling.
  const observer=new MutationObserver(()=>{if(toast.parentElement!==layer)layer.appendChild(toast)});
  observer.observe(dock,{childList:true,subtree:true});

  window.CCGLostSizzlerNotificationRailV108={layer,toast,show:ensureVisible};
})();
