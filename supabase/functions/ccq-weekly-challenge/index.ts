import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function cors(req: Request) { const origin=req.headers.get("origin")||"";return {"Access-Control-Allow-Origin":origin===ORIGIN?ORIGIN:ORIGIN,"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"} }
function json(req: Request, body: unknown, status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),"Content-Type":"application/json"}})}
function weekStart(now=new Date()){const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));const day=d.getUTCDay();d.setUTCDate(d.getUTCDate()-((day+6)%7));return d.toISOString().slice(0,10)}
function seedFor(week:string){return `CCQ-WEEKLY-${week.replaceAll("-","")}`}
function int(value:unknown,min:number,max:number){return Math.max(min,Math.min(max,Math.floor(Number(value)||0)))}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
  if(req.method!=="POST")return json(req,{ok:false,error:"Method not allowed"},405);
  if(!SUPABASE_URL||!SERVICE_KEY)return json(req,{ok:false,error:"Challenge service is not configured"},500);
  const service=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),currentWeek=weekStart(),seed=seedFor(currentWeek);
  let payload:Record<string,unknown>={};try{payload=await req.json()}catch{return json(req,{ok:false,error:"Invalid JSON"},400)}
  const action=String(payload.action||"status");
  const auth=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");let user:any=null;if(auth){const result=await service.auth.getUser(auth);user=result.data?.user||null}

  async function leadersFor(week:string){const {data,error}=await service.from("ccq_weekly_leaderboard").select("player_name,score,deepest_floor,duration_ms,level,completed").eq("week_start",week).order("score",{ascending:false}).order("deepest_floor",{ascending:false}).order("duration_ms",{ascending:true}).limit(20);return{data:data||[],error}}

  if(action==="status"){
    const leaders=await leadersFor(currentWeek);if(leaders.error)return json(req,{ok:false,error:"Leaderboard unavailable"},503);
    if(!user)return json(req,{ok:true,ready:true,signedIn:false,locked:false,weekStart:currentWeek,seed,leaderboard:leaders.data});
    const {data:profile}=await service.from("profiles").select("username,display_name,banned").eq("id",user.id).maybeSingle();
    const {data:attempt}=await service.from("ccq_weekly_attempts").select("id,status,started_at,finished_at,score,deepest_floor").eq("week_start",currentWeek).eq("user_id",user.id).maybeSingle();
    const playerName=String(profile?.username||profile?.display_name||"").trim();
    return json(req,{ok:true,ready:true,signedIn:Boolean(playerName&&!profile?.banned),locked:Boolean(attempt),weekStart:currentWeek,seed,playerName,attempt,leaderboard:leaders.data});
  }

  if(!user)return json(req,{ok:false,error:"Sign in with a registered CCG website account first"},401);
  const {data:profile,error:profileError}=await service.from("profiles").select("username,display_name,banned").eq("id",user.id).maybeSingle();
  if(profileError||!profile||profile.banned)return json(req,{ok:false,error:"This account cannot enter the weekly challenge"},403);
  const playerName=String(profile.username||profile.display_name||"").trim().slice(0,64);
  if(!playerName)return json(req,{ok:false,error:"Add an account name to your CCG profile before entering"},409);

  if(action==="start"){
    const {data:existing}=await service.from("ccq_weekly_attempts").select("*").eq("week_start",currentWeek).eq("user_id",user.id).maybeSingle();
    if(existing)return json(req,{ok:false,error:"This week's attempt has already been used",locked:true,weekStart:currentWeek},409);
    const {data:attempt,error}=await service.from("ccq_weekly_attempts").insert({week_start:currentWeek,user_id:user.id,player_name:playerName,seed}).select("id,status,started_at").single();
    if(error)return json(req,{ok:false,error:error.code==="23505"?"This week's attempt has already been used":"Could not reserve the weekly attempt"},error.code==="23505"?409:500);
    const leaders=await leadersFor(currentWeek);
    return json(req,{ok:true,signedIn:true,locked:true,weekStart:currentWeek,playerName,seed,attempt,leaderboard:leaders.data});
  }

  if(action==="finish"){
    const attemptId=String(payload.attemptId||""),submissionId=String(payload.submissionId||"").slice(0,160),result=(payload.result||{}) as Record<string,unknown>;
    // Do not tie retries to the current Monday. A run completed during a week
    // rollover can still safely finish the exact attempt it reserved earlier.
    const {data:attempt}=await service.from("ccq_weekly_attempts").select("id,status,started_at,player_name,week_start,score,deepest_floor,duration_ms,level,completed").eq("id",attemptId).eq("user_id",user.id).maybeSingle();
    if(!attempt)return json(req,{ok:false,error:"Weekly attempt not found"},404);
    const resultWeek=String(attempt.week_start||currentWeek);
    if(attempt.status==="finished"){
      const leaders=await leadersFor(resultWeek);
      return json(req,{ok:true,locked:true,idempotent:true,submissionId,weekStart:resultWeek,leaderboard:leaders.data});
    }
    const score=int(result.score,0,99999999),deepest=int(result.deepestFloor,1,5),duration=int(result.durationMs,0,86400000),level=int(result.level,1,99),completed=Boolean(result.completed),stats={kills:int(result.kills,0,99999),secrets:int(result.secrets,0,9999)};
    const {data:updated,error:updateError}=await service.from("ccq_weekly_attempts").update({status:"finished",finished_at:new Date().toISOString(),score,deepest_floor:deepest,duration_ms:duration,level,completed,stats}).eq("id",attempt.id).eq("status","started").select("id").maybeSingle();
    if(updateError)return json(req,{ok:false,error:"Could not record the weekly result"},500);
    // A simultaneous retry may have won the conditional update. Either way,
    // attempt_id is the idempotency key and the leaderboard row is unique.
    if(updated)await service.from("ccq_weekly_leaderboard").upsert({attempt_id:attempt.id,week_start:resultWeek,player_name:attempt.player_name,score,deepest_floor:deepest,duration_ms:duration,level,completed},{onConflict:"attempt_id"});
    const leaders=await leadersFor(resultWeek);
    return json(req,{ok:true,locked:true,idempotent:!updated,submissionId,weekStart:resultWeek,leaderboard:leaders.data});
  }
  return json(req,{ok:false,error:"Unknown action"},400);
});
