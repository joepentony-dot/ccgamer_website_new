/* The Lost Sizzler — local-first online services and delivery gate.
 *
 * The base game must remain playable without Supabase. Website account,
 * Weekly Vault and multiplayer services are loaded only after the player
 * deliberately enters an online feature. The same gate also owns the small
 * delivery boundary used by future packaged builds so website navigation and
 * website-root service scripts cannot silently take over a desktop webview.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_ONLINE_SERVICES_GATE__)return;
  window.__CCG_LOST_SIZZLER_ONLINE_SERVICES_GATE__=true;

  const RELEASE=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||"latest").trim();
  const WEBSITE_ORIGIN="https://www.cheekycommodoregamer.co.uk";
  const ONLINE_BUTTONS=new Set(["daily-btn","create-btn","horde-mode-btn","saboteurs-mode-btn","join-btn"]);
  const VALID_DELIVERY_MODES=new Set(["web","desktop-online","desktop-offline"]);
  const rawDelivery=window.__CCG_LOST_SIZZLER_DELIVERY__&&typeof window.__CCG_LOST_SIZZLER_DELIVERY__==="object"?window.__CCG_LOST_SIZZLER_DELIVERY__:{};
  const requestedMode=String(rawDelivery.mode||window.__CCG_LOST_SIZZLER_DELIVERY_MODE__||"web").trim().toLowerCase();
  const deliveryMode=VALID_DELIVERY_MODES.has(requestedMode)?requestedMode:"web";
  const state={active:false,activating:false,promise:null,reason:"",lastError:"",activatedAt:0};

  function websiteUrl(path){
    try{return new URL(String(path||"/"),`${WEBSITE_ORIGIN}/`).toString()}
    catch(_){return WEBSITE_ORIGIN}
  }

  function onlineScriptSources(){
    if(deliveryMode==="web")return{
      config:`/js/ccg-supabase-config.js?v=${encodeURIComponent(RELEASE)}`,
      client:`/js/ccg-supabase-client.js?v=${encodeURIComponent(RELEASE)}`
    };
    if(deliveryMode==="desktop-offline")return null;
    const supplied=rawDelivery.onlineScripts&&typeof rawDelivery.onlineScripts==="object"?rawDelivery.onlineScripts:{};
    const config=String(supplied.config||"").trim();
    const client=String(supplied.client||"").trim();
    return config&&client?{config,client}:null
  }

  function versionManifestUrl(){
    if(deliveryMode==="web")return "version.json";
    if(typeof rawDelivery.resolveLocalAsset==="function"){
      try{
        const resolved=rawDelivery.resolveLocalAsset("version.json",{kind:"version-manifest"});
        if(resolved)return String(resolved)
      }catch(error){console.warn("[Lost Sizzler] desktop local-asset resolver failed for version.json",error)}
    }
    const explicit=String(rawDelivery.versionManifestUrl||"").trim();
    return explicit||null
  }

  const delivery=Object.freeze({
    mode:deliveryMode,
    isDesktop:deliveryMode!=="web",
    onlineEnabled:deliveryMode!=="desktop-offline",
    websiteUrl,
    onlineScriptSources,
    versionManifestUrl
  });

  function onlineServicesConfigured(){
    if(!delivery.onlineEnabled)return false;
    const sources=onlineScriptSources();
    return Boolean(window.ccgSupabase?.getClient||sources)
  }

  function deliveryMessage(message){
    const text=String(message||"This action is unavailable in this build.");
    const note=document.getElementById("menu-note");
    if(note)note.textContent=text;
    try{window.showToast?.("ACTION UNAVAILABLE",text,"red",8000)}catch(_){}
  }

  function openExternal(url,reason="external-link"){
    const target=websiteUrl(url);
    if(!delivery.isDesktop){
      window.location.assign(target);
      return true
    }
    if(delivery.mode==="desktop-offline"){
      deliveryMessage("This desktop build is running in offline mode. Website links are disabled.");
      return false
    }
    if(typeof rawDelivery.openExternal==="function"){
      try{rawDelivery.openExternal(target,{reason:String(reason||"external-link")});return true}
      catch(error){console.warn("[Lost Sizzler] desktop external navigation failed",error)}
    }
    deliveryMessage("This desktop build has not provided a safe system-browser link handler.");
    return false
  }

  function exitDelivery(){
    if(!delivery.isDesktop){window.location.assign(websiteUrl("/games/ccg-games/"));return true}
    if(typeof rawDelivery.exitGame==="function"){
      try{rawDelivery.exitGame();return true}
      catch(error){console.warn("[Lost Sizzler] desktop exit action failed",error)}
    }
    deliveryMessage("This desktop build has not provided an application Exit action.");
    return false
  }

  function installNavigationBoundary(){
    if(!delivery.isDesktop)return;
    document.addEventListener("click",event=>{
      const headerQuit=event.target?.closest?.("#quit-btn");
      const menu=document.getElementById("menu");
      const menuVisible=Boolean(menu&&!menu.classList.contains("hidden")&&document.body?.dataset?.runActive!=="true");
      if(headerQuit&&menuVisible){
        event.preventDefault();
        event.stopImmediatePropagation();
        exitDelivery();
        return
      }
      const anchor=event.target?.closest?.("a[href]");
      if(!anchor)return;
      const href=String(anchor.getAttribute("href")||"").trim();
      if(!href||href.startsWith("#")||/^javascript:/i.test(href))return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if(anchor.classList.contains("menu-exit-link")){exitDelivery();return}
      openExternal(href,anchor.closest("#weekly-auth-actions")?"account-auth":"external-link");
    },true);
    document.documentElement.dataset.ccgDeliveryMode=delivery.mode;
  }

  function installVersionManifestBoundary(){
    if(!delivery.isDesktop||typeof window.fetch!=="function")return;
    const nativeFetch=window.fetch.bind(window);
    window.fetch=function(input,init){
      const requestText=typeof input==="string"?input:input instanceof URL?input.toString():"";
      if(!/^version\.json(?:[?#]|$)/i.test(requestText))return nativeFetch(input,init);
      const target=versionManifestUrl();
      if(!target)return Promise.reject(new Error("Desktop version manifest is not configured."));
      let resolved=String(target);
      try{
        const source=new URL(requestText,window.location.href);
        const destination=new URL(resolved,window.location.href);
        if(source.searchParams.has("check"))destination.searchParams.set("check",source.searchParams.get("check"));
        resolved=destination.toString()
      }catch(_){}
      return nativeFetch(resolved,init)
    };
  }

  function applyDeliveryUi(){
    if(!delivery.isDesktop)return;
    const apply=()=>{
      if(onlineServicesConfigured())return;
      const message=delivery.mode==="desktop-offline"?"Online services are disabled in this offline desktop build.":"Online services are not configured in this desktop build.";
      for(const id of ONLINE_BUTTONS){
        const button=document.getElementById(id);
        if(!button)continue;
        if(!button.disabled)button.disabled=true;
        button.setAttribute("aria-disabled","true");
        if(button.title!==message)button.title=message;
        button.dataset.ccgOnlineUnavailable="true"
      }
      const roomCode=document.getElementById("room-code");
      if(roomCode){if(!roomCode.disabled)roomCode.disabled=true;if(roomCode.title!==message)roomCode.title=message}
      const howto=document.querySelector(".online-howto");
      if(howto&&!howto.hidden)howto.hidden=true;
      const weeklyStatus=document.getElementById("weekly-status");
      if(weeklyStatus&&weeklyStatus.textContent!==message)weeklyStatus.textContent=message;
      const authActions=document.getElementById("weekly-auth-actions");
      if(authActions&&!authActions.hidden)authActions.hidden=true;
      const note=document.getElementById("menu-note");
      const offlineNote="Offline desktop mode: Solo, Tutorial, 2P Split Screen, local saves, achievements and bundled game content remain available. Online multiplayer, account services and Weekly Vault are disabled.";
      if(note&&delivery.mode==="desktop-offline"&&note.textContent!==offlineNote)note.textContent=offlineNote
    };
    const schedule=()=>setTimeout(apply,0);
    apply();
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",schedule,{once:true});
    window.addEventListener("focus",schedule);
    window.addEventListener("ccg:auth-changed",schedule);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule()});
  }

  function installNetworkGateBridge(){
    let attempts=0;
    const install=()=>{
      const proto=window.CCGNetwork?.RoomNetwork?.prototype;
      if(!proto)return false;
      if(proto.__ccgOnlineServicesGateBridge===true)return true;
      proto.getSupabase=async function(){
        if(window.ccgSupabase?.getClient)return window.ccgSupabase.getClient();
        const gate=window.CCGLostSizzlerOnlineServices;
        if(!gate?.activate)return null;
        try{return await gate.activate("multiplayer-network")}
        catch(error){console.warn("[Lost Sizzler] multiplayer online-services activation failed",error);return null}
      };
      proto.__ccgOnlineServicesGateBridge=true;
      return true
    };
    if(install())return;
    const timer=setInterval(()=>{
      attempts++;
      if(install()||attempts>=400)clearInterval(timer)
    },25);
    window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
  }

  function loadScript(src,marker){
    return new Promise((resolve,reject)=>{
      const base=String(src||"").split("?")[0];
      const existing=document.querySelector(`script[data-ccg-online-service="${marker}"]`)||document.querySelector(`script[src^="${base}"]`);
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
    if(!delivery.onlineEnabled)throw new Error("Online services are disabled in this desktop build.");
    state.activating=true;state.reason=String(reason||"online-feature");state.lastError="";
    state.promise=(async()=>{
      let bridge=window.ccgSupabase;
      if(!bridge?.getClient){
        const sources=onlineScriptSources();
        if(!sources)throw new Error("This desktop build has not configured its online-services adapter.");
        await loadScript(sources.config,"config");
        await loadScript(sources.client,"client");
        bridge=window.ccgSupabase
      }
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
      window.dispatchEvent(new CustomEvent("ccg:lost-sizzler-online-services-ready",{detail:{reason:state.reason,activatedAt:state.activatedAt,deliveryMode:delivery.mode}}));
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
    finally{button.disabled=delivery.isDesktop&&!onlineServicesConfigured()}
  }

  installNavigationBoundary();
  installVersionManifestBoundary();
  applyDeliveryUi();
  installNetworkGateBridge();
  document.addEventListener("click",intercept,true);
  window.addEventListener("pagehide",()=>document.removeEventListener("click",intercept,true),{once:true});

  function activateWeeklyReturn(){
    if(location.hash!=="#weekly-vault")return;
    activate("weekly-vault-return").then(refreshWeekly).catch(showActivationError)
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",activateWeeklyReturn,{once:true});
  else activateWeeklyReturn();

  window.CCGLostSizzlerDelivery={
    mode:delivery.mode,
    isDesktop:delivery.isDesktop,
    onlineEnabled:delivery.onlineEnabled,
    websiteUrl,
    openExternal,
    exit:exitDelivery,
    onlineScriptSources,
    versionManifestUrl
  };
  window.CCGLostSizzlerOnlineServices={activate,refreshWeekly,get state(){return{...state,promise:Boolean(state.promise),deliveryMode:delivery.mode,onlineEnabled:delivery.onlineEnabled}}};
})();
