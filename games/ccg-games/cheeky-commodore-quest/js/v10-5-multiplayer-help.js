/* The Lost Sizzler V10.5 — visible online multiplayer start guidance. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_MULTIPLAYER_HELP_V105__)return;
  window.__CCG_LOST_SIZZLER_MULTIPLAYER_HELP_V105__=true;

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
    help.innerHTML="<strong>ONLINE MULTIPLAYER — UP TO 4 PLAYERS</strong><br><b>HOST:</b> Enter your name, choose a difficulty, press <b>Create Online Room</b>, then share the room code with up to three friends.<br><b>JOIN:</b> Enter your name and the host's room code below, then press <b>Join Online Room</b>.<br>The host should remain connected while the room is active.";

    buttonRow.insertAdjacentElement("afterend",help);
    help.insertAdjacentElement("afterend",joinRow);
  }

  addMultiplayerHelp();
})();
