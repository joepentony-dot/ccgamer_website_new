import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {"Access-Control-Allow-Origin": origin === ORIGIN ? ORIGIN : ORIGIN,"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
}
function json(req: Request, body: unknown, status = 200) { return new Response(JSON.stringify(body), {status, headers:{...cors(req),"Content-Type":"application/json"}}) }
function weekStart(now = new Date()) { const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));const day=d.getUTCDay();d.setUTCDate(d.getUTCDate()-((day+6)%7));return d.toISOString().slice(0,10) }
function seedFor(week: string) { return `CCQ-WEEKLY-${week.replaceAll("-","")}` }
function int(value: unknown, min: number, max: number) { return Math.max(min,Math.min(max,Math.floor(Number(value)||0))) }
function ghostPath(value: unknown) {
  if(!Array.isArray(value))return [];
  const out:{f:number,x:number,y:number,t:number}[]=[];
  for(const row of value.slice(0,360)){
    if(!row||typeof row!=="object")continue;
    const item=row as Record<string,unknown>,f=int(item.f,1,5),x=int(item.x,0,255),y=int(item.y,0,255),t=int(item.t,0,86400000);
    if(out.length&&t<out[out.length-1].t)continue;
    out.push({f,x,y,t});
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
  if(req.method!=="POST")return json(req,{ok:false,error:"Method not allowed"},405);
  if(!SUPABASE_URL||!SERVICE_KEY)return json(req,{ok:false,error:"Challenge service is not configured"},500);
  const service=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),week=weekStart(),seed=seedFor(week);
  let payload:Record<string,unknown>={};try{payload=await req.json()}catch{return json(req,{ok:false,error:"Invalid JSON"},400)}
  const {data:leaders,error:leaderError}=await service.from("ccq_weekly_leaderboard").select("player_name,score,deepest_floor,duration_ms,level,completed").eq("week_start",week).order("score",{ascending:false}).order("deepest_floor",{ascending:false}).order("duration_ms",{ascending:true}).limit(20);
  if(leaderError)return json(req,{ok:false,error:"Leaderboard unavailable"},503);
  const auth=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");let user:any=null;if(auth){const result=await service.auth.getUser(auth);user=result.data?.user||null}
  const action=String(payload.action||"status");
  if(action==="status"){
    if(!user)return json(req,{ok:true,ready:true,signedIn:false,locked:false,weekStart:week,seed,leaderboard:leaders||[]});
    const {data:profile}=await service.from("profiles").select("username,display_name,banned").eq("id",user.id).maybeSingle();
    const {data:attempt}=await service.from("ccq_weekly_attempts").select("id,status,started_at,finished_at,score,deepest_floor").eq("week_start",week).eq("user_id",user.id).maybeSingle();
    const playerName=String(profile?.username||profile?.display_name||"").trim();
    return json(req,{ok:true,ready:true,signedIn:Boolean(playerName&&!profile?.banned),locked:Boolean(attempt),weekStart:week,seed,playerName,attempt,leaderboard:leaders||[]});
  }
  if(!user)return json(req,{ok:false,error:"Sign in with a registered CCG website account first"},401);
  const {data:profile,error:profileError}=await service.from("profiles").select("username,display_name,banned").eq("id",user.id).maybeSingle();
  if(profileError||!profile||profile.banned)return json(req,{ok:false,error:"This account cannot enter the weekly challenge"},403);
  const playerName=String(profile.username||profile.display_name||"").trim().slice(0,64);
  if(!playerName)return json(req,{ok:false,error:"Add an account name to your CCG profile before entering"},409);
  if(action==="ghost"){
    const {data:attempts,error}=await service.from("ccq_weekly_attempts").select("user_id,player_name,score,deepest_floor,stats").eq("week_start",week).eq("status","finished").neq("user_id",user.id).order("score",{ascending:false}).limit(20);
    if(error)return json(req,{ok:false,error:"Weekly ghost unavailable"},503);
    const source=(attempts||[]).find((row:any)=>Array.isArray(row?.stats?.ghostPath)&&row.stats.ghostPath.length>1);
    if(!source)return json(req,{ok:true,ghost:null,weekStart:week});
    return json(req,{ok:true,weekStart:week,ghost:{playerName:String(source.player_name||"Weekly Player").slice(0,64),score:int(source.score,0,99999999),deepestFloor:int(source.deepest_floor,1,5),path:ghostPath(source.stats.ghostPath)}});
  }
  if(action==="start"){
    const {data:existing}=await service.from("ccq_weekly_attempts").select("*").eq("week_start",week).eq("user_id",user.id).maybeSingle();
    if(existing)return json(req,{ok:false,error:"This week's attempt has already been used",locked:true,weekStart:week},409);
    const {data:attempt,error}=await service.from("ccq_weekly_attempts").insert({week_start:week,user_id:user.id,player_name:playerName,seed}).select("id,status,started_at").single();
    if(error)return json(req,{ok:false,error:error.code==="23505"?"This week's attempt has already been used":"Could not reserve the weekly attempt"},error.code==="23505"?409:500);
    return json(req,{ok:true,signedIn:true,locked:true,weekStart:week,playerName,seed,attempt,leaderboard:leaders||[]});
  }
  if(action==="finish"){
    const attemptId=String(payload.attemptId||""),result=(payload.result||{}) as Record<string,unknown>;
    const {data:attempt}=await service.from("ccq_weekly_attempts").select("id,status,started_at,player_name").eq("id",attemptId).eq("week_start",week).eq("user_id",user.id).maybeSingle();
    if(!attempt)return json(req,{ok:false,error:"Weekly attempt not found"},404);
    if(attempt.status==="finished")return json(req,{ok:true,locked:true,weekStart:week,leaderboard:leaders||[]});
    const score=int(result.score,0,99999999),deepest=int(result.deepestFloor,1,5),duration=int(result.durationMs,0,86400000),level=int(result.level,1,99),completed=Boolean(result.completed),stats={kills:int(result.kills,0,99999),secrets:int(result.secrets,0,9999),ghostPath:ghostPath(result.ghostPath)};
    const {error:updateError}=await service.from("ccq_weekly_attempts").update({status:"finished",finished_at:new Date().toISOString(),score,deepest_floor:deepest,duration_ms:duration,level,completed,stats}).eq("id",attempt.id).eq("status","started");
    if(updateError)return json(req,{ok:false,error:"Could not record the weekly result"},500);
    await service.from("ccq_weekly_leaderboard").upsert({attempt_id:attempt.id,week_start:week,player_name:attempt.player_name,score,deepest_floor:deepest,duration_ms:duration,level,completed},{onConflict:"attempt_id"});
    const {data:fresh}=await service.from("ccq_weekly_leaderboard").select("player_name,score,deepest_floor,duration_ms,level,completed").eq("week_start",week).order("score",{ascending:false}).order("deepest_floor",{ascending:false}).order("duration_ms",{ascending:true}).limit(20);
    return json(req,{ok:true,locked:true,weekStart:week,leaderboard:fresh||[]});
  }
  return json(req,{ok:false,error:"Unknown action"},400);
});
