/* The Lost Sizzler V10.5 — visible online multiplayer guidance and invite links. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_MULTIPLAYER_HELP_V105__)return;
  window.__CCG_LOST_SIZZLER_MULTIPLAYER_HELP_V105__=true;

  let lastInviteRoom="";

  function roomInviteUrl(roomCode){
    const url=new URL(window.location.href);
    url.search="";
    url.hash="";
    url.searchParams.set("room",String(roomCode||"").trim().toUpperCase());
    return url.toString();
  }

  function copyText(text){
    if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);
    const input=document.createElement("textarea");
    input.value=text;input.setAttribute("readonly","");input.style.position="fixed";input.style.opacity="0";
    document.body.appendChild(input);input.select();document.execCommand("copy");input.remove();
    return Promise.resolve();
  }

  function addStyles(){
    if(document.getElementById("v105-multiplayer-help-style"))return;
    const style=document.createElement("style");
    style.id="v105-multiplayer-help-style";
    style.textContent=`
      #v105-online-help{margin:12px 0;padding:12px 14px;border:1px solid rgba(108,236,255,.55);background:rgba(10,7,16,.82);line-height:1.55;text-align:left}
      #v105-online-help strong{color:#6cecff;letter-spacing:.6px}
      #v105-online-help b{color:#ffd85a}
      .v105-invite-panel{margin-top:8px;padding-top:8px;border-top:1px solid rgba(108,236,255,.35);pointer-events:auto}
      .v105-invite-panel label{display:block;color:#6cecff;font-size:9px;letter-spacing:.8px;margin-bottom:5px}
      .v105-invite-link{display:block;width:100%;box-sizing:border-box;padding:6px;background:#08050d;border:1px solid #745797;color:#fff;font:700 9px "Courier New",monospace}
      .v105-invite-actions{display:flex;gap:5px;margin-top:6px}
      .v105-invite-actions button{flex:1;padding:6px;border:1px solid #ffd85a;background:#120b18;color:#ffd85a;font:700 9px "Courier New",monospace;cursor:pointer}
      .v105-invite-actions button:hover,.v105-invite-actions button:focus{background:#2a1835;color:#fff}
      .v104-room-chip.v105-invite-ready{pointer-events:auto;min-width:min(330px,calc(100vw - 24px))}
      @media(max-width:620px){.v104-room-chip.v105-invite-ready{left:8px;right:8px;min-width:0}.v105-invite-actions{flex-wrap:wrap}.v105-invite-actions button{min-width:110px}}
    `;
    document.head.appendChild(style);
  }

  function addMultiplayerHelp(){
    const createButton=document.getElementById("create-btn");
    const joinRow=document.querySelector(".join-row");
    if(!createButton||!joinRow||document.getElementById("v105-online-help"))return;

    const buttonRow=createButton.closest(".menu-buttons");
    if(!buttonRow||!buttonRow.parentNode)return;

    const help=document.createElement("div");
    help.id="v105-online-help";
    help.className="collection-summary";
    help.setAttribute("role","note");
    help.setAttribute("aria-label","Online multiplayer instructions");
    help.innerHTML="<strong>ONLINE MULTIPLAYER — UP TO 4 PLAYERS</strong><br><b>HOST:</b> Enter your name, choose a difficulty, press <b>Create Online Room</b>, then copy the invite link and send it to up to three friends.<br><b>JOIN:</b> Open the invite link, enter your name, then press <b>Join Online Room</b>. The room code is filled in for you.<br>The host should remain connected while the room is active.";

    buttonRow.insertAdjacentElement("afterend",help);
    help.insertAdjacentElement("afterend",joinRow);
  }

  function prefillRoomFromInvite(){
    const code=window.CCGNetwork?.cleanCode?.(new URLSearchParams(window.location.search).get("room")||"")||"";
    if(code.length<4)return;
    const roomInput=document.getElementById("room-code");
    if(roomInput)roomInput.value=code;
    const note=document.getElementById("menu-note");
    if(note)note.textContent=`MULTIPLAYER INVITE RECEIVED — room ${code} is ready. Enter your player name, then press Join Online Room.`;
    const help=document.getElementById("v105-online-help");
    if(help)help.scrollIntoView({block:"nearest"});
  }

  function addInviteControls(){
    if(typeof net==="undefined"||!net?.connected||!net.roomCode||typeof playMode==="undefined"||playMode!=="online")return;
    const roomCode=String(net.roomCode).trim().toUpperCase();
    const chip=document.getElementById("v104-room-chip");
    if(!chip)return;

    chip.classList.add("v105-invite-ready");
    let panel=chip.querySelector(".v105-invite-panel");
    if(!panel){
      panel=document.createElement("div");
      panel.className="v105-invite-panel";
      panel.innerHTML='<label for="v105-invite-link">INVITE LINK — COPY & SEND TO FRIENDS</label><input id="v105-invite-link" class="v105-invite-link" type="text" readonly><div class="v105-invite-actions"><button id="v105-copy-invite" type="button">COPY INVITE LINK</button><button id="v105-share-invite" type="button">SHARE INVITE</button></div>';
      chip.appendChild(panel);

      panel.querySelector("#v105-copy-invite")?.addEventListener("click",async event=>{
        event.preventDefault();event.stopPropagation();
        const link=panel.querySelector("#v105-invite-link")?.value||"";
        try{await copyText(link);event.currentTarget.textContent="COPIED";setTimeout(()=>{event.currentTarget.textContent="COPY INVITE LINK"},1600)}catch(_){event.currentTarget.textContent="COPY FAILED"}
      });

      panel.querySelector("#v105-share-invite")?.addEventListener("click",async event=>{
        event.preventDefault();event.stopPropagation();
        const link=panel.querySelector("#v105-invite-link")?.value||"";
        const text=`Join my Lost Sizzler multiplayer room ${roomCode}`;
        try{
          if(navigator.share)await navigator.share({title:"The Lost Sizzler Multiplayer",text,url:link});
          else{await copyText(link);event.currentTarget.textContent="LINK COPIED";setTimeout(()=>{event.currentTarget.textContent="SHARE INVITE"},1600)}
        }catch(error){if(error?.name!=="AbortError")console.warn("Lost Sizzler invite share failed",error)}
      });
    }

    const link=roomInviteUrl(roomCode);
    const linkInput=panel.querySelector("#v105-invite-link");
    if(linkInput)linkInput.value=link;
    if(lastInviteRoom!==roomCode){
      lastInviteRoom=roomCode;
      try{showToast("MULTIPLAYER INVITE READY","Copy the invite link from the ONLINE ROOM panel and send it to your friends.","cyan",9000)}catch(_){}
    }
  }

  addStyles();
  addMultiplayerHelp();
  prefillRoomFromInvite();
  addInviteControls();
  setInterval(addInviteControls,350);
})();
