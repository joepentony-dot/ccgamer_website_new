import {ensureRole,startAccessMonitor} from './guard.js';
import {initAdminNav} from './admin-nav.js';

const BUCKET='ccg-arcade-assets';
const MAX_FILE_BYTES=25*1024*1024;
const CUE_GROUPS=[
  ['Core Gameplay',[
    ['welcome','Welcome','Welcome to The Lost Sizzler. Good luck down there.'],
    ['hurt','Player Hurt','Ow!'],
    ['lowHealth','Low Health','Low health.'],
    ['noAmmo','Low Ammo','Ammo low.'],
    ['secret','Secret Found','Secret found.'],
    ['objectiveHint','Objective Hint','You have been wandering for a while. Check your radar.'],
    ['objectiveNear','Objective Nearby','Objective nearby.'],
    ['floorClear','Floor Clear','Floor cleared.'],
    ['gameOver','Game Over','Run over.'],
    ['playerDeath','Player Death','Ouch. That looked expensive.'],
    ['respawn','Respawn','Back on your feet.'],
    ['rareLoot','Rare Loot','Rare loot!'],
    ['levelUp','Level Up','Level up.'],
    ['shop','Shop Found','Shop discovered.'],
    ['sanctuary','Sanctuary','Sanctuary.'],
    ['trap','Trap Warning','Trap!'],
    ['boulder','Boulder Warning','Boulder! Run!']
  ]],
  ['Enemies & Special Encounters',[
    ['deathStalker','Death Stalker','Death Stalker nearby. Keep moving.'],
    ['loadula','Count Loadula','Count Loadula!'],
    ['namedEnemy','Named Enemy','Named enemy ahead.'],
    ['gildedElf','Gilded Elf Appears','Gilded Elf! Catch him!'],
    ['gildedFive','Gilded Elf — Five Seconds','Five seconds!'],
    ['gildedCaught','Gilded Elf Caught','Jackpot!'],
    ['gildedEscaped','Gilded Elf Escaped','Too slow!']
  ]],
  ['Rare Dungeon Events',[
    ['mimic','Mimic Chest','Mimic! That chest has teeth!'],
    ['cursed','Cursed Cartridge','Cursed cartridge acquired.'],
    ['curseCleared','Curse Cleared','Curse cleansed.'],
    ['merchant','Wandering Merchant','Wandering merchant nearby.'],
    ['merchantGone','Merchant Gone','The wandering merchant has moved on.'],
    ['goldenRoom','Golden Room','Golden Room! Survive the rush!'],
    ['goldenClear','Golden Room Cleared','Golden Room cleared. Collect your reward.'],
    ['adventurer','Lost Adventurer','Lost adventurer found.'],
    ['adventurerSaved','Adventurer Rescued','Adventurer rescued.'],
    ['tremor','Dungeon Tremor','Dungeon tremor!'],
    ['cabinet','Arcade Challenge','Arcade challenge! Eight kills. No damage.'],
    ['cabinetWin','Arcade Challenge Won','Arcade challenge complete!'],
    ['cabinetFail','Arcade Challenge Failed','Arcade challenge failed.'],
    ['treasureBat','Treasure Bat','Treasure bat! Shoot it down!'],
    ['treasureBatGone','Treasure Bat Escaped','Treasure bat escaped.'],
    ['treasureBatDown','Treasure Bat Down','Treasure bat down. Prize dropped.'],
    ['taxman','The Taxman','The Taxman!'],
    ['taxmanCaught','Taxman Caught','Taxman caught. Refund time.'],
    ['mysteryPotion','Mystery Potion','Mystery potion. Brave choice.'],
    ['developerRoom','Developer Room','Secret developer room found.'],
    ['bounty','Dungeon Bounty','New dungeon bounty.'],
    ['bountyComplete','Bounty Complete','Bounty complete!'],
    ['treasureMap','Treasure Map','Treasure map found. Check the radar.'],
    ['buriedCache','Buried Cache','Buried cache found.'],
    ['mutation','Floor Mutation','Floor mutation active.']
  ]],
  ['Weekly Vault',[
    ['weeklyWelcome','Weekly Welcome','Weekly High Score Vault. One attempt. Make it count.'],
    ['weeklyGhost','Weekly Ghost','Weekly ghost detected.'],
    ['weeklyDeath','Weekly Run Over','Weekly Vault run over. Your score is being recorded.'],
    ['weeklyReset','Weekly Reset','Weekly Dungeon reset. A new ranked attempt is available.']
  ]]
];

const cueMap=new Map();
for(const[group,items]of CUE_GROUPS)for(const[key,label,fallback]of items)cueMap.set(key,{key,label,fallback,group});
const $=selector=>document.querySelector(selector);
let supabase=null;
let rows=[];

function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function safeName(value){return String(value||'voice').replace(/[^a-z0-9._-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,96)||'voice';}
function extension(file){return String(file?.name||'').split('.').pop()?.toLowerCase()||'';}
function validAudio(file){const ext=extension(file);return Boolean(file)&&(['mp3','ogg','wav'].includes(ext)||/^audio\/(mpeg|mp3|ogg|wav|x-wav)$/i.test(file.type||''));}
function bytes(value){const n=Number(value||0);return n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(1)} MB`;}
function status(text,state='info'){const node=$('#voice-status');if(node){node.textContent=text;node.dataset.state=state;}}
function cueFromRow(row){const meta=String(row?.asset_meta?.voice_cue||'').trim();if(cueMap.has(meta))return meta;const match=String(row?.asset_key||'').match(/^lostSizzlerVoice--([A-Za-z0-9]+)--/);return match&&cueMap.has(match[1])?match[1]:'';}
function rowsForCue(cue){return rows.filter(row=>cueFromRow(row)===cue);}
function enabledRowsForCue(cue){return rowsForCue(cue).filter(row=>row.enabled&&row.public_url);}

function populateCueSelect(){
  const select=$('#voice-cue');select.textContent='';
  for(const[groupLabel,items]of CUE_GROUPS){
    const group=document.createElement('optgroup');group.label=groupLabel;
    for(const[key,label]of items){const option=document.createElement('option');option.value=key;option.textContent=label;group.appendChild(option)}
    select.appendChild(group);
  }
}

function previewFiles(){
  const holder=$('#voice-preview'),files=[...($('#voice-files')?.files||[])];holder.textContent='';
  if(!files.length){holder.textContent='Select recordings to preview them before upload.';return}
  const invalid=files.find(file=>!validAudio(file));
  if(invalid){holder.textContent=`${invalid.name} is not a supported MP3, OGG or WAV file.`;return}
  for(const file of files.slice(0,8)){
    const row=document.createElement('div');row.className='voice-preview-item';
    const name=document.createElement('b');name.textContent=file.name;
    const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';const url=URL.createObjectURL(file);audio.src=url;audio.addEventListener('loadedmetadata',()=>URL.revokeObjectURL(url),{once:true});
    row.append(name,audio);holder.appendChild(row);
  }
  if(files.length>8){const more=document.createElement('span');more.textContent=`Plus ${files.length-8} more recording${files.length-8===1?'':'s'}.`;holder.appendChild(more)}
}

async function getClient(){if(!window.ccgSupabase?.getClient)throw new Error('Supabase bootstrap unavailable.');return window.ccgSupabase.getClient();}

async function loadRows(){
  const holder=$('#voice-library');holder.innerHTML='<p class="arcade-muted">Loading voice overrides…</p>';
  const {data,error}=await supabase.from('arcade_assets').select('*').eq('asset_group','voice').order('asset_key');
  if(error){holder.innerHTML=`<p class="arcade-status" data-state="error">${esc(error.message)}</p>`;return}
  rows=(data||[]).filter(row=>cueFromRow(row));
  renderLibrary();
}

function renderLibrary(){
  const holder=$('#voice-library');holder.textContent='';
  const activeClips=rows.filter(row=>row.enabled&&row.public_url).length;
  const activeCues=[...cueMap.keys()].filter(cue=>enabledRowsForCue(cue).length).length;
  $('#voice-summary').textContent=`${activeCues} of ${cueMap.size} cues currently use custom recordings · ${activeClips} enabled clip${activeClips===1?'':'s'} · ${rows.length} stored total.`;

  for(const[groupLabel,items]of CUE_GROUPS){
    const group=document.createElement('section');group.className='voice-group';group.innerHTML=`<h3>${esc(groupLabel)}</h3>`;
    for(const[key,label,fallback]of items){
      const clips=rowsForCue(key),active=clips.filter(row=>row.enabled&&row.public_url);
      const card=document.createElement('article');card.className='voice-cue-card';card.dataset.cue=key;
      card.innerHTML=`<div class="voice-cue-head"><div><h4>${esc(label)}</h4><p>Default: “${esc(fallback)}”</p><span class="voice-cue-state ${active.length?'':'default'}">${active.length?`${active.length} CUSTOM CLIP${active.length===1?'':'S'} ACTIVE`:'DEFAULT BROWSER VOICE'}</span></div><div class="voice-cue-actions"><button type="button" class="arcade-mini" data-action="test" data-cue="${esc(key)}">Test Cue</button><button type="button" class="arcade-mini" data-action="upload-cue" data-cue="${esc(key)}">Add Recording</button><button type="button" class="arcade-mini" data-action="default" data-cue="${esc(key)}" ${active.length?'':'disabled'}>Use Default</button></div></div>`;
      const list=document.createElement('div');list.className='voice-clips';
      if(!clips.length){list.innerHTML='<p class="voice-empty">No custom recordings stored for this cue.</p>'}
      for(const clip of clips){
        const item=document.createElement('div');item.className=`voice-clip${clip.enabled?'':' is-disabled'}`;
        const original=clip.asset_meta?.original_name||clip.file_path?.split('/').pop()||clip.asset_key;
        item.innerHTML=`<div class="voice-clip-copy"><b>${esc(original)}</b><span>${bytes(clip.size_bytes)} · ${clip.enabled?'ACTIVE':'DISABLED'}${clip.notes?` · ${esc(clip.notes)}`:''}</span></div><audio controls preload="none" src="${esc(clip.public_url)}"></audio><div class="voice-clip-actions"><button type="button" class="arcade-mini" data-action="toggle" data-key="${esc(clip.asset_key)}" data-enabled="${clip.enabled?'1':'0'}">${clip.enabled?'Disable':'Enable'}</button><button type="button" class="arcade-mini danger" data-action="delete" data-key="${esc(clip.asset_key)}">Delete</button></div>`;
        list.appendChild(item);
      }
      card.appendChild(list);group.appendChild(card);
    }
    holder.appendChild(group);
  }
}

async function upload(event){
  event.preventDefault();
  const cue=$('#voice-cue').value,info=cueMap.get(cue),files=[...($('#voice-files').files||[])];
  if(!info||!files.length)return status('Choose a voice cue and at least one recording.','error');
  const invalid=files.find(file=>!validAudio(file));if(invalid)return status(`${invalid.name} is not a supported MP3, OGG or WAV file.`,'error');
  const oversized=files.find(file=>file.size>MAX_FILE_BYTES);if(oversized)return status(`${oversized.name} exceeds the 25 MB file limit.`,'error');
  const button=$('#voice-upload');button.disabled=true;let completed=0;
  try{
    for(const[index,file]of files.entries()){
      status(`Uploading ${index+1}/${files.length}: ${file.name}`);
      const stamp=Date.now(),stem=safeName(file.name.replace(/\.[^.]+$/,'')),ext=extension(file)||'mp3';
      const assetKey=`lostSizzlerVoice--${cue}--${stamp}-${index}-${stem.slice(0,30)}`;
      const path=`voice/${cue}/${stamp}-${index}-${safeName(file.name)}`;
      let result=await supabase.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
      if(result.error)throw result.error;
      const publicUrl=supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl;
      if(!publicUrl){await supabase.storage.from(BUCKET).remove([path]);throw new Error(`Could not resolve the uploaded URL for ${file.name}.`)}
      result=await supabase.from('arcade_assets').insert({asset_group:'voice',asset_key:assetKey,file_path:path,public_url:publicUrl,mime_type:file.type||`audio/${ext==='mp3'?'mpeg':ext}`,size_bytes:file.size,enabled:$('#voice-enabled').checked,notes:$('#voice-notes').value.trim()||null,asset_meta:{voice_cue:cue,voice_variant:true,original_name:file.name},updated_at:new Date().toISOString()});
      if(result.error){await supabase.storage.from(BUCKET).remove([path]);throw result.error}
      completed++;
    }
    status(`${completed} recording${completed===1?'':'s'} added to ${info.label}. Reload The Lost Sizzler to use the updated voice pack.`,'success');
    event.target.reset();$('#voice-enabled').checked=true;populateCueSelect();$('#voice-cue').value=cue;previewFiles();await loadRows();
  }catch(error){console.error('[lost-sizzler-voices]',error);status(`${completed?`${completed} recording${completed===1?' was':'s were'} uploaded before the error. `:''}${error?.message||'Voice upload failed.'}`,'error');await loadRows()}
  finally{button.disabled=false}
}

function speakFallback(cue){
  const info=cueMap.get(cue);if(!info)return;
  if(!('speechSynthesis'in window)||typeof SpeechSynthesisUtterance==='undefined')return status('This browser cannot test speech synthesis.','error');
  window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(info.fallback),voices=window.speechSynthesis.getVoices?.()||[];u.lang='en-GB';u.rate=.97;u.pitch=.92;u.volume=.92;u.voice=voices.find(v=>/^en-GB$/i.test(v.lang))||voices.find(v=>/^en-GB/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||null;window.speechSynthesis.speak(u);status(`Testing default browser voice for ${info.label}.`,'success');
}

function testCue(cue){
  const active=enabledRowsForCue(cue);if(!active.length)return speakFallback(cue);
  const clip=active[Math.floor(Math.random()*active.length)];try{const audio=new Audio(clip.public_url);audio.volume=.9;audio.play().catch(error=>status(error?.message||'Could not play this recording.','error'));status(`Testing custom ${cueMap.get(cue)?.label||cue} recording.`,'success')}catch(error){status(error?.message||'Could not play this recording.','error')}
}

async function actions(event){
  const button=event.target.closest('button[data-action]');if(!button)return;
  const action=button.dataset.action,cue=button.dataset.cue,key=button.dataset.key;
  if(action==='test')return testCue(cue);
  if(action==='upload-cue'){const select=$('#voice-cue');select.value=cue;$('#voice-files').click();select.scrollIntoView({behavior:'smooth',block:'center'});return}
  if(action==='default'){
    const targets=enabledRowsForCue(cue);if(!targets.length)return;
    button.disabled=true;const result=await supabase.from('arcade_assets').update({enabled:false,updated_at:new Date().toISOString()}).in('asset_key',targets.map(row=>row.asset_key)).eq('asset_group','voice');button.disabled=false;
    if(result.error)return status(result.error.message,'error');status(`${cueMap.get(cue)?.label||cue} returned to the default browser voice.`,'success');return loadRows();
  }
  const row=rows.find(item=>item.asset_key===key);if(!row)return;
  if(action==='toggle'){
    const enabled=!row.enabled;button.disabled=true;const result=await supabase.from('arcade_assets').update({enabled,updated_at:new Date().toISOString()}).eq('asset_group','voice').eq('asset_key',key);button.disabled=false;
    if(result.error)return status(result.error.message,'error');status(`${cueMap.get(cueFromRow(row))?.label||'Voice'} recording ${enabled?'enabled':'disabled'}.`,'success');return loadRows();
  }
  if(action==='delete'){
    if(!window.confirm(`Delete ${row.asset_meta?.original_name||'this voice recording'}?`))return;
    button.disabled=true;let storageError=null;if(row.file_path){const removed=await supabase.storage.from(BUCKET).remove([row.file_path]);storageError=removed.error}
    const result=await supabase.from('arcade_assets').delete().eq('asset_group','voice').eq('asset_key',key);button.disabled=false;
    if(result.error)return status(result.error.message,'error');status(storageError?'Voice entry deleted, but its stored file could not be removed.':'Voice recording deleted.','success');return loadRows();
  }
}

async function init(){
  if(!await ensureRole(['admin','superadmin']))return;
  await initAdminNav({pageLabel:'Lost Sizzler Voice Overrides',active:'voices'});
  await startAccessMonitor();supabase=await getClient();populateCueSelect();
  $('#voice-files').addEventListener('change',previewFiles);
  $('#voice-upload-form').addEventListener('submit',upload);
  $('#voice-library').addEventListener('click',actions);
  $('#voice-refresh').addEventListener('click',loadRows);
  await loadRows();status('Voice overrides ready.','success');
}

init().catch(error=>{console.error('[lost-sizzler-voices]',error);status(error?.message||'Voice admin failed to initialise.','error')});
