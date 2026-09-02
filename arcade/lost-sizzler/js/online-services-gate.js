/* The Lost Sizzler — local-first online services gate.
 *
 * The base game must remain playable without Supabase. Website account,
 * Weekly Vault and multiplayer services are loaded only after the player
 * deliberately enters an online feature. This also keeps Solo, Tutorial,
 * Split Screen, local saves and local achievements independent of third-party
 * availability and egress quotas.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_ONLINE_SERVICES_GATE__)return;
  window.__CCG_LOST_SIZZLER_ONLINE_SERVICES_GATE__=true;

  const RELEASE=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||"latest").trim();
  const CONFIG_SRC=`/js/ccg-supabase-config.js?v=${encodeURIComponent(RELEASE)}`;
  const CLIENT_SRC=`/js/ccg-supabase-client.js?v=${encodeURIComponent(RELEASE)}`;
  const ONLINE_BUTTONS=new Set(["daily-btn","create-btn","horde-mode-btn","saboteurs-mode-btn","join-btn"]);
  const state={active:false,activating:false,promise:null,reason:"",lastError:"",activatedAt:0};

  function loadScript(src,marker){
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[data-ccg-online-service="${marker}"]`)||document.querySelector(`script[src^="${src.split("?")[0]}"]`);
      if(existing){
        if(marker==="config"&&window.CCG_SUPABASE_URL&&window.CCG_SUPABASE_ANON_KEY){resolve(existing);return}
        if(marker==="client"&&window.ccgSupabase?.getClient){resolve(existing);return}
        existing.addEventListener("load",()=>resolve(existing),{once:true});
        existing.addEventListener("error",()=>reject(new Error(`Could not load ${marker} service.`)),{once:true});
        setTimeout(()=>{
          if(marker==="config"&&window.CCG_SUPABASE_URL&&window.CCG_SUPABASE_ANON_KEY)resolve(existing);
          else if(marker==="client"&&window.ccgSupabase?.getClient)resolve(existing);
        },0);
        return
      }
      const script=document.createElement("script");
      script.src=src;script.async=false;script.dataset.ccgOnlineService=marker;
      script.onload=()=>resolve(script);
      script.onerror=()=>reject(new Error(`Could not load ${marker} service.`));
      document.head.appendChild(script)
    })
  }

  async function activate(reason="online-feature"){
    if(state.active&&window.ccgSupabase?.getClient)return window.ccgSupabase.getClient();
    if(state.promise)return state.promise;
    state.activating=true;state.reason=String(reason||"online-feature");state.lastError="";
    state.promise=(async()=>{
      await loadScript(CONFIG_SRC,"config");
      await loadScript(CLIENT_SRC,"client");
      const bridge=window.ccgSupabase;
      if(!bridge?.getClient)throw new Error("CCG online services did not initialise.");
      const client=await bridge.getClient();
      if(!client)throw new Error("CCG online services are unavailable.");
      try{
        if(typeof bridge.waitForSessionReady==="function")await bridge.waitForSessionReady({timeoutMs:5000});
        else if(typeof bridge.waitForAuth==="function")await bridge.waitForAuth();
      }catch(error){
        /* Multiplayer does not require a signed-in website account. An auth
         * hydration failure must not prevent Realtime rooms from connecting. */
        console.warn("[Lost Sizzler] account session hydration unavailable; continuing with requested online feature.",error)
      }
      state.active=true;state.activating=false;state.activatedAt=Date.now();
      window.dispatchEvent(new CustomEvent("ccg:lost-sizzler-online-services-ready",{detail:{reason:state.reason,activatedAt:state.activatedAt}}));
      return client
    })().catch(error=>{
      state.active=false;state.activating=false;state.lastError=String(error?.message||error||"Online services unavailable");
      console.warn("[Lost Sizzler] online services activation failed",error);
      throw error
    }).finally(()=>{state.promise=null});
    return state.promise
  }

  async function refreshWeekly(){
    const weekly=window.CCGWeeklyChallenge;
    if(!weekly?.refresh)return null;
    return weekly.refresh()
  }

  function showActivationError(error){
    const message=String(error?.message||error||"Online services are currently unavailable.");
    const note=document.getElementById("menu-note");if(note)note.textContent=message;
    try{window.showToast?.("ONLINE SERVICE UNAVAILABLE",message,"red",9000)}catch(_){}
  }

  function replay(button){
    if(!button?.isConnected)return;
    button.dataset.ccgOnlineGateReplay="true";
    setTimeout(()=>button.click(),0)
  }

  async function intercept(event){
    const button=event.target?.closest?.("button");
    if(!button||!ONLINE_BUTTONS.has(button.id))return;
    if(button.dataset.ccgOnlineGateReplay==="true"){
      delete button.dataset.ccgOnlineGateReplay;
      return
    }
    if(state.active)return;
    event.preventDefault();event.stopImmediatePropagation();
    const reason=button.id==="daily-btn"?"weekly-vault":button.id==="join-btn"?"multiplayer-join":`multiplayer-${button.dataset.roomMode||button.id}`;
    button.disabled=true;
    try{
      await activate(reason);
      if(button.id==="daily-btn")await refreshWeekly();
      replay(button)
    }catch(error){showActivationError(error)}
    finally{button.disabled=false}
  }

  document.addEventListener("click",intercept,true);
  window.addEventListener("pagehide",()=>document.removeEventListener("click",intercept,true),{once:true});

  function activateWeeklyReturn(){
    if(location.hash!=="#weekly-vault")return;
    activate("weekly-vault-return").then(refreshWeekly).catch(showActivationError)
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",activateWeeklyReturn,{once:true});
  else activateWeeklyReturn();

  window.CCGLostSizzlerOnlineServices={activate,refreshWeekly,get state(){return{...state,promise:Boolean(state.promise)}}};
})();
