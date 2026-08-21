#!/usr/bin/env python3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

admin_html='''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="ccg-context" content="admin" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex,nofollow" />
  <title>CCG Admin | Commodore Quest Visual Manager</title>
  <link rel="icon" href="../favicon.ico" />
  <link href="../resources/css/ccg-master.css?v=admin-stable-20260207" rel="stylesheet" />
  <link href="../resources/css/ccg-mode.css?v=admin-stable-20260207" rel="stylesheet" />
  <link href="../resources/css/ccg-effects.css?v=admin-stable-20260207" rel="stylesheet" />
  <link href="./css/admin-auth.css?v=admin-stable-20260207" rel="stylesheet" />
  <link href="../resources/css/ccg-admin.css?v=admin-modern-20260810" rel="stylesheet" />
  <link href="./css/arcade-assets.css?v=arcade-production-20260821" rel="stylesheet" />
</head>
<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">
  <div aria-hidden="true" class="ccg-bg"><div class="ccg-bg-starfield"></div><div class="ccg-bg-grid"></div><div class="ccg-bg-crt-overlay"></div></div>
  <main class="arcade-admin-wrap omega-admin-shell" data-admin-shell>
    <header class="arcade-admin-header">
      <div><p class="admin-auth-kicker">CCG Arcade Development</p><h1>Commodore Quest Visual Manager</h1><p>Replace the nine scene backgrounds and, if wanted, game music or sound effects. Character animation, enemies, hazards, collectibles, power-ups, bosses and Alien Formation artwork are now bundled into the game so their animation and collision behaviour stay consistent.</p></div>
      <a class="ccg-btn ccg-btn--primary" href="/games/commodore-quest/" target="_blank" rel="noopener">Open Game</a>
    </header>
    <section class="arcade-admin-grid">
      <article class="arcade-panel">
        <h2>Upload / Replace Background or Audio</h2>
        <p class="arcade-muted">Backgrounds: PNG, JPG, WebP, GIF or SVG. Audio: MP3, OGG or WAV. A 1600×900 background is recommended for the canvas.</p>
        <form id="arcade-asset-form" class="arcade-form">
          <label>Asset slot<select id="arcade-slot" required></select></label>
          <label>File<input id="arcade-file" type="file" required /></label>
          <label>Notes <span class="arcade-muted">(optional)</span><input id="arcade-notes" type="text" maxlength="180" placeholder="e.g. Bedroom background v3" /></label>
          <label class="arcade-check"><input id="arcade-enabled" type="checkbox" checked /> Enable immediately</label>
          <div id="arcade-preview" class="arcade-preview" aria-live="polite"><span>Select a file to preview it.</span></div>
          <button class="ccg-btn ccg-btn--primary" type="submit" id="arcade-upload">Upload Asset</button>
          <p id="arcade-status" class="arcade-status" data-state="info">Waiting for admin session…</p>
        </form>
      </article>
      <article class="arcade-panel">
        <h2>Background workflow</h2>
        <ul class="arcade-help">
          <li><strong>Main background:</strong> use one finished 1600×900 scene image for each game section.</li>
          <li><strong>Animated scenery:</strong> GIF or WebP can be used if you want movement in a background.</li>
          <li><strong>Gameplay art is protected:</strong> the production Cheeky animation, Retsu, enemies, bosses, hazards, collectibles, power-ups and Alien Formation assets are versioned with the game.</li>
          <li><strong>Disable or delete a background:</strong> the bundled scene fallback is restored immediately on the next game load.</li>
          <li><strong>Supabase Storage:</strong> keeps your live background and audio overrides without exposing GitHub credentials.</li>
        </ul>
        <div class="arcade-callout"><strong>Why the change?</strong> Character and enemy art now has fixed frame maps, sizes and collision behaviour. Keeping those assets inside the game prevents a badly cropped sheet or incorrect upload settings from breaking gameplay.</div>
      </article>
    </section>
    <section class="arcade-panel arcade-library-panel"><div class="arcade-library-head"><div><h2>Current Background &amp; Audio Overrides</h2><p class="arcade-muted">Only supported live overrides are shown here. Older character or enemy override records are ignored by the game.</p></div><button type="button" class="ccg-btn ccg-btn--ghost" id="arcade-refresh">Refresh</button></div><div id="arcade-library" class="arcade-library" aria-live="polite"><p class="arcade-muted">Loading assets…</p></div></section>
  </main>
  <script src="/js/ccg-supabase-config.js?v=admin-stable-20260207" defer></script>
  <script src="/js/ccg-supabase-client.js?v=admin-stable-20260207" defer></script>
  <script src="/js/ccg-auth-ui.js?v=admin-stable-20260207" defer></script>
  <script type="module" src="/admin/js/arcade-assets.js?v=arcade-production-20260821"></script>
</body>
</html>
'''
(ROOT/'admin/arcade-assets.html').write_text(admin_html,encoding='utf-8')

admin_js=r'''import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';
const BUCKET='ccg-arcade-assets';
const SCENES=['bedroom','beads','budget','fighter','invaders','christmas','maze','amiga','guru'];
const LABELS={bedroom:'Bedroom',beads:'Electric Bead Run',budget:'Budget Rack',fighter:'36% Bout',invaders:'Alien Formation',christmas:'Christmas Morning',maze:'Dot-Maze',amiga:'Amiga Upgrade',guru:'Guru Meditation'};
const SLOT_GROUPS=[
 ['Main Backgrounds',SCENES.map(s=>['backgrounds',s,`${LABELS[s]} Background`])],
 ['Sound Effects',[['sfx','jump','Jump'],['sfx','pickup','Collect / Pickup'],['sfx','hit','Player / Enemy Hit'],['sfx','shot','Player / Boss Shot'],['sfx','bosswarn','Boss Warning'],['sfx','shield','Action Replay Shield'],['sfx','shieldlow','Shield Low Warning'],['sfx','unlock','Achievement Unlock'],['sfx','punch','Punch'],['sfx','kick','Kick']]],
 ['Music',[['music','title','Title Music'],['music','bedroom','Bedroom Music'],['music','bedroomBoss','Bedroom Boss Music'],['music','beads','Electric Bead Music'],['music','budget','Budget Rack Music'],['music','budgetBoss','Budget Boss Music'],['music','fighter','36% Bout Music'],['music','invaders','Alien Formation Music'],['music','christmas','Christmas Music'],['music','christmasBoss','Christmas Boss Music'],['music','maze','Dot-Maze Music'],['music','amiga','Amiga Music'],['music','amigaBoss','Amiga Boss Music'],['music','guru','Guru Music'],['music','guruBoss','Guru Boss Music']]]
];
const slotMap=new Map();for(const[,items]of SLOT_GROUPS)for(const[group,key,label]of items)slotMap.set(`${group}:${key}`,{group,key,label});
const $=s=>document.querySelector(s);let supabase=null;
function status(t,state='info'){const e=$('#arcade-status');if(e){e.textContent=t;e.dataset.state=state;}}
function safeName(n){return String(n||'asset').replace(/[^a-z0-9._-]+/gi,'-').replace(/-+/g,'-').slice(0,100);}
function isAudio(g){return g==='music'||g==='sfx';}
function valid(g,f){if(!f)return false;return isAudio(g)?/^audio\/(mpeg|ogg|wav|x-wav)$/i.test(f.type):/^image\/(png|jpeg|webp|gif|svg\+xml)$/i.test(f.type);}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function bytes(n){n=Number(n||0);return n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(1)} MB`;}
function slots(){const s=$('#arcade-slot');s.textContent='';for(const[label,items]of SLOT_GROUPS){const g=document.createElement('optgroup');g.label=label;for(const[a,b,c]of items){const o=document.createElement('option');o.value=`${a}:${b}`;o.textContent=c;g.appendChild(o);}s.appendChild(g);}slotUi();}
function slotUi(){const s=slotMap.get($('#arcade-slot').value);if(!s)return;$('#arcade-file').accept=isAudio(s.group)?'.mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav':'.png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml';}
function preview(){const f=$('#arcade-file').files?.[0],s=slotMap.get($('#arcade-slot').value),h=$('#arcade-preview');h.textContent='';if(!f||!s){h.textContent='Select a file to preview it.';return;}if(!valid(s.group,f)){h.textContent='This file type is not valid for the selected slot.';return;}const u=URL.createObjectURL(f),e=document.createElement(isAudio(s.group)?'audio':'img');if(isAudio(s.group))e.controls=true;else e.alt='Selected background preview';e.src=u;e.addEventListener(isAudio(s.group)?'loadeddata':'load',()=>URL.revokeObjectURL(u),{once:true});h.appendChild(e);}
async function client(){if(!window.ccgSupabase?.getClient)throw new Error('Supabase bootstrap unavailable.');return window.ccgSupabase.getClient();}
async function loadAssets(){const h=$('#arcade-library');h.innerHTML='<p class="arcade-muted">Loading backgrounds and audio…</p>';const{data,error}=await supabase.from('arcade_assets').select('*').in('asset_group',['backgrounds','music','sfx']).order('asset_group').order('asset_key');if(error){h.innerHTML=`<p class="arcade-status" data-state="error">${esc(error.message)}</p>`;return;}if(!data?.length){h.innerHTML='<p class="arcade-muted">No background or audio overrides uploaded yet. The game is using its bundled fallbacks.</p>';return;}h.textContent='';for(const r of data){const s=slotMap.get(`${r.asset_group}:${r.asset_key}`);if(!s)continue;const c=document.createElement('article');c.className='arcade-asset-card';const pv=isAudio(r.asset_group)?`<audio controls preload="none" src="${esc(r.public_url)}"></audio>`:`<img loading="lazy" src="${esc(r.public_url)}" alt="${esc(s.label)} preview">`;c.innerHTML=`<div class="arcade-asset-card__preview">${pv}</div><div class="arcade-asset-card__body"><div class="arcade-asset-card__title"><strong>${esc(s.label)}</strong><span class="arcade-pill ${r.enabled?'':'is-off'}">${r.enabled?'ACTIVE':'DISABLED'}</span></div><p class="arcade-asset-card__meta">${esc(r.mime_type||'unknown')} · ${bytes(r.size_bytes)}<br>${esc(r.file_path||'')}</p>${r.notes?`<p>${esc(r.notes)}</p>`:''}<div class="arcade-asset-card__actions"><button class="arcade-mini" data-action="toggle" data-group="${esc(r.asset_group)}" data-key="${esc(r.asset_key)}" data-enabled="${r.enabled?'1':'0'}">${r.enabled?'Disable':'Enable'}</button><button class="arcade-mini danger" data-action="delete" data-group="${esc(r.asset_group)}" data-key="${esc(r.asset_key)}" data-path="${esc(r.file_path)}">Delete</button></div></div>`;h.appendChild(c);}}
async function upload(ev){ev.preventDefault();const s=slotMap.get($('#arcade-slot').value),f=$('#arcade-file').files?.[0];if(!s||!f)return status('Choose a slot and file.','error');if(!valid(s.group,f))return status(isAudio(s.group)?'Audio slots accept MP3, OGG or WAV.':'Background slots accept PNG, JPG, WebP, GIF or SVG.','error');if(f.size>25*1024*1024)return status('Maximum upload size is 25 MB.','error');const b=$('#arcade-upload');b.disabled=true;try{const{data:old}=await supabase.from('arcade_assets').select('file_path').eq('asset_group',s.group).eq('asset_key',s.key).maybeSingle();const ext=(f.name.split('.').pop()||'bin').toLowerCase(),path=`${s.group}/${s.key}/${Date.now()}-${safeName(f.name.replace(/\.[^.]+$/,''))}.${ext}`;let x=await supabase.storage.from(BUCKET).upload(path,f,{cacheControl:'3600',upsert:false,contentType:f.type});if(x.error)throw x.error;const publicUrl=supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl;if(!publicUrl)throw new Error('Unable to resolve uploaded asset URL.');x=await supabase.from('arcade_assets').upsert({asset_group:s.group,asset_key:s.key,file_path:path,public_url:publicUrl,mime_type:f.type,size_bytes:f.size,enabled:$('#arcade-enabled').checked,notes:$('#arcade-notes').value.trim()||null,asset_meta:{},updated_at:new Date().toISOString()},{onConflict:'asset_group,asset_key'});if(x.error){await supabase.storage.from(BUCKET).remove([path]);throw x.error;}if(old?.file_path&&old.file_path!==path)await supabase.storage.from(BUCKET).remove([old.file_path]);status(`${s.label} updated. Reload the game to use it.`,'success');ev.target.reset();$('#arcade-enabled').checked=true;slots();preview();await loadAssets();}catch(e){console.error('[arcade-admin]',e);status(e?.message||'Upload failed.','error');}finally{b.disabled=false;}}
async function library(ev){const b=ev.target.closest('button[data-action]');if(!b)return;const g=b.dataset.group,k=b.dataset.key;if(!slotMap.has(`${g}:${k}`))return;if(b.dataset.action==='toggle'){const enabled=b.dataset.enabled!=='1',x=await supabase.from('arcade_assets').update({enabled,updated_at:new Date().toISOString()}).eq('asset_group',g).eq('asset_key',k);if(x.error)status(x.error.message,'error');else{status(`${g}:${k} ${enabled?'enabled':'disabled'}.`,'success');await loadAssets();}}else if(b.dataset.action==='delete'){if(!confirm(`Delete the custom asset for ${g}:${k}?`))return;const path=b.dataset.path;if(path)await supabase.storage.from(BUCKET).remove([path]);const x=await supabase.from('arcade_assets').delete().eq('asset_group',g).eq('asset_key',k);if(x.error)status(x.error.message,'error');else{status(`${g}:${k} removed.`,'success');await loadAssets();}}}
async function init(){if(!await ensureRole(['admin','superadmin']))return;await initAdminNav({pageLabel:'Arcade Asset Manager',active:'arcade'});await startAccessMonitor();supabase=await client();slots();$('#arcade-slot').addEventListener('change',()=>{slotUi();preview();});$('#arcade-file').addEventListener('change',preview);$('#arcade-asset-form').addEventListener('submit',upload);$('#arcade-library').addEventListener('click',library);$('#arcade-refresh').addEventListener('click',loadAssets);status('Admin access confirmed. Ready to upload.','success');await loadAssets();}
init().catch(e=>{console.error('[arcade-admin] init failed',e);status(e?.message||'Unable to initialise Arcade Asset Manager.','error');});
'''
(ROOT/'admin/js/arcade-assets.js').write_text(admin_js,encoding='utf-8')

# Mobile landscape prompt in both launcher and public route.
prompt='''    <div class="rotate-prompt" role="status" aria-live="polite">\n      <div class="rotate-prompt__card">\n        <div class="rotate-prompt__phone" aria-hidden="true">▯ ↻</div>\n        <strong>ROTATE YOUR PHONE</strong>\n        <span>Cheeky’s Commodore Quest is designed for landscape play.</span>\n        <small>Turn your phone sideways for the largest playing area and touch controls.</small>\n      </div>\n    </div>\n'''
for rel in ['arcade/quest/index.html','games/commodore-quest/index.html']:
    p=ROOT/rel;s=p.read_text(encoding='utf-8')
    if 'class="rotate-prompt"' not in s:s=s.replace('    <div id="loading" class="loading">LOADING COMMODORE QUEST…</div>\n','    <div id="loading" class="loading">LOADING COMMODORE QUEST…</div>\n'+prompt)
    p.write_text(s,encoding='utf-8')
css=ROOT/'arcade/quest/styles.css';s=css.read_text(encoding='utf-8')
if '.rotate-prompt {' not in s:
    s+='''\n.rotate-prompt{display:none}.rotate-prompt__card{width:min(88vw,430px);padding:28px 24px;border:1px solid rgba(110,223,255,.45);border-radius:20px;background:rgba(5,4,11,.96);box-shadow:0 0 70px rgba(58,166,255,.18);text-align:center}.rotate-prompt__phone{margin:0 auto 14px;color:#7ee8ff;font:900 48px/1 Consolas,"Courier New",monospace}.rotate-prompt strong{display:block;color:#ffe66c;font:900 24px/1.1 Consolas,"Courier New",monospace}.rotate-prompt span{display:block;margin-top:12px;color:#fff;font:800 15px/1.4 Consolas,"Courier New",monospace}.rotate-prompt small{display:block;margin-top:10px;color:#aeb8cf;font:700 12px/1.45 Consolas,"Courier New",monospace}@media (pointer:coarse) and (orientation:portrait) and (max-width:900px){.rotate-prompt{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:max(18px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left));background:radial-gradient(circle at 50% 35%,rgba(22,18,45,.98) 0,rgba(5,4,11,.995) 70%)}.touch,.corner-controls{visibility:hidden}}@media (pointer:coarse) and (orientation:landscape){#game{width:min(100vw,calc(100dvh * 16 / 9));height:min(100dvh,calc(100vw * 9 / 16))}.touch{display:flex;left:max(6px,env(safe-area-inset-left));right:max(6px,env(safe-area-inset-right));bottom:max(5px,env(safe-area-inset-bottom))}.touch button{width:58px;height:48px;border-radius:12px;background:rgba(6,6,18,.60);font-size:10px}.touch button[data-touch="fire"]{width:84px}.touch button[data-touch="kick"]{width:64px}.corner-controls{top:max(4px,env(safe-area-inset-top));right:max(5px,env(safe-area-inset-right));opacity:.16}}\n'''
css.write_text(s,encoding='utf-8')

spec='''# Cheeky's Commodore Quest — Final Production Rebuild Spec\n\n## Production asset policy\nGameplay artwork is versioned with the game. Admin live overrides are limited to the nine main backgrounds, music and sound effects. Old sprite, boss, hazard, collectible, power-up and Alien Formation override records are ignored.\n\n## Cheeky main animation\n`assets/production/player/cheeky-main-sheet.png` is 1024×1280, 4×4, with 256×320 cells. States: idle, four-frame run, jump takeoff, rise, apex, fall, landing, duck, fire, duck-fire, hit and victory. The sprite follows the player's real Y position.\n\n## Fighting stage\nCheeky uses a separate 992×632 fighting sheet with 248×316 cells and renders about 302px tall. Retsu uses `fighter/retsu-sheet.png`, the same grid, and renders about 300px tall. Fighter collision boxes are aligned to the taller characters.\n\n## 8-bit enemies\n`enemies/8bit-enemy-sheet.png` is 512×256, 4×2, 128×128 cells. Frames 0–3 are normal running; 4–7 are low/crouched movement.\n\n## Collectibles deliberately use inviting positive presentation\nCassette, floppy, Zzap!64 and joystick use natural proportions, gentle bob/rotation, green glow, green particles and positive pickup text.\n\n## Hazards use a threatening red presentation\nEach stage hazard is red/black, pulses and tilts, and retains the incoming warning treatment so danger cannot be confused with a collectible.\n\n## Power-ups\nShield, speed and double-fire pulse with bright positive glow and explicit collection text.\n\n## Bosses\nFive 1024×448 boss sheets use 256×224 cells with idle, charge, hit and defeat animation states. Boss impacts have hit feedback and a short BOSS DOWN sequence.\n\n## Alien Formation\nFive front-facing alien designs, player ship, bunker and both shots are built in. Runtime bob/squash keeps the formation animated. Established balance remains base speed 72, late-wave +145 and straight-down enemy bullets at `vx=0`.\n\n## Collision feedback\nPlayer hits show a hit animation, knockback, particles and damage text. Enemy kills show impact particles/SMASH feedback. Fighter and boss collisions use matching hit frames.\n\n## Gameplay rules preserved\nElectric Beads stays 28 seconds, gravity 2350, speed 360–455. Alien player fire stays single-press at 0.34 seconds. Dot-Maze target remains 110. Existing boss HP/attack profiles remain unchanged.\n\n## Mobile / landscape play\nPhones in portrait show a rotate-device prompt. In landscape the 1600×900 canvas expands to the largest 16:9 area that fits `100dvh`, respects safe-area insets, and keeps compact touch controls at the edges. Desktop/tablet behaviour is unchanged.\n'''
(ROOT/'arcade/quest/FINAL-GAME-REBUILD-SPEC.md').write_text(spec,encoding='utf-8')

validator=r'''#!/usr/bin/env node
'use strict';const fs=require('fs'),path=require('path'),ROOT=path.resolve(__dirname,'..'),errors=[];
const read=r=>{const p=path.join(ROOT,r);if(!fs.existsSync(p)){errors.push(`Missing ${r}`);return'';}return fs.readFileSync(p,'utf8');};
const has=(r,s,n=s)=>{const t=read(r);if(!t.includes(s))errors.push(`${r} missing ${n}`);};
const not=(r,s,n=s)=>{const t=read(r);if(t.includes(s))errors.push(`${r} still contains ${n}`);};
function png(r,w,h){const b=fs.readFileSync(path.join(ROOT,r));if(b.readUInt32BE(16)!==w||b.readUInt32BE(20)!==h)errors.push(`${r} wrong size`);}
const main='arcade/quest/game/main-v2.js',config='arcade/quest/game/assets-config.js';
has(config,"const A='assets/production'");has(config,'playerFight:');has(config,'retsu-sheet.png');has(config,'alien-row-5.png');has(config,'frameWidth:256,frameHeight:320,columns:4,fps:10');has(config,'drawWidth:238,drawHeight:302');has(config,'drawWidth:230,drawHeight:300');
has('arcade/quest/game/remote-assets.js',"REMOTE_GROUPS=new Set(['backgrounds','music','sfx'])");has('arcade/quest/game/remote-assets.js','REMOTE_GROUPS.has(group)');
has('admin/js/arcade-assets.js',"['Main Backgrounds'");has('admin/js/arcade-assets.js',".in('asset_group',['backgrounds','music','sfx'])");not('admin/js/arcade-assets.js','Tier-Tex Animation Sheet');not('admin/js/arcade-assets.js','Alien Formation Sprites');has('admin/arcade-assets.html','Gameplay art is protected');not('admin/arcade-assets.html','Sprite sheet settings');
has(main,'jumpAge:0,landTimer:0');has(main,"return'jumpTakeoff'");has(main,"return'jumpRise'");has(main,"return'jumpApex'");has(main,"return'land'");has(main,"sheetKey=S.mode==='fighter'?'playerFight':'player'");has(main,'gy=P.y+P.h,y=gy-h');has(main,'dims={tape:[78,48],disk:[58,58],zzap:[50,66],joystick:[60,64]}');has(main,'spin:rand(-2.35,2.35)');has(main,'TAPE GET!');has(main,"shadowColor='#ff354f'");has(main,"float('BOSS DOWN!'");has(main,"float('RETSU DOWN!'");has(main,'y:gy-270,w:108,h:260');has(main,"text('RETSU'");not(main,'TIER-TEX');has(main,'pulse=1+Math.sin(a.phase)*.045');has(main,'dir:1,speed:72,aliens');has(main,'spd=g.speed+ratio*145');has(main,'vy=270+ratio*125,vx=0');has(main,"g.fire=.34");has(main,'updatePlayer(dt,true,2350)');has(main,'speed=rand(360,455)');has(main,'28 SECONDS');has(main,'target:110');
has('arcade/quest/index.html','class="rotate-prompt"');has('games/commodore-quest/index.html','class="rotate-prompt"');has('arcade/quest/styles.css','(orientation:portrait)');has('arcade/quest/styles.css','(orientation:landscape)');has('arcade/quest/styles.css','100dvh');
png('arcade/quest/assets/production/player/cheeky-main-sheet.png',1024,1280);png('arcade/quest/assets/production/player/cheeky-fight-sheet.png',992,632);png('arcade/quest/assets/production/fighter/retsu-sheet.png',992,632);png('arcade/quest/assets/production/enemies/8bit-enemy-sheet.png',512,256);for(const b of ['bedroom','budget','christmas','amiga','guru'])png(`arcade/quest/assets/production/bosses/${b}-sheet.png`,1024,448);
for(const r of ['player/cheeky-head.png','player/cheeky-body.png','player/cheeky-arm.png','player/cheeky-leg.png','player/cheeky-mascot.png','collectibles/tape.png','collectibles/disk.png','collectibles/zzap.png','collectibles/joystick.png','powers/shield.png','powers/speed.png','powers/double.png','hazards/bedroom.png','hazards/budget.png','hazards/christmas.png','hazards/amiga.png','hazards/guru.png','invaders/alien-row-1.png','invaders/alien-row-2.png','invaders/alien-row-3.png','invaders/alien-row-4.png','invaders/alien-row-5.png','invaders/player-ship.png','invaders/bunker.png','invaders/enemy-shot.png','invaders/player-shot.png'])if(!fs.existsSync(path.join(ROOT,'arcade/quest/assets/production',r)))errors.push(`Missing production asset ${r}`);
if(errors.length){console.error('Arcade Quest production validation failed:');errors.forEach(e=>console.error('- '+e));process.exit(1);}console.log('Arcade Quest production rebuild validation passed.');
'''
(ROOT/'scripts/validate-arcade-quest.js').write_text(validator,encoding='utf-8')
print('Patched Arcade admin, mobile landscape support, spec and validation')
