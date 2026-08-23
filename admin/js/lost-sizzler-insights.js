import { ensureRole } from './guard.js';

const GAME_SLUG='the-lost-sizzler';
const $=selector=>document.querySelector(selector);
let supabase=null;

function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function when(value){
  if(!value)return'—';
  try{return new Intl.DateTimeFormat('en-GB',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));}catch(_){return String(value);}
}
function status(text,state='info'){
  const node=$('#ls-insights-status');
  if(node){node.textContent=text;node.dataset.state=state;}
}
function eventLabel(type){
  return {
    start_click:'PLAY / START CLICK',
    run_started:'RUN STARTED',
    mobile_pc_notice_accept:'MOBILE PC NOTICE ACCEPTED',
    rating_submitted:'RATING SUBMITTED',
    rating_dismissed:'RATING DISMISSED'
  }[type]||String(type||'EVENT').replaceAll('_',' ').toUpperCase();
}
function startOfTodayIso(){
  const d=new Date();d.setHours(0,0,0,0);return d.toISOString();
}
async function exactCount(eventType,since=null){
  let query=supabase.from('game_play_events').select('id',{count:'exact',head:true}).eq('game_slug',GAME_SLUG).eq('event_type',eventType);
  if(since)query=query.gte('created_at',since);
  const{count,error}=await query;
  if(error)throw error;
  return count||0;
}
async function ratingStats(){
  const{data,error}=await supabase.from('game_play_events').select('rating').eq('game_slug',GAME_SLUG).eq('event_type','rating_submitted').not('rating','is',null);
  if(error)throw error;
  const values=(data||[]).map(row=>Number(row.rating)).filter(n=>Number.isFinite(n));
  const average=values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
  return{count:values.length,average};
}
function renderSummary({runsToday,totalRuns,startClicks,mobileAccepts,ratings}){
  const holder=$('#ls-insights-summary');if(!holder)return;
  const cards=[
    ['RUNS TODAY',runsToday,'Actual game sessions begun today'],
    ['TOTAL RUNS',totalRuns,'Actual recorded run starts'],
    ['PLAY / START CLICKS',startClicks,'All recorded play-entry clicks'],
    ['MOBILE ACCEPTS',mobileAccepts,'Accepted “Optimised for PC Desktop Play” notices'],
    ['AVERAGE RATING',ratings.count?`${ratings.average.toFixed(2)} / 5`:'—',`${ratings.count} rating${ratings.count===1?'':'s'} submitted`]
  ];
  holder.innerHTML=cards.map(([label,value,note])=>`<article class="ls-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`).join('');
}
function renderPlayEvents(rows){
  const holder=$('#ls-play-events');if(!holder)return;
  if(!rows.length){holder.innerHTML='<p class="arcade-muted">No Lost Sizzler player activity has been recorded yet.</p>';return;}
  holder.innerHTML=`<div class="ls-table-wrap"><table class="ls-table"><thead><tr><th>When</th><th>Player</th><th>Event</th><th>Mode</th><th>Device</th><th>Rating</th></tr></thead><tbody>${rows.map(row=>`<tr>
    <td>${esc(when(row.created_at))}</td>
    <td><b>${esc(row.player_name||'Anonymous')}</b><small>${row.session_token?`Session ${esc(String(row.session_token).slice(-8))}`:''}</small></td>
    <td><span class="ls-event ls-event-${esc(row.event_type)}">${esc(eventLabel(row.event_type))}</span></td>
    <td>${esc(row.play_mode||'—')}</td>
    <td>${esc(row.device_type||'unknown')}</td>
    <td>${row.rating?`${esc(row.rating)} / 5`:'—'}</td>
  </tr>`).join('')}</tbody></table></div>`;
}
async function loadInsights(){
  status('Refreshing Lost Sizzler activity…');
  const since=startOfTodayIso();
  try{
    const [runsToday,totalRuns,startClicks,mobileAccepts,ratings,playResult]=await Promise.all([
      exactCount('run_started',since),
      exactCount('run_started'),
      exactCount('start_click'),
      exactCount('mobile_pc_notice_accept'),
      ratingStats(),
      supabase.from('game_play_events').select('id,event_type,player_name,play_mode,device_type,rating,session_token,created_at').eq('game_slug',GAME_SLUG).order('created_at',{ascending:false}).limit(200)
    ]);
    if(playResult.error)throw playResult.error;
    renderSummary({runsToday,totalRuns,startClicks,mobileAccepts,ratings});
    renderPlayEvents(playResult.data||[]);
    status(`Updated ${when(new Date().toISOString())}.`,'success');
  }catch(error){
    console.error('[lost-sizzler-insights]',error);
    status(error?.message||'Unable to load Lost Sizzler player activity.','error');
  }
}
async function init(){
  if(!await ensureRole(['admin','superadmin']))return;
  if(!window.ccgSupabase?.getClient)throw new Error('Supabase bootstrap unavailable.');
  supabase=await window.ccgSupabase.getClient();
  $('#ls-insights-refresh')?.addEventListener('click',loadInsights);
  await loadInsights();
}
init().catch(error=>{console.error('[lost-sizzler-insights] init failed',error);status(error?.message||'Unable to initialise Lost Sizzler activity.','error');});
