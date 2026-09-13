/* C64 Dungeon Carnage V10.42 — two-minute browser trial and permanent-unlock presentation. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_DEMO_PAYWALL__)return;
  window.__CCG_LOST_SIZZLER_V142_DEMO_PAYWALL__=true;

  const PRODUCT_SLUG="the-lost-sizzler-full-game";
  const FALLBACK_PRICE="£1.99";
  const TRIAL_MS=120000;
  const TRIAL_SESSION_KEY="ccg-dungeon-carnage-trial-deadline-v1";
  const RETURN_TO="/arcade/lost-sizzler/?purchase=1";
  const LOGIN_URL=`/auth/login.html?returnTo=${encodeURIComponent(RETURN_TO)}`;
  const REGISTER_URL=`/auth/register.html?returnTo=${encodeURIComponent(RETURN_TO)}`;
  const PATREON_URL="https://www.patreon.com/CheekyCommodoreGamer?utm_campaign=creatorshare_creator";
  const YOUTUBE_MEMBERSHIP_URL="https://www.youtube.com/@CheekyCommodoreGamer/join";
  const STYLE_URL="/resources/css/c64-dungeon-carnage-trial-paywall.css?v=20260913r1";
  const state={shown:false,checking:false,entitled:false,providerReady:false,lastError:"",overlay:null,badge:null,deadline:0,timer:0,trialStarted:false,expired:false,lockedMode:""};
  const esc=value=>String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const safeOfferText=value=>String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,32);

  function provider(){
    const candidates=[window.CCGLostSizzlerCommerce,window.CCGLostSizzlerPurchase,window.CCGLostSizzlerPurchaseBridge];
    return candidates.find(candidate=>candidate&&typeof candidate==="object")||null;
  }
  function providerMethod(names){const p=provider();if(!p)return null;for(const name of names)if(typeof p[name]==="function")return p[name].bind(p);return null}
  async function signedIn(){const fn=providerMethod(["isAuthenticated","signedIn","hasAccountSession"]);if(!fn)return false;try{return Boolean(await fn())}catch(_){return false}}
  async function entitlement(){
    const fn=providerMethod(["getEntitlement","entitlement","refreshEntitlement"]);if(!fn)return null;
    try{const result=await fn(PRODUCT_SLUG);return result?.entitlement||result||null}catch(error){if(error?.code==="authentication_required"||error?.statusCode===401)return null;throw error}
  }
  function activePermanent(value){return Boolean(value&&(value.active!==false)&&(value.kind==="permanent"||value.type==="permanent"||value.entitlement_type==="permanent"||value.permanent===true))}
  function authoritativeOffer(value){
    const offer=value?.offer||value||{};
    const currency=safeOfferText(offer.currency||"GBP").toUpperCase()||"GBP";
    const amount=safeOfferText(offer.display_price||offer.displayPrice||offer.price_display||"");
    return{currency,display:amount||FALLBACK_PRICE,product:String(offer.product_slug||offer.product||PRODUCT_SLUG)};
  }
  function diagnostics(){return Object.freeze({shown:state.shown,checking:state.checking,entitled:state.entitled,providerReady:state.providerReady,lastError:state.lastError,trialStarted:state.trialStarted,expired:state.expired,deadline:state.deadline,remainingMs:Math.max(0,state.deadline-Date.now())})}

  function ensureStylesheet(){
    if(document.querySelector('link[data-ccg-trial-paywall="true"]'))return;
    const link=document.createElement("link");link.rel="stylesheet";link.href=STYLE_URL;link.dataset.ccgTrialPaywall="true";(document.head||document.documentElement).appendChild(link);
  }
  function ensureOverlay(){
    ensureStylesheet();
    if(state.overlay?.isConnected)return state.overlay;
    const overlay=document.createElement("section");overlay.id="v142-demo-paywall";overlay.className="hidden";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-labelledby","v142-paywall-title");
    (document.querySelector(".ccg-game")||document.body).appendChild(overlay);state.overlay=overlay;return overlay;
  }
  function ensureBadge(){
    ensureStylesheet();
    if(state.badge?.isConnected)return state.badge;
    const badge=document.createElement("div");badge.id="v142-trial-countdown";badge.className="hidden";badge.setAttribute("role","timer");badge.setAttribute("aria-live","off");badge.innerHTML='<span>FREE TRIAL</span><b data-trial-time>02:00</b>';
    (document.querySelector(".ccg-game")||document.body).appendChild(badge);state.badge=badge;return badge;
  }
  function status(message,error=false){const node=state.overlay?.querySelector?.(".v142-status");if(!node)return;node.textContent=message||"";node.classList.toggle("error",Boolean(error))}

  function readStoredDeadline(){
    try{const value=Number(sessionStorage.getItem(TRIAL_SESSION_KEY));return Number.isFinite(value)&&value>0?value:0}catch(_){return 0}
  }
  function storeDeadline(value){try{sessionStorage.setItem(TRIAL_SESSION_KEY,String(value))}catch(_){} }
  function formatRemaining(ms){const seconds=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`}

  function lockRuntime(){
    if(state.entitled)return false;
    document.body.dataset.v142TrialExpired="true";
    try{
      const current=String(typeof mode!=="undefined"?mode:"");
      if(current&&current!=="trial-paywall")state.lockedMode=current;
      if(typeof mode!=="undefined")mode="trial-paywall";
    }catch(_){}
    try{input?.clear?.()}catch(_){}
    try{UI?.pause?.classList?.add?.("hidden")}catch(_){}
    return true;
  }
  function restoreRuntime(){
    document.body.dataset.v142TrialExpired="false";
    try{if(typeof mode!=="undefined"&&mode==="trial-paywall")mode=state.lockedMode&&state.lockedMode!=="trial-paywall"?state.lockedMode:"playing"}catch(_){}
    state.lockedMode="";
  }
  function stopTimer(){if(state.timer){clearInterval(state.timer);state.timer=0}}
  function closePaywall(){
    if(state.expired&&!state.entitled)return false;
    state.overlay?.classList.add("hidden");state.shown=false;return true;
  }
  function unlockRuntime(entitlementValue){
    if(!activePermanent(entitlementValue))return false;
    state.entitled=true;state.expired=false;stopTimer();document.body.dataset.v142DemoLocked="false";document.body.dataset.fullGameEntitled="true";ensureBadge().classList.add("hidden");restoreRuntime();return true;
  }

  async function checkout(){
    const start=providerMethod(["openPayPalCheckout","startPayPalCheckout","checkout","purchase"]);
    if(!start){status("PayPal Checkout is not active on the live build yet. Patreon and YouTube Membership links below remain available as CCG support options, but they do not automatically unlock this browser session.",true);return}
    if(!(await signedIn())){status("Sign in or create a CCG account first. The permanent unlock must be attached to an account you can recover.",true);return}
    const button=state.overlay?.querySelector?.(".v142-paypal");if(button)button.disabled=true;status("Opening PayPal Checkout…");
    try{
      await start({product:PRODUCT_SLUG});status("Verifying permanent entitlement…");const value=await entitlement();
      if(!unlockRuntime(value))throw new Error("purchase_not_verified");
      renderOwned();
    }catch(error){state.lastError=String(error?.code||error?.message||error);status(error?.code==="checkout_cancelled"?"Purchase cancelled. Nothing has been charged.":"Purchase was not verified. The game remains locked; a browser callback alone cannot grant access.",true)}finally{if(button)button.disabled=false}
  }

  function renderOwned(){
    const overlay=ensureOverlay();
    overlay.innerHTML='<div class="v142-paywall-card"><span class="v142-paywall-kicker">FULL GAME OWNED</span><h2 id="v142-paywall-title">C64 Dungeon Carnage is unlocked</h2><div class="v142-owned">This CCG account owns the full game. Future game updates remain included at no extra charge.</div><div class="v142-actions"><button class="v142-paypal" type="button" data-owned-continue>CONTINUE PLAYING</button></div></div>';
    overlay.querySelector("[data-owned-continue]")?.addEventListener("click",closePaywall);overlay.classList.remove("hidden");state.shown=true;
  }

  async function showPaywall({reason="trial-expired"}={}){
    if(state.checking)return false;state.checking=true;
    try{
      try{const owned=await entitlement();if(unlockRuntime(owned)){renderOwned();return true}}catch(_){}
      if(reason==="trial-expired")lockRuntime();
      const overlay=ensureOverlay(),p=provider(),authenticated=await signedIn();state.providerReady=Boolean(p);
      let offer={display:FALLBACK_PRICE,currency:"GBP",product:PRODUCT_SLUG};const offerFn=providerMethod(["getOffer","offer"]);if(offerFn)try{offer=authoritativeOffer(await offerFn(PRODUCT_SLUG))}catch(_){}
      const trialCopy=reason==="trial-expired"?"Your two-minute browser trial has finished. Unlock the full C64 Dungeon Carnage game to continue this run.":"Unlock the full C64 Dungeon Carnage game permanently.";
      overlay.innerHTML=`<div class="v142-paywall-card"><span class="v142-paywall-kicker">${reason==="trial-expired"?"2-MINUTE TRIAL COMPLETE":"FULL GAME"}</span><h2 id="v142-paywall-title">Unlock C64 Dungeon Carnage</h2><div class="v142-price">${esc(offer.display)} ONE-OFF</div><p>${trialCopy}</p><div class="v142-promise"><span><b>PERMANENT ACCOUNT UNLOCK</b>Buy once. The entitlement is attached to your CCG account and can be restored on another device.</span><span><b>ALL FUTURE GAME UPDATES INCLUDED</b>Future C64 Dungeon Carnage updates are included at no extra charge.</span><span><b>SUPPORTS DEVELOPMENT</b>Your purchase helps fund continued development of the game and the Cheeky Commodore Gamer site.</span><span><b>VERIFIED ACCESS</b>The browser only unlocks after the CCG server confirms the entitlement.</span></div><div class="v142-account-note"><b>${authenticated?"CCG ACCOUNT DETECTED":"SIGN IN OR CREATE A CCG ACCOUNT"}</b><br>${authenticated?"Your permanent purchase will be attached to the signed-in account.":"Permanent access must be attached to a recoverable CCG account before checkout."}</div><div class="v142-actions">${authenticated?'<button class="v142-paypal" type="button" data-paypal>BUY WITH PAYPAL</button>':`<a class="v142-login" href="${LOGIN_URL}">SIGN IN</a><a class="v142-register" href="${REGISTER_URL}">CREATE ACCOUNT</a>`}<a class="v142-support" href="${PATREON_URL}" target="_blank" rel="noopener noreferrer">PATREON</a><a class="v142-support" href="${YOUTUBE_MEMBERSHIP_URL}" target="_blank" rel="noopener noreferrer">YOUTUBE MEMBERSHIP</a></div><div class="v142-status" aria-live="polite">${p?"":"The £1.99 browser unlock is waiting for the CCG commerce/PayPal entitlement bridge. Patreon and YouTube Membership are support links and do not automatically unlock this browser build."}</div></div>`;
      overlay.querySelector("[data-paypal]")?.addEventListener("click",checkout);overlay.classList.remove("hidden");state.shown=true;return true;
    }finally{state.checking=false}
  }

  function expireTrial(){
    if(state.entitled||state.expired)return;
    state.expired=true;stopTimer();const badge=ensureBadge();badge.classList.remove("hidden");const time=badge.querySelector("[data-trial-time]");if(time)time.textContent="00:00";badge.classList.add("expired");lockRuntime();showPaywall({reason:"trial-expired"});
  }
  function tickTrial(){
    if(state.entitled)return;
    if(!state.deadline)return;
    const remaining=Math.max(0,state.deadline-Date.now()),badge=ensureBadge(),time=badge.querySelector("[data-trial-time]");
    badge.classList.remove("hidden");if(time)time.textContent=formatRemaining(remaining);
    if(remaining<=0)expireTrial();
  }
  function startTrial(){
    if(state.entitled||state.trialStarted)return false;
    state.trialStarted=true;document.body.dataset.v142TrialActive="true";
    const stored=readStoredDeadline();state.deadline=stored||Date.now()+TRIAL_MS;if(!stored)storeDeadline(state.deadline);
    tickTrial();if(!state.expired)state.timer=setInterval(tickTrial,250);return true;
  }
  function monitorRunState(){
    if(state.entitled)return;
    if(document.body?.dataset?.runActive==="true")startTrial();
  }

  async function refreshEntitlement(){
    try{const value=await entitlement();if(unlockRuntime(value))return true}catch(_){}
    return false;
  }

  ensureOverlay();ensureBadge();refreshEntitlement().finally(monitorRunState);
  const observer=new MutationObserver(records=>{if(records.some(record=>record.type==="attributes"&&record.target===document.body&&record.attributeName==="data-run-active"))monitorRunState()});
  observer.observe(document.body,{attributes:true,attributeFilter:["data-run-active"]});
  addEventListener("ccg:v142-ready",monitorRunState);
  addEventListener("pagehide",()=>{stopTimer();observer.disconnect()},{once:true});
  window.CCGLostSizzlerV142DemoPaywall=Object.freeze({productSlug:PRODUCT_SLUG,demoMode:false,trialMode:true,trialMs:TRIAL_MS,showPaywall,closePaywall,refreshEntitlement,diagnostics,startTrial});
})();
