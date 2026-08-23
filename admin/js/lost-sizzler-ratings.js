import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

const GAME_SLUG='the-lost-sizzler';
const $=selector=>document.querySelector(selector);
let supabase=null;
let ratings=[];
let dismissedCount=0;

function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function when(value){
  if(!value)return'—';
  try{return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch(_){return String(value);}
}
function status(text,state='info'){
  const node=$('#ls-ratings-status');
  if(node){node.textContent=text;node.dataset.state=state;}
}
function startOfTodayIso(){const d=new Date();d.setHours(0,0,0,0);return d.toISOString();}
function stars(value){const n=Math.max(0,Math.min(5,Number(value)||0));return `${'★'.repeat(n)}${'☆'.repeat(5-n)}`;}
function stats(){
  const total=ratings.length;
  const counts={1:0,2:0,3:0,4:0,5:0};
  let sum=0,today=0;
  const todayStart=new Date(startOfTodayIso()).getTime();
  for(const row of ratings){
    const rating=Number(row.rating)||0;
    if(counts[rating]!==undefined)counts[rating]++;
    sum+=rating;
    if(new Date(row.created_at).getTime()>=todayStart)today++;
  }
  const average=total?sum/total:0;
  const fiveShare=total?(counts[5]/total)*100:0;
  const promptTotal=total+dismissedCount;
  const response=promptTotal?(total/promptTotal)*100:0;
  return{total,counts,average,today,fiveShare,response,promptTotal};
}
function renderSummary(){
  const holder=$('#ls-ratings-summary');if(!holder)return;
  const s=stats();
  const cards=[
    ['AVERAGE RATING',s.total?`${s.average.toFixed(2)} / 5`:'—','Across all submitted ratings'],
    ['TOTAL RATINGS',s.total,'1–5 star submissions'],
    ['RATINGS TODAY',s.today,'Since local midnight'],
    ['5 STAR SHARE',s.total?`${s.fiveShare.toFixed(1)}%`:'—','Percentage rated 5/5'],
    ['PROMPT RESPONSE',s.promptTotal?`${s.response.toFixed(1)}%`:'—',`${s.total} rated · ${dismissedCount} dismissed`]
  ];
  holder.innerHTML=cards.map(([label,value,note])=>`<article><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`).join('');
}
function renderBreakdown(){
  const holder=$('#ls-ratings-breakdown');if(!holder)return;
  const s=stats();
  if(!s.total){holder.innerHTML='<p class="ls-ratings-muted">No star ratings have been submitted yet.</p>';return;}
  holder.innerHTML=[5,4,3,2,1].map(value=>{
    const count=s.counts[value];
    const pct=s.total?(count/s.total)*100:0;
    return `<div class="ls-rating-row"><span class="ls-rating-stars">${esc(stars(value))}</span><div class="ls-rating-track"><i style="width:${pct.toFixed(2)}%"></i></div><strong>${esc(count)}</strong><small>${pct.toFixed(1)}%</small></div>`;
  }).join('');
}
function visibleRatings(){
  const star=$('#ls-ratings-star-filter')?.value||'all';
  const device=$('#ls-ratings-device-filter')?.value||'all';
  const search=String($('#ls-ratings-search')?.value||'').trim().toLowerCase();
  return ratings.filter(row=>{
    if(star!=='all'&&Number(row.rating)!==Number(star))return false;
    if(device!=='all'&&String(row.device_type||'unknown')!==device)return false;
    if(search){
      const haystack=[row.player_name,row.play_mode,row.device_type,row.build,row.session_token,row.id].map(value=>String(value??'').toLowerCase()).join(' ');
      if(!haystack.includes(search))return false;
    }
    return true;
  });
}
function renderTable(){
  const holder=$('#ls-ratings-table');if(!holder)return;
  const rows=visibleRatings();
  const count=$('#ls-ratings-visible-count');if(count)count.textContent=`${rows.length} shown / ${ratings.length} total`;
  if(!rows.length){holder.innerHTML='<p class="ls-ratings-muted">No ratings match the current filters.</p>';return;}
  holder.innerHTML=`<div class="ls-ratings-table-wrap"><table class="ls-ratings-table"><thead><tr><th>When</th><th>Rating</th><th>Player</th><th>Mode</th><th>Device</th><th>Build</th><th>Session</th></tr></thead><tbody>${rows.map(row=>`<tr>
    <td>${esc(when(row.created_at))}</td>
    <td><span class="ls-rating-value" title="${esc(row.rating)} out of 5">${esc(stars(row.rating))}<b>${esc(row.rating)}/5</b></span></td>
    <td>${esc(row.player_name||'Anonymous')}</td>
    <td>${esc(row.play_mode||'—')}</td>
    <td>${esc(row.device_type||'unknown')}</td>
    <td>${esc(row.build||'—')}</td>
    <td><code>${esc(row.session_token?String(row.session_token).slice(-10):'—')}</code></td>
  </tr>`).join('')}</tbody></table></div>`;
}
function render(){renderSummary();renderBreakdown();renderTable();}
async function loadRatings(){
  status('Refreshing Lost Sizzler ratings…');
  try{
    const [ratingResult,dismissResult]=await Promise.all([
      supabase.from('game_play_events')
        .select('id,rating,player_name,play_mode,device_type,session_token,build,created_at')
        .eq('game_slug',GAME_SLUG)
        .eq('event_type','rating_submitted')
        .not('rating','is',null)
        .order('created_at',{ascending:false})
        .limit(1000),
      supabase.from('game_play_events')
        .select('id',{count:'exact',head:true})
        .eq('game_slug',GAME_SLUG)
        .eq('event_type','rating_dismissed')
    ]);
    if(ratingResult.error)throw ratingResult.error;
    if(dismissResult.error)throw dismissResult.error;
    ratings=ratingResult.data||[];
    dismissedCount=dismissResult.count||0;
    render();
    status(`Loaded ${ratings.length} submitted rating${ratings.length===1?'':'s'} · ${when(new Date().toISOString())}`,'success');
  }catch(error){
    console.error('[lost-sizzler-ratings]',error);
    status(error?.message||'Unable to load Lost Sizzler ratings.','error');
  }
}
function bindUi(){
  $('#ls-ratings-refresh')?.addEventListener('click',loadRatings);
  $('#ls-ratings-star-filter')?.addEventListener('change',renderTable);
  $('#ls-ratings-device-filter')?.addEventListener('change',renderTable);
  $('#ls-ratings-search')?.addEventListener('input',renderTable);
}
async function init(){
  if(!await ensureRole(['admin','superadmin']))return;
  await initAdminNav({pageLabel:'Game Ratings',active:'ratings'});
  await startAccessMonitor();
  if(!window.ccgSupabase?.getClient)throw new Error('Supabase bootstrap unavailable.');
  supabase=await window.ccgSupabase.getClient();
  bindUi();
  await loadRatings();
}
init().catch(error=>{console.error('[lost-sizzler-ratings] init failed',error);status(error?.message||'Unable to initialise Lost Sizzler ratings.','error');});
