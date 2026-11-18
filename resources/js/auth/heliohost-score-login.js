/**
 * Isolated, OPT-IN HelioHost member sign-in for one exact Sierra CRT score page.
 * NOT the legacy Supabase login. No local/session storage and no passwords,
 * member emails, tokens or cookies logged or copied to URL strings.
 * The server independently enforces release flags, real member credentials,
 * strict host-only cookies, Origin, CSRF, rate limits and game eligibility.
 */
const SITE_ORIGIN="https://www.cheekycommodoregamer.co.uk";
const API_ORIGIN="https://api.cheekycommodoregamer.co.uk";
const GAME_ID="owner-crt-more-crossfiresierraonline-0c60e852f438";
const GAME_PATH="/emulator/c64/";
const CANONICAL_RETURN=GAME_PATH+"?game="+GAME_ID+"&autoplay=1&start=1&scores=1";
const CSRF=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const MAX_REPLY=4096;

export function safeSierraReturn(value) {
 if(typeof value!=="string"||value.length>512||!value.startsWith("/")||value.startsWith("//"))return CANONICAL_RETURN;
 try {
  const url=new URL(value,SITE_ORIGIN);
  if(url.origin!==SITE_ORIGIN||url.pathname!==GAME_PATH||url.hash)return CANONICAL_RETURN;
  const p=url.searchParams;
  if(p.size!==4||p.getAll("game").length!==1||p.get("game")!==GAME_ID||
     p.getAll("scores").length!==1||p.get("scores")!=="1"||
     p.getAll("autoplay").length!==1||p.get("autoplay")!=="1"||
     p.getAll("start").length!==1||p.get("start")!=="1")return CANONICAL_RETURN;
  return CANONICAL_RETURN;
 }catch{return CANONICAL_RETURN;}
}

async function boundedJSON(response) {
 if(!response?.ok||typeof response.text!=="function")return null;
 const type=response.headers?.get?.("content-type");
 if(type&&!/^application\/json(?:;|$)/i.test(type.trim()))return null;
 const raw=await response.text();
 if(typeof raw!=="string"||raw.length>MAX_REPLY)return null;
 try {
  const data=JSON.parse(raw);
  return data&&typeof data==="object"&&!Array.isArray(data)?data:null;
 }catch{return null;}
}

export async function signInHelioHostMember({email,password,fetchImpl=globalThis.fetch,origin=""}={}) {
 if(origin!==SITE_ORIGIN||typeof fetchImpl!=="function"||
    typeof email!=="string"||!/^\S+@\S+\.\S+$/.test(email.trim())||
    email.length>255||typeof password!=="string"||
    password.length<1||password.length>4096)return false;
 const params={method:"GET",mode:"cors",credentials:"include",cache:"no-store",redirect:"error"};
 try {
  // GET /csrf creates an isolated host-only cookie; a Supabase session
  // cannot be substituted, and the CSRF token is never exposed to a URL.
  const token=await boundedJSON(await fetchImpl(API_ORIGIN+"/v1/member/csrf",params));
  if(!CSRF.test(token?.csrf||""))return false;
  const response=await boundedJSON(await fetchImpl(API_ORIGIN+"/v1/member/login",{
   method:"POST",mode:"cors",credentials:"include",cache:"no-store",redirect:"error",
   headers:{"Content-Type":"application/json","X-CCG-CSRF":token.csrf},
   body:JSON.stringify({email:email.trim(),password})
  }));
  if(response?.authenticated!==true||!CSRF.test(response?.csrf||""))return false;
  const me=await boundedJSON(await fetchImpl(API_ORIGIN+"/v1/member/me",params));
  return UUID.test(me?.account?.id||"");
 }catch{return false;}
}

export function initHelioHostScoreLogin(doc=globalThis.document,loc=globalThis.location,
                                        fetchImpl=globalThis.fetch) {
 const form=doc?.getElementById?.("scoreMemberLogin");
 const status=doc?.getElementById?.("scoreLoginStatus");
 const button=doc?.getElementById?.("scoreLoginSubmit");
 const returnLink=doc?.getElementById?.("scoreReturnLink");
 const email=doc?.getElementById?.("scoreEmail");
 const password=doc?.getElementById?.("scorePassword");
 if(!form||!status||!button||!returnLink||!email||!password)return false;
 const returnTo=safeSierraReturn(new URLSearchParams(loc?.search||"").get("returnTo"));
 returnLink.href=returnTo;
 if(loc?.origin!==SITE_ORIGIN) {
  status.textContent="HelioHost scoring sign-in is available only on the official CCG website.";
  button.disabled=true;
  return false;
 }
 let busy=false;
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(busy)return;
  const enteredEmail=String(email.value||"").trim();
  const enteredPassword=String(password.value||"");
  if(!enteredEmail||!enteredPassword) {
   status.textContent="Enter an activated HelioHost member email and password.";
   return;
  }
  busy=true;button.disabled=true;
  status.textContent="Checking the independent HelioHost member service…";
  try {
   const ok=await signInHelioHostMember({
    email:enteredEmail,password:enteredPassword,fetchImpl,origin:loc.origin
   });
   if(ok) {
    status.textContent="HelioHost member session confirmed. Returning to Crossfire.";
    // The host-only HttpOnly session cookie is carried by the browser, never
    // manually read or exposed to the emulator JavaScript.
    loc.assign(returnTo);
   } else {
    status.textContent="HelioHost score sign-in was not accepted or is not yet released. Your existing website login is unchanged.";
   }
  } finally {
   password.value="";
   busy=false;button.disabled=false;
  }
 });
 return true;
}
if(typeof document!=="undefined")initHelioHostScoreLogin();
