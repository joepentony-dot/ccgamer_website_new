/* C64 Dungeon Carnage V10.42 — Supabase-backed PayPal commerce adapter. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerCommerce)return;

  const PRODUCT_SLUG="c64-dungeon-carnage";
  const ENDPOINT="ccg-commerce";
  const state={lastStatus:null,lastError:"",calls:0};

  async function client(){
    const value=await window.ccgSupabase?.getClient?.();
    if(!value)throw new Error("Website account service unavailable");
    return value;
  }

  async function invoke(action,extra={}){
    const supabase=await client();
    state.calls+=1;
    const {data,error}=await supabase.functions.invoke(ENDPOINT,{body:{action,...extra}});
    if(error){state.lastError=String(error?.message||error);throw error}
    if(!data?.ok){
      const failure=new Error(data?.error||"Commerce request failed");
      failure.code=data?.code||"commerce_error";
      state.lastError=failure.message;
      throw failure;
    }
    state.lastError="";
    return data;
  }

  async function session(){
    try{return await window.ccgSupabase?.waitForAuth?.()||null}catch(_){return null}
  }

  async function isAuthenticated(){return Boolean((await session())?.user)}

  async function status(){
    const data=await invoke("status");
    state.lastStatus=data;
    return data;
  }

  async function getEntitlement(){
    if(!(await isAuthenticated()))return null;
    const data=await status();
    if(!data.entitled)return null;
    return{
      active:true,
      permanent:true,
      kind:"permanent",
      type:"permanent",
      entitlement_type:"permanent",
      product_slug:PRODUCT_SLUG,
      purchased_at:data.entitlement?.purchased_at||null,
      download_ready:Boolean(data.downloadReady)
    };
  }

  async function getOffer(){
    const data=await status();
    return{
      product_slug:PRODUCT_SLUG,
      product:PRODUCT_SLUG,
      currency:String(data.product?.currency||"GBP").toUpperCase(),
      display_price:String(data.product?.displayPrice||"£1.99"),
      checkout_configured:Boolean(data.checkoutConfigured),
      download_ready:Boolean(data.downloadReady)
    };
  }

  async function checkout(){
    const data=await invoke("create_checkout");
    if(data.entitled||data.alreadyOwned)return data;
    if(!data.checkoutUrl)throw new Error("Secure PayPal checkout did not return a destination");
    location.assign(data.checkoutUrl);
    return data;
  }

  async function captureReturn({orderId}={}){
    const value=String(orderId||"").trim();
    if(!value)throw new Error("PayPal order ID is missing");
    return invoke("capture_checkout",{orderId:value});
  }

  async function download(){
    const data=await invoke("download");
    if(!data.url)throw new Error("Secure download link was not returned");
    return data;
  }

  async function refreshEntitlement(){return getEntitlement()}

  window.CCGLostSizzlerCommerce=Object.freeze({
    productSlug:PRODUCT_SLUG,
    provider:"paypal-supabase",
    isAuthenticated,
    signedIn:isAuthenticated,
    hasAccountSession:isAuthenticated,
    getEntitlement,
    entitlement:getEntitlement,
    refreshEntitlement,
    getOffer,
    offer:getOffer,
    checkout,
    purchase:checkout,
    captureReturn,
    captureCheckout:captureReturn,
    download,
    getDownload:download,
    status,
    diagnostics:()=>Object.freeze({...state})
  });
})();
