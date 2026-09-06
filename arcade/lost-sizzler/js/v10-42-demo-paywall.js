/* The Lost Sizzler V10.42 — tutorial/demo completion and permanent-unlock presentation. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_DEMO_PAYWALL__)return;
  window.__CCG_LOST_SIZZLER_V142_DEMO_PAYWALL__=true;

  const PRODUCT_SLUG="the-lost-sizzler-full-game";
  const FALLBACK_PRICE="£1.99";
  const RETURN_TO="/arcade/lost-sizzler/?purchase=1";
  const LOGIN_URL=`/auth/login.html?returnTo=${encodeURIComponent(RETURN_TO)}`;
  const REGISTER_URL=`/auth/register.html?returnTo=${encodeURIComponent(RETURN_TO)}`;
  const DEMO_MODE=window.CCG_LOST_SIZZLER_DEMO_MODE===true;
  const state={shown:false,checking:false,entitled:false,providerReady:false,lastError:"",overlay:null,guarded:new Map()};
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
    const offer=value?.offer||value||{};const currency=safeOfferText(offer.currency||"GBP").toUpperCase()||"GBP",amount=safeOfferText(offer.display_price||offer.displayPrice||offer.price_display||"");
    return{currency,display:amount||FALLBACK_PRICE,product:String(offer.product_slug||offer.product||PRODUCT_SLUG)};
  }
  function diagnostics(){return Object.freeze({shown:state.shown,checking:state.checking,entitled:state.entitled,providerReady:state.providerReady,lastError:state.lastError,guardedCount:state.guarded.size})}

  function ensureStyle(){
    if(document.getElementById("v142-demo-paywall-style"))return;
    const style=document.createElement("style");style.id="v142-demo-paywall-style";style.textContent=`
      #v142-demo-paywall{position:fixed;inset:0;z-index:13050;display:grid;place-items:center;padding:18px;background:radial-gradient(circle at 50% 18%,rgba(78,34,112,.36),rgba(2,1,7,.94) 54%);backdrop-filter:blur(6px)}#v142-demo-paywall.hidden{display:none!important}
      #v142-demo-paywall .v142-paywall-card{width:min(780px,96vw);max-height:92dvh;overflow:auto;border:2px solid #ffd85a;border-radius:17px;background:linear-gradient(155deg,#171023,#070a12 66%);box-shadow:0 24px 90px rgba(0,0,0,.82),0 0 38px rgba(255,216,90,.1);padding:28px;color:#eee7f3}
      #v142-demo-paywall .v142-paywall-kicker{display:block;color:#6cecff;font:900 .7rem/1 monospace;letter-spacing:.2em;margin-bottom:8px}#v142-demo-paywall h2{margin:0 0 8px;color:#ffd85a;font-size:clamp(1.45rem,4vw,2.25rem)}#v142-demo-paywall .v142-price{font-size:clamp(1.2rem,3vw,1.7rem);font-weight:900;color:#72ff9b;margin:7px 0 15px}
      #v142-demo-paywall p{line-height:1.55;margin:9px 0}#v142-demo-paywall .v142-promise{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:18px 0}#v142-demo-paywall .v142-promise span{padding:11px;border:1px solid rgba(108,236,255,.24);border-radius:9px;background:rgba(108,236,255,.055);font-size:.82rem}#v142-demo-paywall .v142-promise b{display:block;color:#6cecff;margin-bottom:3px}
      #v142-demo-paywall .v142-account-note{padding:12px;border-left:3px solid #ffd85a;background:rgba(255,216,90,.07);margin:14px 0}#v142-demo-paywall .v142-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}#v142-demo-paywall button,#v142-demo-paywall a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:900}#v142-demo-paywall .v142-paypal{background:#ffd85a;color:#151017;border:0}#v142-demo-paywall .v142-login{border:1px solid #6cecff;color:#6cecff;background:transparent}#v142-demo-paywall .v142-register{border:1px solid #72ff9b;color:#72ff9b;background:transparent}#v142-demo-paywall .v142-later{border:1px solid rgba(255,255,255,.18);color:#ddd;background:transparent}
      #v142-demo-paywall .v142-status{min-height:1.4em;margin-top:11px;color:#cfc7d8;font-size:.78rem}#v142-demo-paywall .v142-status.error{color:#ff8a92}#v142-demo-paywall .v142-owned{padding:14px;border:1px solid rgba(114,255,155,.45);border-radius:9px;background:rgba(114,255,155,.08);color:#cffff0}
      body[data-v142-demo-locked="true"] #solo-btn,body[data-v142-demo-locked="true"] #create-btn,body[data-v142-demo-locked="true"] #horde-mode-btn,body[data-v142-demo-locked="true"] #saboteurs-mode-btn,body[data-v142-demo-locked="true"] #split-btn,body[data-v142-demo-locked="true"] #daily-btn,body[data-v142-demo-locked="true"] #continue-save-btn,body[data-v142-demo-locked="true"] #join-btn{filter:saturate(.35);opacity:.68}
      .v142-demo-lock-badge{display:inline-block;margin-left:6px;padding:2px 5px;border:1px solid rgba(255,216,90,.55);border-radius:5px;color:#ffd85a;font-size:.55rem;vertical-align:middle}
      @media(max-width:650px){#v142-demo-paywall .v142-paywall-card{padding:19px}#v142-demo-paywall .v142-promise{grid-template-columns:1fr}#v142-demo-paywall .v142-actions>*{width:100%}}
    `;document.head.appendChild(style);
  }
  function ensureOverlay(){
    ensureStyle();if(state.overlay?.isConnected)return state.overlay;
    const overlay=document.createElement("section");overlay.id="v142-demo-paywall";overlay.className="hidden";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-labelledby","v142-paywall-title");
    (document.querySelector(".ccg-game")||document.body).appendChild(overlay);state.overlay=overlay;return overlay;
  }
  function status(message,error=false){const node=state.overlay?.querySelector?.(".v142-status");if(!node)return;node.textContent=message||"";node.classList.toggle("error",Boolean(error))}
  function closePaywall(){state.overlay?.classList.add("hidden");state.shown=false}
  function unlockRuntime(entitlementValue){
    if(!activePermanent(entitlementValue))return false;state.entitled=true;document.body.dataset.v142DemoLocked="false";document.body.dataset.fullGameEntitled="true";restoreGuardedButtons();return true;
  }
  async function checkout(){
    const start=providerMethod(["openPayPalCheckout","startPayPalCheckout","checkout","purchase"]);if(!start){status("PayPal Checkout is not active in this development build yet. Your permanent-unlock screen is ready for the server commerce bridge.",true);return}
    if(!(await signedIn())){status("Sign in or create a CCG account first. The permanent unlock must be attached to an account you can recover.",true);return}
    const button=state.overlay?.querySelector?.(".v142-paypal");if(button)button.disabled=true;status("Opening PayPal Checkout…");
    try{
      const result=await start({product:PRODUCT_SLUG});const value=result?.entitlement||await entitlement();
      if(!unlockRuntime(value))throw new Error("purchase_not_verified");
      renderOwned();
    }catch(error){status(error?.code==="checkout_cancelled"?"Purchase cancelled. Nothing has been charged.":"Purchase was not verified. The full game remains locked; no browser callback alone can grant access.",true)}finally{if(button)button.disabled=false}
  }
  function renderOwned(){
    const overlay=ensureOverlay();overlay.innerHTML=`<div class="v142-paywall-card"><span class="v142-paywall-kicker">FULL GAME OWNED</span><h2 id="v142-paywall-title">The Lost Sizzler is permanently unlocked</h2><div class="v142-owned">This CCG account owns the full game. All future The Lost Sizzler game updates remain included at no extra charge.</div><div class="v142-actions"><button class="v142-paypal" type="button" data-owned-continue>ENTER THE DUNGEON</button></div></div>`;overlay.querySelector("[data-owned-continue]")?.addEventListener("click",closePaywall);overlay.classList.remove("hidden");state.shown=true
  }
  async function showPaywall({reason="tutorial-complete"}={}){
    if(state.checking)return false;state.checking=true;
    try{
      try{
        const owned=await entitlement();if(unlockRuntime(owned)){renderOwned();return true}
      }catch(_){/* Presentation must still work if the optional backend is unavailable. */}
      const overlay=ensureOverlay(),p=provider(),authenticated=await signedIn();state.providerReady=Boolean(p);
      let offer={display:FALLBACK_PRICE,currency:"GBP",product:PRODUCT_SLUG};const offerFn=providerMethod(["getOffer","offer"]);if(offerFn)try{offer=authoritativeOffer(await offerFn(PRODUCT_SLUG))}catch(_){}
      overlay.innerHTML=`<div class="v142-paywall-card"><span class="v142-paywall-kicker">${reason==="tutorial-complete"?"TUTORIAL COMPLETE · THE DUNGEON GOES DEEPER":"FULL GAME"}</span><h2 id="v142-paywall-title">Unlock The Lost Sizzler permanently</h2><div class="v142-price">${esc(offer.display)} ONE-OFF</div><p>You have completed the free introduction. The full game expands into five procedural depths, RPG character builds, the Keys of Iron, Bone and Ash, the awakened Sigil and the final escape.</p><div class="v142-promise"><span><b>PERMANENT ACCOUNT UNLOCK</b>Buy once. The entitlement remains tied to your CCG account and can be restored when you sign in on another device.</span><span><b>ALL FUTURE GAME UPDATES INCLUDED</b>Future The Lost Sizzler game updates are included at no extra charge.</span><span><b>SUPPORTS THE GAME</b>Your purchase helps fund continued development and support of The Lost Sizzler.</span><span><b>PAYPAL CHECKOUT</b>Payment is verified by the CCG server before the game entitlement is granted.</span></div><div class="v142-account-note"><b>${authenticated?"CCG ACCOUNT DETECTED":"SIGN IN OR CREATE A CCG ACCOUNT TO CONTINUE"}</b><br>${authenticated?"Your permanent purchase will be attached to the signed-in account.":"Your purchase must be attached to a recoverable CCG account before PayPal Checkout opens."}</div><div class="v142-actions">${authenticated?'<button class="v142-paypal" type="button" data-paypal>BUY WITH PAYPAL</button>':`<a class="v142-login" href="${LOGIN_URL}">SIGN IN</a><a class="v142-register" href="${REGISTER_URL}">CREATE ACCOUNT</a>`}<button class="v142-later" type="button" data-later>NOT NOW</button></div><div class="v142-status" aria-live="polite">${p?"":"Checkout is intentionally inactive until the CCG commerce backend is connected and PayPal Sandbox release gates pass."}</div></div>`;
      overlay.querySelector("[data-paypal]")?.addEventListener("click",checkout);overlay.querySelector("[data-later]")?.addEventListener("click",closePaywall);overlay.classList.remove("hidden");state.shown=true;return true
    }finally{state.checking=false}
  }

  function tutorialCompleted(){
    const banner=document.getElementById("ccg-tutorial-complete-banner"),title=banner?.querySelector?.("b")?.textContent?.trim()?.toUpperCase();return title==="TUTORIAL COMPLETE"
  }
  let completionQueued=false;
  function watchTutorialCompletion(){
    const complete=tutorialCompleted();if(!complete){completionQueued=false;return}
    if(completionQueued||state.entitled)return;completionQueued=true;setTimeout(()=>showPaywall({reason:"tutorial-complete"}),350)
  }

  const FULL_GAME_BUTTONS=["solo-btn","create-btn","horde-mode-btn","saboteurs-mode-btn","split-btn","daily-btn","continue-save-btn","join-btn"];
  function guardButton(button){
    if(!button||state.guarded.has(button))return;const handler=event=>{if(!DEMO_MODE||state.entitled)return;event.preventDefault();event.stopImmediatePropagation();showPaywall({reason:"full-game"})};button.addEventListener("click",handler,true);state.guarded.set(button,handler);if(!button.querySelector?.(".v142-demo-lock-badge")){const badge=document.createElement("span");badge.className="v142-demo-lock-badge";badge.textContent="FULL GAME";button.appendChild(badge)}}
  function guardFullGameButtons(){if(!DEMO_MODE||state.entitled)return;document.body.dataset.v142DemoLocked="true";for(const id of FULL_GAME_BUTTONS)guardButton(document.getElementById(id))}
  function restoreGuardedButtons(){for(const [button,handler] of state.guarded){button.removeEventListener("click",handler,true);button.querySelector?.(".v142-demo-lock-badge")?.remove()}state.guarded.clear()}

  async function refreshEntitlement(){
    try{const value=await entitlement();if(unlockRuntime(value))return true}catch(_){}if(DEMO_MODE)guardFullGameButtons();return false
  }

  ensureOverlay();guardFullGameButtons();refreshEntitlement();
  const observer=new MutationObserver(()=>{watchTutorialCompletion();guardFullGameButtons()});observer.observe(document.documentElement,{childList:true,subtree:true});
  addEventListener("pagehide",()=>observer.disconnect(),{once:true});
  window.CCGLostSizzlerV142DemoPaywall=Object.freeze({productSlug:PRODUCT_SLUG,demoMode:DEMO_MODE,showPaywall,closePaywall,refreshEntitlement,diagnostics});
})();
