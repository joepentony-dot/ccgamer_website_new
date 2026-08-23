import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

const GAME_SLUG='the-lost-sizzler';
const ADMIN_FUNCTION='lost-sizzler-admin-feedback';
const $=selector=>document.querySelector(selector);
let supabase=null;
let reports=[];
let replies=[];

function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function when(value){
  if(!value)return'—';
  try{return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch(_){return String(value);}
}
function pageStatus(text,state='info'){
  const node=$('#ls-feedback-page-status');
  if(node){node.textContent=text;node.dataset.state=state;}
}
function inlineStatus(id,text,state='info'){
  const node=document.querySelector(`[data-inline-status="${id}"]`);
  if(node){node.textContent=text;node.dataset.state=state;}
}
function reportStatus(row){return ['open','replied','closed'].includes(row.feedback_status)?row.feedback_status:'open';}
function typeLabel(type){return String(type||'bug').toLowerCase()==='suggestion'?'GAME SUGGESTION':'BUG REPORT';}
function emailStatusLabel(value){
  const status=String(value||'unknown').toLowerCase();
  if(status==='sent')return'SENT';
  if(status==='failed')return'FAILED';
  return status.toUpperCase();
}
function renderSummary(){
  const holder=$('#ls-feedback-summary');if(!holder)return;
  const counts={all:reports.length,open:0,replied:0,closed:0,bug:0,suggestion:0};
  for(const row of reports){counts[reportStatus(row)]++;counts[String(row.feedback_type||'bug').toLowerCase()==='suggestion'?'suggestion':'bug']++;}
  const cards=[['ALL REPORTS',counts.all],['OPEN',counts.open],['REPLIED',counts.replied],['CLOSED',counts.closed],['BUGS',counts.bug],['SUGGESTIONS',counts.suggestion]];
  holder.innerHTML=cards.map(([label,value])=>`<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join('');
}
function replyRows(feedbackId){return replies.filter(row=>Number(row.feedback_id)===Number(feedbackId));}
function visibleReports(){
  const status=$('#ls-feedback-status-filter')?.value||'all';
  const type=$('#ls-feedback-type-filter')?.value||'all';
  const search=String($('#ls-feedback-search')?.value||'').trim().toLowerCase();
  return reports.filter(row=>{
    if(status!=='all'&&reportStatus(row)!==status)return false;
    const rowType=String(row.feedback_type||'bug').toLowerCase()==='suggestion'?'suggestion':'bug';
    if(type!=='all'&&rowType!==type)return false;
    if(search){
      const haystack=[row.message,row.contact_email,row.build,row.page_url,row.id].map(value=>String(value??'').toLowerCase()).join(' ');
      if(!haystack.includes(search))return false;
    }
    return true;
  });
}
function renderReplyHistory(row){
  const history=replyRows(row.id);
  if(!history.length)return'<p class="ls-feedback-muted">No replies sent yet.</p>';
  return history.map(reply=>`<article class="ls-feedback-reply-entry">
    <p>${esc(reply.reply_text)}</p>
    <small>${esc(when(reply.created_at))} · Email ${esc(emailStatusLabel(reply.email_status))}${reply.email_error?` · ${esc(reply.email_error)}`:''}</small>
  </article>`).join('');
}
function renderCard(row){
  const status=reportStatus(row);
  const type=String(row.feedback_type||'bug').toLowerCase()==='suggestion'?'suggestion':'bug';
  const hasEmail=Boolean(String(row.contact_email||'').trim());
  return `<article class="ls-feedback-card" data-status="${esc(status)}" data-feedback-id="${esc(row.id)}">
    <header class="ls-feedback-card-head">
      <div class="ls-feedback-card-title">
        <strong>#${esc(row.id)}</strong>
        <span class="ls-feedback-badge ls-feedback-badge--${esc(type)}">${esc(typeLabel(type))}</span>
        <span class="ls-feedback-badge ls-feedback-status-badge">${esc(status.toUpperCase())}</span>
      </div>
      <div class="ls-feedback-card-meta">Submitted ${esc(when(row.created_at))}<br>${row.last_replied_at?`Last replied ${esc(when(row.last_replied_at))}`:'No admin reply yet'}</div>
    </header>
    <div class="ls-feedback-card-body">
      <section>
        <p class="ls-feedback-message">${esc(row.message)}</p>
        <div class="ls-feedback-details">
          <span><strong>Contact:</strong> ${hasEmail?`<a href="mailto:${esc(row.contact_email)}">${esc(row.contact_email)}</a>`:'No email supplied'}</span>
          <span><strong>Build:</strong> ${esc(row.build||'Unknown')}</span>
          <span><strong>Original report email:</strong> ${esc(emailStatusLabel(row.email_status))}</span>
          ${row.email_error?`<span><strong>Original email error:</strong> ${esc(row.email_error)}</span>`:''}
          ${row.page_url?`<span><strong>Page:</strong> ${esc(row.page_url)}</span>`:''}
        </div>
      </section>
      <aside class="ls-feedback-side">
        <div class="ls-feedback-controls">
          <select data-status-select="${esc(row.id)}" aria-label="Status for feedback ${esc(row.id)}">
            <option value="open"${status==='open'?' selected':''}>Open</option>
            <option value="replied"${status==='replied'?' selected':''}>Replied</option>
            <option value="closed"${status==='closed'?' selected':''}>Closed</option>
          </select>
          <button type="button" class="ccg-btn ccg-btn--ghost" data-action="save-status" data-feedback-id="${esc(row.id)}">Save Status</button>
        </div>
        <section class="ls-feedback-history"><h3>REPLY HISTORY</h3>${renderReplyHistory(row)}</section>
        ${hasEmail?`<form class="ls-feedback-reply-form" data-reply-form="${esc(row.id)}">
          <label>Reply to ${esc(row.contact_email)}
            <textarea maxlength="4000" minlength="2" required data-reply-text="${esc(row.id)}" placeholder="Type your reply to this player…"></textarea>
          </label>
          <div class="ls-feedback-reply-actions">
            <button type="submit" class="ccg-btn ccg-btn--primary">Send Reply Email</button>
            <span class="ls-feedback-inline-status" data-inline-status="${esc(row.id)}">Reply will be stored in this report.</span>
          </div>
        </form>`:`<div class="ls-feedback-no-email">This player did not provide an email address, so an email reply cannot be sent. You can still update the report status.</div>`}
      </aside>
    </div>
  </article>`;
}
function renderReports(){
  renderSummary();
  const holder=$('#ls-feedback-list');if(!holder)return;
  const rows=visibleReports();
  if(!rows.length){holder.innerHTML='<p class="ls-feedback-muted">No reports match the current filters.</p>';return;}
  holder.innerHTML=rows.map(renderCard).join('');
}
async function invokeAdmin(body){
  const{data:sessionData,error:sessionError}=await supabase.auth.getSession();
  if(sessionError)throw sessionError;
  const token=sessionData?.session?.access_token;
  if(!token)throw new Error('Your admin session has expired. Please sign in again.');
  const{data,error}=await supabase.functions.invoke(ADMIN_FUNCTION,{body,headers:{Authorization:`Bearer ${token}`}});
  if(error){
    const detail=error?.context?.body?.error||error?.message||'Admin feedback action failed.';
    throw new Error(detail);
  }
  if(!data?.success)throw new Error(data?.error||'Admin feedback action failed.');
  return data;
}
async function loadReports(){
  pageStatus('Refreshing Lost Sizzler bug reports and suggestions…');
  const reportResult=await supabase.from('game_feedback')
    .select('id,feedback_type,message,contact_email,page_url,build,created_at,email_status,email_error,feedback_status,last_replied_at')
    .eq('game_slug',GAME_SLUG)
    .order('created_at',{ascending:false})
    .limit(500);
  if(reportResult.error)throw reportResult.error;
  reports=reportResult.data||[];
  const ids=reports.map(row=>row.id);
  replies=[];
  if(ids.length){
    const replyResult=await supabase.from('game_feedback_replies')
      .select('id,feedback_id,reply_text,recipient_email,email_status,email_error,created_at')
      .in('feedback_id',ids)
      .order('created_at',{ascending:true});
    if(replyResult.error)throw replyResult.error;
    replies=replyResult.data||[];
  }
  renderReports();
  pageStatus(`Loaded ${reports.length} report${reports.length===1?'':'s'} · ${when(new Date().toISOString())}`,'success');
}
async function saveStatus(button){
  const id=Number(button.dataset.feedbackId);if(!id)return;
  const select=document.querySelector(`[data-status-select="${id}"]`);if(!select)return;
  const oldText=button.textContent;button.disabled=true;button.textContent='Saving…';
  try{
    await invokeAdmin({action:'set_status',feedback_id:id,status:select.value});
    const row=reports.find(item=>Number(item.id)===id);if(row)row.feedback_status=select.value;
    renderReports();
    pageStatus(`Report #${id} marked ${select.value}.`,'success');
  }catch(error){
    console.error('[lost-sizzler-feedback] status update failed',error);
    pageStatus(error?.message||'Unable to update report status.','error');
  }finally{
    const current=document.querySelector(`[data-action="save-status"][data-feedback-id="${id}"]`);
    if(current){current.disabled=false;current.textContent=oldText;}
  }
}
async function sendReply(form){
  const id=Number(form.dataset.replyForm);if(!id)return;
  const textarea=form.querySelector(`[data-reply-text="${id}"]`);
  const replyText=String(textarea?.value||'').trim();
  if(replyText.length<2)return inlineStatus(id,'Type a reply before sending.','error');
  const button=form.querySelector('button[type="submit"]');
  const oldText=button?.textContent||'Send Reply Email';
  if(button){button.disabled=true;button.textContent='Sending…';}
  inlineStatus(id,'Sending reply email…');
  try{
    await invokeAdmin({action:'reply',feedback_id:id,reply_text:replyText});
    inlineStatus(id,'Reply sent and recorded.','success');
    await loadReports();
    pageStatus(`Reply sent for report #${id}.`,'success');
  }catch(error){
    console.error('[lost-sizzler-feedback] reply failed',error);
    inlineStatus(id,error?.message||'Reply could not be sent.','error');
    pageStatus(error?.message||'Reply could not be sent.','error');
  }finally{
    const current=document.querySelector(`[data-reply-form="${id}"] button[type="submit"]`);
    if(current){current.disabled=false;current.textContent=oldText;}
  }
}
function bindUi(){
  $('#ls-feedback-refresh')?.addEventListener('click',()=>loadReports().catch(handleLoadError));
  $('#ls-feedback-status-filter')?.addEventListener('change',renderReports);
  $('#ls-feedback-type-filter')?.addEventListener('change',renderReports);
  $('#ls-feedback-search')?.addEventListener('input',renderReports);
  $('#ls-feedback-list')?.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action="save-status"]');
    if(button)saveStatus(button);
  });
  $('#ls-feedback-list')?.addEventListener('submit',event=>{
    const form=event.target.closest('form[data-reply-form]');
    if(!form)return;
    event.preventDefault();
    sendReply(form);
  });
}
function handleLoadError(error){
  console.error('[lost-sizzler-feedback] load failed',error);
  pageStatus(error?.message||'Unable to load Lost Sizzler feedback.','error');
}
async function init(){
  if(!await ensureRole(['admin','superadmin']))return;
  await initAdminNav({pageLabel:'Bug Reports',active:'feedback'});
  await startAccessMonitor();
  if(!window.ccgSupabase?.getClient)throw new Error('Supabase bootstrap unavailable.');
  supabase=await window.ccgSupabase.getClient();
  bindUi();
  await loadReports();
}
init().catch(handleLoadError);
