import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

const BUCKET='ccg-arcade-assets';
const MAX_FILE_BYTES=25*1024*1024;
const SCENES=['bedroom','beads','budget','fighter','invaders','christmas','maze','amiga','guru'];
const LABELS={bedroom:'Bedroom',beads:'Electric Bead Run',budget:'Budget Rack',fighter:'36% Bout',invaders:'Alien Formation',christmas:'Christmas Morning',maze:'Dot-Maze',amiga:'Amiga Upgrade',guru:'Guru Meditation'};
const LOST_SIZZLER_MUSIC=[
  ['music','lostSizzlerAutoPlaylist','Lost Sizzler — Auto-categorise Music Batch',{playlist:true,auto:true}],
  ['music','lostSizzlerExploration','Lost Sizzler — General Exploration',{playlist:true}],
  ['music','lostSizzlerDanger','Lost Sizzler — Danger / Combat Rooms',{playlist:true}],
  ['music','lostSizzlerSanctuary','Lost Sizzler — Sanctuary / Safe Rooms',{playlist:true}],
  ['music','lostSizzlerNamed','Lost Sizzler — Named Enemy Encounter',{playlist:true}],
  ['music','lostSizzlerStalker','Lost Sizzler — Death Stalker / Count Loadula',{playlist:true}]
];
const SLOT_GROUPS=[
  ['Main Backgrounds',SCENES.map(s=>['backgrounds',s,`${LABELS[s]} Background`])],
  ['Lost Sizzler Music',LOST_SIZZLER_MUSIC],
  ['Sound Effects',[['sfx','jump','Jump'],['sfx','pickup','Collect / Pickup'],['sfx','hit','Player / Enemy Hit'],['sfx','shot','Player / Boss Shot'],['sfx','bosswarn','Boss Warning'],['sfx','shield','Action Replay Shield'],['sfx','shieldlow','Shield Low Warning'],['sfx','unlock','Achievement Unlock'],['sfx','punch','Punch'],['sfx','kick','Kick']]],
  ['Commodore Quest Scene Music',[['music','title','Title Music'],['music','bedroom','Bedroom Music'],['music','bedroomBoss','Bedroom Boss Music'],['music','beads','Electric Bead Music'],['music','budget','Budget Rack Music'],['music','budgetBoss','Budget Boss Music'],['music','fighter','36% Bout Music'],['music','invaders','Alien Formation Music'],['music','christmas','Christmas Music'],['music','christmasBoss','Christmas Boss Music'],['music','maze','Dot-Maze Music'],['music','amiga','Amiga Music'],['music','amigaBoss','Amiga Boss Music'],['music','guru','Guru Music'],['music','guruBoss','Guru Boss Music']]]
];
const slotMap=new Map();
for(const[,items]of SLOT_GROUPS){
  for(const[group,key,label,options={}]of items)slotMap.set(`${group}:${key}`,{group,key,label,...options});
}
const playlistSlots=LOST_SIZZLER_MUSIC.filter(([,key])=>key!=='lostSizzlerAutoPlaylist').map(([,key,label])=>({key,label}));
const $=selector=>document.querySelector(selector);
let supabase=null;

function status(text,state='info'){
  const element=$('#arcade-status');
  if(element){element.textContent=text;element.dataset.state=state;}
}
function safeName(name){return String(name||'asset').replace(/[^a-z0-9._-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,100)||'asset';}
function isAudio(group){return group==='music'||group==='sfx';}
function extension(file){return String(file?.name||'').split('.').pop()?.toLowerCase()||'';}
function valid(group,file){
  if(!file)return false;
  const ext=extension(file);
  if(isAudio(group))return ['mp3','ogg','wav'].includes(ext)||/^audio\/(mpeg|mp3|ogg|wav|x-wav)$/i.test(file.type||'');
  return ['png','jpg','jpeg','webp','gif','svg'].includes(ext)||/^image\/(png|jpeg|webp|gif|svg\+xml)$/i.test(file.type||'');
}
function esc(value){return String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));}
function bytes(value){const size=Number(value||0);return size<1024?`${size} B`:size<1048576?`${(size/1024).toFixed(1)} KB`:`${(size/1048576).toFixed(1)} MB`;}
function playlistSlotForKey(assetKey){
  const key=String(assetKey||'');
  return playlistSlots.find(slot=>key===slot.key||key.startsWith(`${slot.key}--`))||null;
}
function resolveSlot(group,key){
  return slotMap.get(`${group}:${key}`)||(group==='music'?playlistSlotForKey(key):null);
}
function inferPlaylistSlot(filename){
  const name=String(filename||'').toLowerCase();
  if(/exploration|general|wander|ambient/.test(name))return slotMap.get('music:lostSizzlerExploration');
  if(/combat|danger|battle|fight/.test(name))return slotMap.get('music:lostSizzlerDanger');
  if(/sanctuary|safe|rest|calm/.test(name))return slotMap.get('music:lostSizzlerSanctuary');
  if(/named|enemy|boss/.test(name))return slotMap.get('music:lostSizzlerNamed');
  if(/loadula|lodula|stalker|death/.test(name))return slotMap.get('music:lostSizzlerStalker');
  return null;
}
function selectedSlot(){return slotMap.get($('#arcade-slot')?.value);}
function slots(){
  const select=$('#arcade-slot');select.textContent='';
  for(const[label,items]of SLOT_GROUPS){
    const group=document.createElement('optgroup');group.label=label;
    for(const[assetGroup,key,itemLabel]of items){
      const option=document.createElement('option');option.value=`${assetGroup}:${key}`;option.textContent=itemLabel;group.appendChild(option);
    }
    select.appendChild(group);
  }
  slotUi();
}
function slotUi(){
  const slot=selectedSlot();if(!slot)return;
  const input=$('#arcade-file');
  input.accept=isAudio(slot.group)?'.mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav':'.png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
  input.multiple=Boolean(slot.playlist);
  $('#arcade-upload').textContent=slot.playlist?'Upload Music Tracks':'Upload Asset';
  const hint=$('#arcade-file-hint');
  if(hint)hint.textContent=slot.auto?'Select all prepared Lost Sizzler MP3s together. Filenames containing exploration, combat, sanctuary, named, loadula/lodula or stalker are categorised automatically.':slot.playlist?'You may select one or several tracks. Each file is added to this category without replacing existing music.':'Selecting a new file replaces the current asset in this slot.';
}
function preview(){
  const files=[...($('#arcade-file').files||[])],slot=selectedSlot(),holder=$('#arcade-preview');holder.textContent='';
  if(!files.length||!slot){holder.textContent='Select one or more files to preview them.';return;}
  const invalid=files.find(file=>!valid(slot.group,file));
  if(invalid){holder.textContent=`${invalid.name} is not valid for the selected slot.`;return;}
  const summary=document.createElement('p');summary.textContent=`${files.length} file${files.length===1?'':'s'} selected.`;holder.appendChild(summary);
  for(const file of files.slice(0,6)){
    const row=document.createElement('div');row.className='arcade-preview-item';
    const name=document.createElement('b');name.textContent=file.name;row.appendChild(name);
    const url=URL.createObjectURL(file),element=document.createElement(isAudio(slot.group)?'audio':'img');
    if(isAudio(slot.group))element.controls=true;else element.alt=`${file.name} preview`;
    element.src=url;element.addEventListener(isAudio(slot.group)?'loadeddata':'load',()=>URL.revokeObjectURL(url),{once:true});row.appendChild(element);holder.appendChild(row);
  }
  if(files.length>6){const more=document.createElement('p');more.textContent=`Plus ${files.length-6} more file${files.length-6===1?'':'s'}.`;holder.appendChild(more);}
}
async function client(){if(!window.ccgSupabase?.getClient)throw new Error('Supabase bootstrap unavailable.');return window.ccgSupabase.getClient();}
async function loadAssets(){
  const holder=$('#arcade-library');holder.innerHTML='<p class="arcade-muted">Loading backgrounds and audio…</p>';
  const{data,error}=await supabase.from('arcade_assets').select('*').in('asset_group',['backgrounds','music','sfx']).order('asset_group').order('asset_key');
  if(error){holder.innerHTML=`<p class="arcade-status" data-state="error">${esc(error.message)}</p>`;return;}
  const visible=(data||[]).filter(row=>resolveSlot(row.asset_group,row.asset_key));
  if(!visible.length){holder.innerHTML='<p class="arcade-muted">No background or audio overrides uploaded yet. The games are using their bundled fallbacks.</p>';return;}
  holder.textContent='';
  for(const row of visible){
    const slot=resolveSlot(row.asset_group,row.asset_key);if(!slot)continue;
    const card=document.createElement('article');card.className='arcade-asset-card';
    const previewHtml=isAudio(row.asset_group)?`<audio controls preload="none" src="${esc(row.public_url)}"></audio>`:`<img loading="lazy" src="${esc(row.public_url)}" alt="${esc(slot.label)} preview">`;
    const trackName=row.asset_meta?.original_name||row.file_path?.split('/').pop()||row.asset_key;
    card.innerHTML=`<div class="arcade-asset-card__preview">${previewHtml}</div><div class="arcade-asset-card__body"><div class="arcade-asset-card__title"><strong>${esc(slot.label)}</strong><span class="arcade-pill ${row.enabled?'':'is-off'}">${row.enabled?'ACTIVE':'DISABLED'}</span></div><p class="arcade-asset-card__meta"><b>${esc(trackName)}</b><br>${esc(row.mime_type||'unknown')} · ${bytes(row.size_bytes)}<br>${esc(row.file_path||'')}</p>${row.notes?`<p>${esc(row.notes)}</p>`:''}<div class="arcade-asset-card__actions"><button class="arcade-mini" data-action="toggle" data-group="${esc(row.asset_group)}" data-key="${esc(row.asset_key)}" data-enabled="${row.enabled?'1':'0'}">${row.enabled?'Disable':'Enable'}</button><button class="arcade-mini danger" data-action="delete" data-group="${esc(row.asset_group)}" data-key="${esc(row.asset_key)}" data-path="${esc(row.file_path)}">Delete</button></div></div>`;
    holder.appendChild(card);
  }
}
async function uploadPlaylistFile(slot,file,index){
  const stamp=Date.now(),stem=safeName(file.name.replace(/\.[^.]+$/,'')),ext=extension(file)||'mp3';
  const assetKey=`${slot.key}--${stamp}-${index}-${stem.slice(0,36)}`;
  const path=`music/${slot.key}/${stamp}-${index}-${safeName(file.name)}`;
  let result=await supabase.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
  if(result.error)throw result.error;
  const publicUrl=supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl;
  if(!publicUrl){await supabase.storage.from(BUCKET).remove([path]);throw new Error(`Unable to resolve uploaded URL for ${file.name}.`);}
  result=await supabase.from('arcade_assets').insert({asset_group:'music',asset_key:assetKey,file_path:path,public_url:publicUrl,mime_type:file.type||`audio/${ext==='mp3'?'mpeg':ext}`,size_bytes:file.size,enabled:$('#arcade-enabled').checked,notes:$('#arcade-notes').value.trim()||null,asset_meta:{playlist:true,playlist_category:slot.key,original_name:file.name},updated_at:new Date().toISOString()});
  if(result.error){await supabase.storage.from(BUCKET).remove([path]);throw result.error;}
}
async function replaceSingleAsset(slot,file){
  const{data:old}=await supabase.from('arcade_assets').select('file_path').eq('asset_group',slot.group).eq('asset_key',slot.key).maybeSingle();
  const ext=extension(file)||'bin',path=`${slot.group}/${slot.key}/${Date.now()}-${safeName(file.name.replace(/\.[^.]+$/,''))}.${ext}`;
  let result=await supabase.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
  if(result.error)throw result.error;
  const publicUrl=supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl;
  if(!publicUrl){await supabase.storage.from(BUCKET).remove([path]);throw new Error('Unable to resolve uploaded asset URL.');}
  result=await supabase.from('arcade_assets').upsert({asset_group:slot.group,asset_key:slot.key,file_path:path,public_url:publicUrl,mime_type:file.type,size_bytes:file.size,enabled:$('#arcade-enabled').checked,notes:$('#arcade-notes').value.trim()||null,asset_meta:{original_name:file.name},updated_at:new Date().toISOString()},{onConflict:'asset_group,asset_key'});
  if(result.error){await supabase.storage.from(BUCKET).remove([path]);throw result.error;}
  if(old?.file_path&&old.file_path!==path)await supabase.storage.from(BUCKET).remove([old.file_path]);
}
async function upload(event){
  event.preventDefault();
  const slot=selectedSlot(),files=[...($('#arcade-file').files||[])];
  if(!slot||!files.length)return status('Choose a slot and at least one file.','error');
  const invalid=files.find(file=>!valid(slot.group,file));
  if(invalid)return status(`${invalid.name} is not a supported ${isAudio(slot.group)?'audio':'image'} file.`,'error');
  const oversized=files.find(file=>file.size>MAX_FILE_BYTES);
  if(oversized)return status(`${oversized.name} exceeds the 25 MB per-file limit.`,'error');
  if(!slot.playlist&&files.length>1)return status('This slot accepts one replacement file at a time.','error');

  const button=$('#arcade-upload');button.disabled=true;
  let completed=0;
  try{
    if(slot.playlist){
      const assignments=files.map(file=>({file,slot:slot.auto?inferPlaylistSlot(file.name):slot}));
      const unknown=assignments.find(item=>!item.slot);
      if(unknown)throw new Error(`Could not categorise ${unknown.file.name}. Rename it to include exploration, combat, sanctuary, named, loadula/lodula or stalker, or upload it through a specific category.`);
      for(const[itemIndex,item]of assignments.entries()){
        status(`Uploading ${itemIndex+1}/${assignments.length}: ${item.file.name}`,'info');
        await uploadPlaylistFile(item.slot,item.file,itemIndex);completed++;
      }
      status(`${completed} Lost Sizzler music track${completed===1?'':'s'} added. Reload the game to use the updated playlists.`,'success');
    }else{
      await replaceSingleAsset(slot,files[0]);completed=1;
      status(`${slot.label} updated. Reload the relevant game to use it.`,'success');
    }
    event.target.reset();$('#arcade-enabled').checked=true;slots();preview();await loadAssets();
  }catch(error){
    console.error('[arcade-admin]',error);
    status(`${completed?`${completed} file${completed===1?' was':'s were'} uploaded before the error. `:''}${error?.message||'Upload failed.'}`,'error');
    await loadAssets();
  }finally{button.disabled=false;}
}
async function library(event){
  const button=event.target.closest('button[data-action]');if(!button)return;
  const group=button.dataset.group,key=button.dataset.key;
  if(!resolveSlot(group,key))return;
  if(button.dataset.action==='toggle'){
    const enabled=button.dataset.enabled!=='1',result=await supabase.from('arcade_assets').update({enabled,updated_at:new Date().toISOString()}).eq('asset_group',group).eq('asset_key',key);
    if(result.error)status(result.error.message,'error');else{status(`${key} ${enabled?'enabled':'disabled'}.`,'success');await loadAssets();}
  }else if(button.dataset.action==='delete'){
    if(!confirm(`Delete ${key}?`))return;
    const path=button.dataset.path;if(path)await supabase.storage.from(BUCKET).remove([path]);
    const result=await supabase.from('arcade_assets').delete().eq('asset_group',group).eq('asset_key',key);
    if(result.error)status(result.error.message,'error');else{status(`${key} removed.`,'success');await loadAssets();}
  }
}
async function init(){
  if(!await ensureRole(['admin','superadmin']))return;
  await initAdminNav({pageLabel:'Arcade Asset Manager',active:'arcade'});
  await startAccessMonitor();supabase=await client();slots();
  $('#arcade-slot').addEventListener('change',()=>{slotUi();preview();});
  $('#arcade-file').addEventListener('change',preview);
  $('#arcade-asset-form').addEventListener('submit',upload);
  $('#arcade-library').addEventListener('click',library);
  $('#arcade-refresh').addEventListener('click',loadAssets);
  status('Admin access confirmed. Ready to upload.','success');await loadAssets();
}
init().catch(error=>{console.error('[arcade-admin] init failed',error);status(error?.message||'Unable to initialise Arcade Asset Manager.','error');});
