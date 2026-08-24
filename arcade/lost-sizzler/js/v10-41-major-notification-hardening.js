/* The Lost Sizzler V10.41 — durable major-alert and Dungeon Bounty hardening. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_MAJOR_NOTIFICATION_HARDENING__)return;
  window.__CCG_LOST_SIZZLER_V141_MAJOR_NOTIFICATION_HARDENING__=true;

  const state={timer:0,toastSource:null,voiceSource:null,lastBountyAt:0,lastBountyKind:""};
  const majorApi=()=>window.CCGLostSizzlerV141LandingNotificationPolish||null;

  function isMajorTitle(title){
    const text=String(title||"").toUpperCase();
    return /BOUNTY|GAME OVER|RUN OVER|WEEKLY.*OVER|FINAL XP WARNING|PERMA|DEATH STALKER|COUNT LOADULA|HORDE WARDEN|WARDEN|BOSS|SIGIL LOCKDOWN|ARENA LOCKDOWN|TIMED CHAMBER|FLOOR MUTATION|BANISHMENT READY/.test(text);
  }

  function showBounty(kind="start"){
    const now=performance.now();
    if(state.lastBountyKind===kind&&now-state.lastBountyAt<1200)return false;
    state.lastBountyAt=now;state.lastBountyKind=kind;
    const api=majorApi();if(!api?.showMajor)return false;
    if(kind==="complete")return api.showMajor("DUNGEON BOUNTY COMPLETE","Bounty objective completed. Your reward has been awarded.","green",7600);
    return api.showMajor("NEW DUNGEON BOUNTY","A bonus objective is now active. Check the current objective and quest display before moving on.","gold",9000);
  }

  function wrapToast(){
    const current=window.showToast;
    if(typeof current!=="function")return false;
    if(current.__ccgV141MajorHardening===true){state.toastSource=current;return true}
    if(current.__ccgV141Priority===true){state.toastSource=current;return true}
    const wrapped=function showToastV141MajorHardening(title,text,tone,duration){
      const upper=String(title||"").toUpperCase();
      if(/NEW DUNGEON BOUNTY|BOUNTY START/.test(upper)){showBounty("start");return true}
      if(/BOUNTY COMPLETE|DUNGEON BOUNTY COMPLETE/.test(upper)){showBounty("complete");return true}
      if(isMajorTitle(title)&&majorApi()?.showMajor)return majorApi().showMajor(title,text,tone,duration||8000);
      return current.apply(this,arguments);
    };
    wrapped.__ccgV141MajorHardening=true;wrapped.__ccgV141Original=current;
    window.showToast=wrapped;state.toastSource=wrapped;return true;
  }

  function wrapVoice(){
    const voice=window.CCGLostSizzlerVoice,current=voice?.say;
    if(typeof current!=="function")return false;
    if(current.__ccgV141MajorVisual===true){state.voiceSource=current;return true}
    const wrapped=function sayV141MajorVisual(key){
      const eventKey=String(key||"");
      if(eventKey==="bountyStart")showBounty("start");
      else if(eventKey==="bounty")showBounty("complete");
      return current.apply(this,arguments);
    };
    wrapped.__ccgV141MajorVisual=true;wrapped.__ccgV141Original=current;
    voice.say=wrapped;state.voiceSource=wrapped;return true;
  }

  function ensure(){
    const api=majorApi();if(!api?.showMajor)return false;
    // Enhancement scripts load dynamically. Keep checking so a late wrapper can
    // never remove the major-alert priority system after the page has started.
    if(window.showToast!==state.toastSource||!window.showToast?.__ccgV141Priority&&!window.showToast?.__ccgV141MajorHardening)wrapToast();
    const voice=window.CCGLostSizzlerVoice;if(voice?.say!==state.voiceSource||!voice?.say?.__ccgV141MajorVisual)wrapVoice();
    return true;
  }

  state.timer=setInterval(ensure,300);ensure();
  window.addEventListener("pagehide",()=>clearInterval(state.timer),{once:true});
  window.CCGLostSizzlerV141MajorNotificationHardening={showBounty,get state(){return state}};
})();