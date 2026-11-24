import { normaliseArenaBoard } from '../view/arena-board.mjs';

const ORIGIN='https://api.cheekycommodoregamer.co.uk';
const SIERRA='c64-crossfire-sierra-online';
const PROFILES=new Map([
  [SIERRA,{path:'/v1/arena/sierra-crossfire/leaderboard',maxScore:999999}],
  ['c64-dropzone',{path:'/v1/arena/dropzone/leaderboard',maxScore:9999999}]
]);
const SLUG=/^[a-z0-9][a-z0-9-]{2,98}[a-z0-9]$/;
const MAX_JSON_BYTES=4096;

export function sierraLeaderboardUrl(options={}) {
  return crtLeaderboardUrl(SIERRA,options);
}

function crtLeaderboardUrl(gameKey,{board='alltime',challengeSlug=null}={}) {
  const profile=PROFILES.get(gameKey);
  if(!profile)return null;
  if(board!=='alltime' && board!=='challenge')return null;
  if(board==='alltime' && challengeSlug!==null)return null;
  if(board==='challenge' && challengeSlug!==null &&
     (typeof challengeSlug!=='string'||!SLUG.test(challengeSlug)))return null;
  const query=new URLSearchParams({gameKey,board});
  if(board==='challenge' && challengeSlug!==null)query.set('challengeSlug',challengeSlug);
  return ORIGIN+profile.path+'?'+query;
}

const unavailable=()=>Object.freeze({status:'unavailable',rows:[]});

/**
 * An opt-in, abortable GET, no credentials, no private account or session data.
 * The backend may choose the current published challenge if no slug was given.
 * All response records pass the existing strict scoreboard allowlist.
 */
export function readHelioHostSierraBoard(options={}) {
  return readHelioHostCrtBoard(SIERRA,options);
}

export async function readHelioHostCrtBoard(gameKey,{
  board='alltime',challengeSlug=null,enabled=false,
  fetchImpl=globalThis.fetch,signal
}={}) {
  const url=crtLeaderboardUrl(gameKey,{board,challengeSlug});
  if(!enabled || !url || typeof fetchImpl!=='function')return unavailable();
  try {
    const response=await fetchImpl(url,{
      method:'GET',mode:'cors',credentials:'omit',cache:'no-store',
      redirect:'error',signal
    });
    if(!response?.ok || typeof response.text!=='function')return unavailable();
    const type=response.headers?.get?.('content-type');
    if(type && !/^application\/json(?:;|$)/i.test(type.trim()))return unavailable();
    const raw=await response.text();
    if(typeof raw!=='string'||raw.length>MAX_JSON_BYTES)return unavailable();
    const payload=JSON.parse(raw);
    if(!payload || payload.gameKey!==gameKey || payload.board!==board)return unavailable();
    const selected=board==='challenge' && challengeSlug===null
      ? payload.challengeSlug : challengeSlug;
    if(board==='challenge' && payload.status==='available' &&
       (typeof selected!=='string'||!SLUG.test(selected)))return unavailable();
    const model=normaliseArenaBoard(payload,{
      gameKey,board,challengeSlug:selected,maxScore:PROFILES.get(gameKey).maxScore
    });
    return Object.freeze(model);
  } catch {
    return unavailable();
  }
}
