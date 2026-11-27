/**
 * Transitional standard CCG website identity for Arena. No password handling,
 * new auth storage, direct score writes to the source, or logged tokens.
 * The server still validates the bearer and current source session.
 */
const SITE='https://www.cheekycommodoregamer.co.uk';
const API='https://api.cheekycommodoregamer.co.uk';
const SOURCE='https://lcslgxpgmttaexsorxik.supabase.co';
const GAMES=new Set(['c64-crossfire-sierra-online','c64-dropzone']);
const JWT=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const CSRF=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

/** Anonymous CSRF bootstrap advertises capability, never confirms identity. */
export async function readWebsiteScoreCapability({origin='',gameKey,fetchImpl=globalThis.fetch,signal}={}){
 if(origin!==SITE||!GAMES.has(gameKey)||typeof fetchImpl!=='function'||signal?.aborted)return null;
 try{
  const response=await fetchImpl(API+'/v1/member/csrf',{method:'GET',mode:'cors',
   credentials:'include',cache:'no-store',redirect:'error',signal});
  if(!response?.ok||signal?.aborted)return null;
  const type=response.headers?.get?.('content-type');
  if(type&&!/^application\/json(?:;|$)/i.test(type))return null;
  const body=await response.text();
  if(typeof body!=='string'||body.length>4096||signal?.aborted)return null;
  const payload=JSON.parse(body);
  const mode=payload?.websiteScores;
  if(!CSRF.test(payload?.csrf||'')||mode?.version!==1||
     !Array.isArray(mode.games)||mode.games.length>2||
     new Set(mode.games).size!==mode.games.length||
     !mode.games.every(g=>GAMES.has(g))||!mode.games.includes(gameKey))return null;
  return Object.freeze({gameKey,csrf:payload.csrf});
 }catch{return null;}
}

/** Only use the website's existing shared client, not another storage key. */
export async function standardWebsiteSession({win=globalThis.window,client=null}={}){
 try{
  if(win?.location?.origin!==SITE||win.CCG_SUPABASE_URL?.replace(/\/$/,'')!==SOURCE)return null;
  const shared=client??await win.ccgSupabase?.getClient?.();
  const result=await shared?.auth?.getSession?.();
  const session=result?.data?.session;
  if(result?.error||!UUID.test(session?.user?.id||'')||
     typeof session?.access_token!=='string'||session.access_token.length>8192||
     !JWT.test(session.access_token))return null;
  return {id:session.user.id,token:session.access_token};
 }catch{return null;}
}

/** Re-read existing session for every POST to allow refresh; never use old tokens. */
export function createWebsiteScoreCredential({origin='',capability,getSession}={}){
 if(origin!==SITE||!GAMES.has(capability?.gameKey)||!CSRF.test(capability?.csrf||'')||
    typeof getSession!=='function')return null;
 let accountId=null;
 return async()=>{
  try{
   const current=await getSession();
   if(!UUID.test(current?.id||'')||typeof current?.token!=='string'||
      current.token.length>8192||!JWT.test(current.token))return null;
   if(accountId!==null&&accountId!==current.id)return null;
   accountId=current.id;
   return current.token;
  }catch{return null;}
 };
}
