import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const ALLOWED_ORIGINS = new Set([
  "https://www.cheekycommodoregamer.co.uk",
  "https://cheekycommodoregamer.co.uk"
]);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MAX_GHOST_POINTS = 900;
const LEADERBOARD_LIMIT = 5;
const STATUS_LIMIT = 60;
const STATUS_WINDOW_SECONDS = 300;
const START_LIMIT = 10;
const START_WINDOW_SECONDS = 3600;
const FINISH_LIMIT = 20;
const FINISH_WINDOW_SECONDS = 3600;
const RESULT_CLOCK_GRACE_MS = 60_000;
const GHOST_CLOCK_GRACE_MS = 15_000;

type SupabaseService = ReturnType<typeof createClient>;

function originFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  return ALLOWED_ORIGINS.has(origin) ? origin : "https://www.cheekycommodoregamer.co.uk";
}
function cors(req: Request) {
  return {"Access-Control-Allow-Origin":originFor(req),"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
}
function json(req: Request, body: unknown, status = 200, extraHeaders: Record<string,string> = {}) {
  return new Response(JSON.stringify(body), {status, headers:{...cors(req),...extraHeaders,"Content-Type":"application/json"}})
}
function weekStart(now = new Date()) { const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));const day=d.getUTCDay();d.setUTCDate(d.getUTCDate()-((day+6)%7));return d.toISOString().slice(0,10) }
function seedFor(week: string) { return `CCQ-WEEKLY-${week.replaceAll("-","")}` }
function int(value: unknown, min: number, max: number) { return Math.max(min,Math.min(max,Math.floor(Number(value)||0))) }
function sanitiseGhostPath(value: unknown) {
  if(!Array.isArray(value))return [];
  const out:{f:number,x:number,y:number,t:number}[]=[];
  for(const raw of value.slice(0,MAX_GHOST_POINTS)){
    if(!raw||typeof raw!=="object")continue;
    const row=raw as Record<string,unknown>;
    const point={f:int(row.f,1,5),x:int(row.x,0,512),y:int(row.y,0,512),t:int(row.t,0,86400000)};
    if(out.length&&point.t<out[out.length-1].t)continue;
    out.push(point);
  }
  return out;
}
function ghostPath(value: unknown) { return sanitiseGhostPath(value) }
async function sha256Short(value:string){
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));
  return Array.from(digest.slice(0,12),byte=>byte.toString(16).padStart(2,"0")).join("");
}
async function requestFingerprint(req:Request){
  const forwarded=String(req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||req.headers.get("x-real-ip")||"").split(",")[0].trim();
  const agent=String(req.headers.get("user-agent")||"").slice(0,180);
  return sha256Short(`${forwarded||"unknown"}|${agent||"unknown"}`);
}
async function consumeBudget(service:SupabaseService,bucketKey:string,limit:number,windowSeconds:number){
  const {data,error}=await service.rpc("consume_lost_sizzler_request_budget",{p_bucket_key:bucketKey.slice(0,160),p_limit:limit,p_window_seconds:windowSeconds});
  if(error)throw error;
  const row=Array.isArray(data)?data[0]:data;
  return{allowed:row?.allowed===true,retryAfter:Math.max(1,Math.min(windowSeconds,Number(row?.retry_after_seconds)||1))};
}
async function enforceBudget(req:Request,service:SupabaseService,bucketKey:string,limit:number,windowSeconds:number){
  try{
    const budget=await consumeBudget(service,bucketKey,limit,windowSeconds);
    if(budget.allowed)return null;
    return json(req,{ok:false,error:"Too many requests. Please try again shortly."},429,{"Retry-After":String(budget.retryAfter)});
  }catch(error){
    console.error("[CCG weekly] request budget unavailable",error);
    return json(req,{ok:false,error:"Weekly challenge service temporarily unavailable"},503);
  }
}

Deno.serve(async (req: Request) => {
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
  if(req.method!=="POST")return json(req,{ok:false,error:"Method not allowed"},405);
  const requestOrigin=String(req.headers.get("origin")||"").trim();
  if(requestOrigin&&!ALLOWED_ORIGINS.has(requestOrigin))return json(req,{ok:false,error:"Origin not allowed"},403);
  if(!SUPABASE_URL||!SERVICE_KEY)return json(req,{ok:false,error:"Challenge service is not configured"},500);

  let payload:Record<string,unknown>={};try{payload=await req.json()}catch{return json(req,{ok:false,error:"Invalid JSON"},400)}
  const action=String(payload.action||"status").toLowerCase();
  if(!["status","ghost","start","finish"].includes(action))return json(req,{ok:false,error:"Unknown action"},400);

  const service=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const fingerprint=await requestFingerprint(req);
  const budget=action==="finish"
    ?await enforceBudget(req,service,`weekly:finish:${fingerprint}`,FINISH_LIMIT,FINISH_WINDOW_SECONDS)
    :action==="start"
      ?await enforceBudget(req,service,`weekly:start:${fingerprint}`,START_LIMIT,START_WINDOW_SECONDS)
      :await enforceBudget(req,service,`weekly:read:${fingerprint}`,STATUS_LIMIT,STATUS_WINDOW_SECONDS);
  if(budget)return budget;

  const currentWeek=weekStart(),seed=seedFor(currentWeek);
  const auth=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");let user:any=null;if(auth){const result=await service.auth.getUser(auth);user=result.data?.user||null}

  async function leadersFor(week:string){
    const {data,error}=await service.from("ccq_weekly_leaderboard").select("player_name,score,deepest_floor,duration_ms,level,completed").eq("week_start",week).order("score",{ascending:false}).order("deepest_floor",{ascending:false}).order("duration_ms",{ascending:true}).limit(LEADERBOARD_LIMIT);
    return{data:data||[],error};
  }

  async function findGhost(week:string,excludeUserId=""){
    let query=service.from("ccq_weekly_attempts").select("user_id,player_name,score,deepest_floor,stats,ghost_path").eq("week_start",week).eq("status","finished").order("score",{ascending:false}).order("deepest_floor",{ascending:false}).limit(20);
    if(excludeUserId)query=query.neq("user_id",excludeUserId);
    const {data,error}=await query;
    if(error||!Array.isArray(data))return null;
    for(const row of data){
      const path=ghostPath(row?.ghost_path?.length?row.ghost_path:row?.stats?.ghostPath);
      if(path.length<2)continue;
      return{playerName:String(row?.player_name||"Weekly Player").slice(0,64),score:int(row?.score,0,99999999),deepestFloor:int(row?.deepest_floor,1,5),path};
    }
    return null;
  }

  if(action==="status"){
    const leaders=await leadersFor(currentWeek);if(leaders.error)return json(req,{ok:false,error:"Leaderboard unavailable"},503);
    const ghostReplay=await findGhost(currentWeek,user?.id||"");
    if(!user)return json(req,{ok:true,ready:true,signedIn:false,locked:false,weekStart:currentWeek,seed,leaderboard:leaders.data,ghostReplay});
    const {data:profile}=await service.from("profiles").select("username,display_name,banned").eq("id",user.id).maybeSingle();
    const {data:attempt}=await service.from("ccq_weekly_attempts").select("id,status,started_at,finished_at,score,deepest_floor").eq("week_start",currentWeek).eq("user_id",user.id).maybeSingle();
    const playerName=String(profile?.username||profile?.display_name||"").trim();
    return json(req,{ok:true,ready:true,signedIn:Boolean(playerName&&!profile?.banned),locked:Boolean(attempt),weekStart:currentWeek,seed,playerName,attempt,leaderboard:leaders.data,ghostReplay});
  }

  if(!user)return json(req,{ok:false,error:"Sign in with a registered CCG website account first"},401);
  const {data:profile,error:profileError}=await service.from("profiles").select("username,display_name,banned").eq("id",user.id).maybeSingle();
  if(profileError||!profile||profile.banned)return json(req,{ok:false,error:"This account cannot enter the weekly challenge"},403);
  const playerName=String(profile.username||profile.display_name||"").trim().slice(0,64);
  if(!playerName)return json(req,{ok:false,error:"Add an account name to your CCG profile before entering"},409);

  if(action==="ghost"){
    const ghostReplay=await findGhost(currentWeek,user.id);
    return json(req,{ok:true,weekStart:currentWeek,ghost:ghostReplay,ghostReplay});
  }

  if(action==="start"){
    const {data:existing,error:existingError}=await service.from("ccq_weekly_attempts").select("id,status,started_at").eq("week_start",currentWeek).eq("user_id",user.id).maybeSingle();
    if(existingError)return json(req,{ok:false,error:"Could not verify this week's attempt"},503);
    if(existing)return json(req,{ok:false,error:"This week's attempt has already been used",locked:true,weekStart:currentWeek},409);
    const {data:attempt,error}=await service.from("ccq_weekly_attempts").insert({week_start:currentWeek,user_id:user.id,player_name:playerName,seed}).select("id,status,started_at").single();
    if(error)return json(req,{ok:false,error:error.code==="23505"?"This week's attempt has already been used":"Could not reserve the weekly attempt"},error.code==="23505"?409:500);
    const leaders=await leadersFor(currentWeek),ghostReplay=await findGhost(currentWeek,user.id);
    return json(req,{ok:true,signedIn:true,locked:true,weekStart:currentWeek,playerName,seed,attempt,leaderboard:leaders.data,ghostReplay});
  }

  if(action==="finish"){
    const attemptId=String(payload.attemptId||""),result=(payload.result||{}) as Record<string,unknown>;
    const {data:attempt,error:attemptError}=await service.from("ccq_weekly_attempts").select("id,status,started_at,player_name,week_start,score,deepest_floor,duration_ms,level,completed,stats").eq("id",attemptId).eq("user_id",user.id).maybeSingle();
    if(attemptError)return json(req,{ok:false,error:"Weekly attempt lookup failed"},503);
    if(!attempt)return json(req,{ok:false,error:"Weekly attempt not found"},404);
    const resultWeek=String(attempt.week_start||currentWeek);

    if(attempt.status==="finished"){
      const {error:repairError}=await service.from("ccq_weekly_leaderboard").upsert({attempt_id:attempt.id,week_start:resultWeek,player_name:attempt.player_name,score:int(attempt.score,0,99999999),deepest_floor:int(attempt.deepest_floor,1,5),duration_ms:int(attempt.duration_ms,0,86400000),level:int(attempt.level,1,99),completed:Boolean(attempt.completed)},{onConflict:"attempt_id"});
      if(repairError)return json(req,{ok:false,error:"Finished score is awaiting leaderboard repair"},503);
      const leaders=await leadersFor(resultWeek),ghostReplay=await findGhost(resultWeek,user.id);
      return json(req,{ok:true,locked:true,idempotent:true,weekStart:resultWeek,leaderboard:leaders.data,ghostReplay});
    }

    const score=int(result.score,0,99999999),deepest=int(result.deepestFloor,1,5),duration=int(result.durationMs,0,86400000),level=int(result.level,1,99),completed=Boolean(result.completed),path=ghostPath(result.ghostPath),stats={kills:int(result.kills,0,99999),secrets:int(result.secrets,0,9999),ghostPath:path};
    const startedAt=Date.parse(String(attempt.started_at||""));
    const serverElapsed=Number.isFinite(startedAt)?Math.max(0,Date.now()-startedAt):null;
    if(completed&&deepest!==5)return json(req,{ok:false,error:"Completed weekly runs must finish on Floor 5"},422);
    if(serverElapsed!==null&&duration>serverElapsed+RESULT_CLOCK_GRACE_MS)return json(req,{ok:false,error:"Weekly run duration failed integrity validation"},422);
    if(path.some(point=>point.f>deepest))return json(req,{ok:false,error:"Ghost replay floor exceeds the submitted run"},422);
    if(path.length&&path[path.length-1].t>duration+GHOST_CLOCK_GRACE_MS)return json(req,{ok:false,error:"Ghost replay duration exceeds the submitted run"},422);

    const {data:updated,error:updateError}=await service.from("ccq_weekly_attempts").update({status:"finished",finished_at:new Date().toISOString(),score,deepest_floor:deepest,duration_ms:duration,level,completed,stats,ghost_path:path}).eq("id",attempt.id).eq("status","started").select("id").maybeSingle();
    if(updateError)return json(req,{ok:false,error:"Could not record the weekly result"},500);

    let persisted={score,deepest_floor:deepest,duration_ms:duration,level,completed};
    if(!updated){
      const {data:finished,error:finishedError}=await service.from("ccq_weekly_attempts").select("status,score,deepest_floor,duration_ms,level,completed").eq("id",attempt.id).eq("user_id",user.id).maybeSingle();
      if(finishedError)return json(req,{ok:false,error:"Finished score is awaiting leaderboard repair"},503);
      if(!finished||finished.status!=="finished")return json(req,{ok:false,error:"Weekly result is still being finalised"},409);
      persisted={score:int(finished.score,0,99999999),deepest_floor:int(finished.deepest_floor,1,5),duration_ms:int(finished.duration_ms,0,86400000),level:int(finished.level,1,99),completed:Boolean(finished.completed)};
    }

    const {error:leaderboardError}=await service.from("ccq_weekly_leaderboard").upsert({attempt_id:attempt.id,week_start:resultWeek,player_name:attempt.player_name,...persisted},{onConflict:"attempt_id"});
    if(leaderboardError)return json(req,{ok:false,error:updated?"Score saved; leaderboard projection will retry":"Finished score is awaiting leaderboard repair"},503);
    const leaders=await leadersFor(resultWeek),ghostReplay=await findGhost(resultWeek,user.id);
    return json(req,{ok:true,locked:true,idempotent:!updated,weekStart:resultWeek,leaderboard:leaders.data,ghostReplay});
  }

  return json(req,{ok:false,error:"Unknown action"},400);
});
