/**
 * Source-only, disabled-by-default HelioHost Sierra CRT member enrollment UI.
 *
 * The API decides availability. Signup NEVER activates a member immediately;
 * it creates a disabled account with a one-use email proof only if the hosted
 * verified-mail release gates are on. No Supabase login, browser storage,
 * login shortcut, query-string bearer or administrator credential is used.
 */
const SITE_ORIGIN="https://www.cheekycommodoregamer.co.uk";
const API_ORIGIN="https://api.cheekycommodoregamer.co.uk";
const CSRF=/^[a-f0-9]{64}$/;
const VERIFY=/^[a-f0-9]{64}$/;
const MAX_REPLY=4096;

async function boundedJSON(response) {
 if(!response?.ok || typeof response.text!=="function")return null;
 const type=response.headers?.get?.("content-type");
 if(type && !/^application\/json(?:;|$)/i.test(type.trim()))return null;
 const raw=await response.text();
 if(typeof raw!=="string"||raw.length>MAX_REPLY)return null;
 try {
  const value=JSON.parse(raw);
  return value&&typeof value==="object"&&!Array.isArray(value)?value:null;
 }catch{return null;}
}

/**
 * Always first obtain the host-only CSRF session, then POST the fixed route.
 * A POST is made only to the canonical HTTPS API and is never redirected.
 */
async function postMember(path,body,fetchImpl) {
 if(typeof fetchImpl!=="function")return null;
 try {
  const token=await boundedJSON(await fetchImpl(API_ORIGIN+"/v1/member/csrf",{
   method:"GET",mode:"cors",credentials:"include",cache:"no-store",redirect:"error"
  }));
  if(!CSRF.test(token?.csrf||""))return null;
  return await boundedJSON(await fetchImpl(API_ORIGIN+path,{
   method:"POST",mode:"cors",credentials:"include",cache:"no-store",redirect:"error",
   headers:{"Content-Type":"application/json","X-CCG-CSRF":token.csrf},
   body:JSON.stringify(body)
  }));
 }catch{return null;}
}

/**
 * @returns {"accepted"|"invalid"|"unavailable"}
 *
 * Accepted is purposefully NON-ENUMERATING: neither a duplicate email nor
 * a rate-limit decision may be inferred by the website or displayed to users.
 */
export async function registerHelioHostScoreMember({
 email,password,origin="",fetchImpl=globalThis.fetch
}={}) {
 if(origin!==SITE_ORIGIN || typeof email!=="string"
    || typeof password!=="string"
    || email.trim().length>255
    || email.trim().length<3
    || !/^\S+@\S+\.\S+$/.test(email.trim())
    || password.length<14 || password.length>1024
    || password.includes("\0"))return "invalid";
 const response=await postMember("/v1/member/signup",{
  email:email.trim(),password
 },fetchImpl);
 return response?.accepted===true ? "accepted" : "unavailable";
}

/**
 * @returns {"verified"|"invalid"|"unavailable"}
 *
 * Verification proof is ONLY in a protected POST body, never a URL.
 * The frontend never invents an account session after verification.
 */
export async function verifyHelioHostScoreEmail({
 token,origin="",fetchImpl=globalThis.fetch
}={}) {
 if(origin!==SITE_ORIGIN||typeof token!=="string"||
    !VERIFY.test(token))return "invalid";
 const response=await postMember("/v1/member/verify-email",{token},fetchImpl);
 return response?.verified===true ? "verified" : "unavailable";
}

export function initHelioHostScoreRegister(
 doc=globalThis.document,loc=globalThis.location,fetchImpl=globalThis.fetch
) {
 const signup=doc?.getElementById?.("scoreMemberRegistration");
 const verification=doc?.getElementById?.("scoreMemberVerification");
 const signupStatus=doc?.getElementById?.("scoreSignupStatus");
 const verifyStatus=doc?.getElementById?.("scoreVerifyStatus");
 const signupButton=doc?.getElementById?.("scoreSignupSubmit");
 const verifyButton=doc?.getElementById?.("scoreVerifySubmit");
 const email=doc?.getElementById?.("scoreRegisterEmail");
 const password=doc?.getElementById?.("scoreRegisterPassword");
 const proof=doc?.getElementById?.("scoreVerifyToken");
 if(!signup||!verification||!signupStatus||!verifyStatus||
    !signupButton||!verifyButton||!email||!password||!proof)return false;
 if(loc?.origin!==SITE_ORIGIN){
  signupStatus.textContent="HelioHost registration is available only on the official CCG website.";
  verifyStatus.textContent="Email verification is unavailable from this website origin.";
  return false;
 }
 let busySignup=false,busyVerify=false;
 signup.addEventListener("submit",async event=>{
  event.preventDefault();
  if(busySignup)return;
  const address=String(email.value||"").trim();
  const secret=String(password.value||"");
  busySignup=true;signupButton.disabled=true;
  signupStatus.textContent="Checking the independent HelioHost member service…";
  try {
   const status=await registerHelioHostScoreMember({
    email:address,password:secret,origin:loc.origin,fetchImpl
   });
   if(status==="accepted"){
    signupStatus.textContent="Request accepted. If your email is eligible and delivery is available, check it for a verification code. A new account cannot sign in until verified.";
   }else if(status==="invalid"){
    signupStatus.textContent="Enter a valid email and a password of at least 14 characters.";
   }else{
    signupStatus.textContent="HelioHost member registration is not yet available. No account activation has been confirmed.";
   }
  }finally{
   password.value="";
   busySignup=false;signupButton.disabled=false;
  }
 });
 verification.addEventListener("submit",async event=>{
  event.preventDefault();
  if(busyVerify)return;
  const submitted=String(proof.value||"").trim();
  busyVerify=true;verifyButton.disabled=true;
  verifyStatus.textContent="Checking the one-use email verification code…";
  try{
   const status=await verifyHelioHostScoreEmail({
    token:submitted,origin:loc.origin,fetchImpl
   });
   if(status==="verified"){
    verifyStatus.textContent="Email verification confirmed. You can now use the separate Crossfire member sign-in.";
   }else if(status==="invalid"){
    verifyStatus.textContent="Enter the complete 64-character verification code.";
   }else{
    verifyStatus.textContent="Verification was not accepted or is not yet available. The code may be expired or already used.";
   }
  }finally{
   proof.value="";
   busyVerify=false;verifyButton.disabled=false;
  }
 });
 signupButton.disabled=false;
 verifyButton.disabled=false;
 return true;
}
if(typeof document!=="undefined")initHelioHostScoreRegister();
