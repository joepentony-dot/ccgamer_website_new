import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

const BUCKET = 'ccg-arcade-assets';
const SLOT_GROUPS = [
  ['Backgrounds', [
    ['backgrounds', 'bedroom', 'Bedroom Background'],
    ['backgrounds', 'beads', 'Electric Bead Background'],
    ['backgrounds', 'budget', 'Budget Rack Background'],
    ['backgrounds', 'fighter', '36% Bout Background'],
    ['backgrounds', 'invaders', 'Alien Formation Background'],
    ['backgrounds', 'christmas', 'Christmas Background'],
    ['backgrounds', 'maze', 'Dot-Maze Background'],
    ['backgrounds', 'amiga', 'Amiga Background'],
    ['backgrounds', 'guru', 'Guru Background'],
  ]],
  ['Bosses', [
    ['bosses', 'bedroom', 'Load Error Boss'],
    ['bosses', 'budget', 'Full Price Boss'],
    ['bosses', 'christmas', "We're Leaving Now Boss"],
    ['bosses', 'amiga', 'Disk Read Error Boss'],
    ['bosses', 'guru', 'Guru Meditation Boss'],
  ]],
  ['Hazards', [
    ['hazards', 'bedroom', 'Load Error / Bedroom Hazard'],
    ['hazards', 'budget', 'Full Price / Budget Hazard'],
    ['hazards', 'christmas', "Gran's House / Christmas Hazard"],
    ['hazards', 'amiga', 'Disk Read Error / Amiga Hazard'],
    ['hazards', 'guru', 'Guru Fault Hazard'],
  ]],
  ['Collectibles', [
    ['collectibles', 'tape', 'Cassette Tape'],
    ['collectibles', 'disk', 'Floppy Disk'],
    ['collectibles', 'zzap', 'Zzap!64 Magazine'],
    ['collectibles', 'joystick', 'Joystick'],
  ]],
  ['Power-ups', [
    ['powers', 'shield', 'Action Replay Shield'],
    ['powers', 'speed', 'Competition Pro Speed'],
    ['powers', 'double', 'Double Fire / Score'],
  ]],
  ['Cheeky Player Rig', [
    ['player', 'head', 'Default Cheeky Head / Face'],
    ['player', 'body', 'Cheeky Torso / Shirt'],
    ['player', 'arm', 'Cheeky Arm Limb'],
    ['player', 'leg', 'Cheeky Leg Limb'],
    ['player', 'mascot', 'Legacy Full Mascot Source'],
  ]],
  ['36% Bout Opponent', [
    ['fighter', 'enemy', 'Tier-Tex Idle / Base Sprite'],
    ['fighter', 'enemyPunch', 'Tier-Tex Punch Sprite'],
    ['fighter', 'enemyKick', 'Tier-Tex Kick Sprite'],
    ['fighter', 'enemyHit', 'Tier-Tex Hit / Stagger Sprite'],
  ]],
  ['Alien Formation Sprites', [
    ['invaders', 'alien1', 'Alien Formation Row 1 Sprite'],
    ['invaders', 'alien2', 'Alien Formation Row 2 Sprite'],
    ['invaders', 'alien3', 'Alien Formation Row 3 Sprite'],
    ['invaders', 'alien4', 'Alien Formation Row 4 Sprite'],
    ['invaders', 'alien5', 'Alien Formation Row 5 Sprite'],
    ['invaders', 'ship', 'Alien Formation CCG Ship'],
    ['invaders', 'bunker', 'Alien Formation Bunker / Cover'],
    ['invaders', 'enemyShot', 'Alien Formation Enemy Shot'],
    ['invaders', 'playerShot', 'Alien Formation Player Shot'],
  ]],
  ['Music', [
    ['music', 'title', 'Title Music'],
    ['music', 'bedroom', 'Bedroom Music'],
    ['music', 'bedroomBoss', 'Bedroom Boss Music'],
    ['music', 'beads', 'Electric Bead Music'],
    ['music', 'budget', 'Budget Rack Music'],
    ['music', 'budgetBoss', 'Budget Boss Music'],
    ['music', 'fighter', '36% Bout Music'],
    ['music', 'invaders', 'Alien Formation Music'],
    ['music', 'christmas', 'Christmas Music'],
    ['music', 'christmasBoss', 'Christmas Boss Music'],
    ['music', 'maze', 'Dot-Maze Music'],
    ['music', 'amiga', 'Amiga Music'],
    ['music', 'amigaBoss', 'Amiga Boss Music'],
    ['music', 'guru', 'Guru Music'],
    ['music', 'guruBoss', 'Guru Boss Music'],
  ]],
];

const slotMap = new Map();
for (const [, items] of SLOT_GROUPS) {
  for (const [group, key, label] of items) slotMap.set(`${group}:${key}`, { group, key, label });
}

const $ = (selector) => document.querySelector(selector);
let supabase = null;

function setStatus(text, state = 'info') {
  const el = $('#arcade-status');
  el.textContent = text;
  el.dataset.state = state;
}

function safeName(name) {
  return String(name || 'asset')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

function isMusic(group) {
  return group === 'music';
}

function validFile(group, file) {
  if (!file) return false;
  if (isMusic(group)) return /^audio\/(mpeg|ogg|wav|x-wav)$/i.test(file.type);
  return /^image\/(png|jpeg|webp|svg\+xml)$/i.test(file.type);
}

function formatBytes(n) {
  const v = Number(n || 0);
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function buildSlots() {
  const select = $('#arcade-slot');
  select.textContent = '';
  for (const [label, items] of SLOT_GROUPS) {
    const group = document.createElement('optgroup');
    group.label = label;
    for (const [g, k, l] of items) {
      const option = document.createElement('option');
      option.value = `${g}:${k}`;
      option.textContent = l;
      group.appendChild(option);
    }
    select.appendChild(group);
  }
  updateAccept();
}

function updateAccept() {
  const slot = slotMap.get($('#arcade-slot').value);
  $('#arcade-file').accept = slot && isMusic(slot.group)
    ? '.mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav'
    : '.png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml';
}

function previewLocal() {
  const file = $('#arcade-file').files?.[0];
  const slot = slotMap.get($('#arcade-slot').value);
  const host = $('#arcade-preview');
  host.textContent = '';

  if (!file || !slot) {
    host.textContent = 'Select a file to preview it.';
    return;
  }

  if (!validFile(slot.group, file)) {
    host.textContent = 'This file type is not valid for the selected slot.';
    return;
  }

  const url = URL.createObjectURL(file);
  if (isMusic(slot.group)) {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = url;
    host.appendChild(audio);
  } else {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Selected asset preview';
    host.appendChild(img);
  }
}

async function getClient() {
  if (!window.ccgSupabase?.getClient) throw new Error('Supabase bootstrap unavailable.');
  return window.ccgSupabase.getClient();
}

async function loadAssets() {
  const host = $('#arcade-library');
  host.innerHTML = '<p class="arcade-muted">Loading assets…</p>';
  const { data, error } = await supabase.from('arcade_assets').select('*').order('asset_group').order('asset_key');

  if (error) {
    host.innerHTML = `<p class="arcade-status" data-state="error">${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data?.length) {
    host.innerHTML = '<p class="arcade-muted">No custom arcade assets uploaded yet. The game is using its GitHub fallbacks.</p>';
    return;
  }

  host.textContent = '';
  for (const row of data) {
    const slot = slotMap.get(`${row.asset_group}:${row.asset_key}`);
    const card = document.createElement('article');
    card.className = 'arcade-asset-card';
    const preview = isMusic(row.asset_group)
      ? `<audio controls preload="none" src="${escapeHtml(row.public_url)}"></audio>`
      : `<img loading="lazy" src="${escapeHtml(row.public_url)}" alt="${escapeHtml(slot?.label || row.asset_key)} preview">`;

    card.innerHTML = `
      <div class="arcade-asset-card__preview">${preview}</div>
      <div class="arcade-asset-card__body">
        <div class="arcade-asset-card__title">
          <strong>${escapeHtml(slot?.label || `${row.asset_group}:${row.asset_key}`)}</strong>
          <span class="arcade-pill ${row.enabled ? '' : 'is-off'}">${row.enabled ? 'ACTIVE' : 'DISABLED'}</span>
        </div>
        <p class="arcade-asset-card__meta">${escapeHtml(row.mime_type || 'unknown')} · ${formatBytes(row.size_bytes)}<br>${escapeHtml(row.file_path || '')}</p>
        ${row.notes ? `<p>${escapeHtml(row.notes)}</p>` : ''}
        <div class="arcade-asset-card__actions">
          <button class="arcade-mini" data-action="toggle" data-group="${escapeHtml(row.asset_group)}" data-key="${escapeHtml(row.asset_key)}" data-enabled="${row.enabled ? '1' : '0'}">${row.enabled ? 'Disable' : 'Enable'}</button>
          <button class="arcade-mini danger" data-action="delete" data-group="${escapeHtml(row.asset_group)}" data-key="${escapeHtml(row.asset_key)}" data-path="${escapeHtml(row.file_path)}">Delete</button>
        </div>
      </div>`;
    host.appendChild(card);
  }
}

async function uploadAsset(event) {
  event.preventDefault();
  const slot = slotMap.get($('#arcade-slot').value);
  const file = $('#arcade-file').files?.[0];

  if (!slot || !file) return setStatus('Choose a slot and file.', 'error');
  if (!validFile(slot.group, file)) {
    return setStatus(isMusic(slot.group)
      ? 'Music slots accept MP3, OGG or WAV.'
      : 'Graphic slots accept PNG, JPG, WebP or SVG.', 'error');
  }
  if (file.size > 25 * 1024 * 1024) return setStatus('Maximum upload size is 25 MB.', 'error');

  const btn = $('#arcade-upload');
  btn.disabled = true;
  setStatus(`Uploading ${file.name}…`);

  try {
    const { data: existing } = await supabase
      .from('arcade_assets')
      .select('file_path')
      .eq('asset_group', slot.group)
      .eq('asset_key', slot.key)
      .maybeSingle();

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const path = `${slot.group}/${slot.key}/${Date.now()}-${safeName(file.name.replace(/\.[^.]+$/, ''))}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type,
    });
    if (upErr) throw upErr;

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) throw new Error('Unable to resolve uploaded asset URL.');

    const record = {
      asset_group: slot.group,
      asset_key: slot.key,
      file_path: path,
      public_url: publicUrl,
      mime_type: file.type,
      size_bytes: file.size,
      enabled: $('#arcade-enabled').checked,
      notes: $('#arcade-notes').value.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error: dbErr } = await supabase.from('arcade_assets').upsert(record, { onConflict: 'asset_group,asset_key' });
    if (dbErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw dbErr;
    }

    if (existing?.file_path && existing.file_path !== path) {
      await supabase.storage.from(BUCKET).remove([existing.file_path]);
    }

    setStatus(`${slot.label} updated. Reload the game to use it.`, 'success');
    event.target.reset();
    $('#arcade-enabled').checked = true;
    buildSlots();
    previewLocal();
    await loadAssets();
  } catch (error) {
    console.error('[arcade-admin] upload failed', error);
    setStatus(error?.message || 'Upload failed.', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function handleLibraryClick(event) {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;

  const group = btn.dataset.group;
  const key = btn.dataset.key;

  if (btn.dataset.action === 'toggle') {
    const enabled = btn.dataset.enabled !== '1';
    const { error } = await supabase
      .from('arcade_assets')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('asset_group', group)
      .eq('asset_key', key);

    if (error) setStatus(error.message, 'error');
    else {
      setStatus(`${group}:${key} ${enabled ? 'enabled' : 'disabled'}.`, 'success');
      await loadAssets();
    }
  } else if (btn.dataset.action === 'delete') {
    if (!window.confirm(`Delete the custom asset for ${group}:${key}? The game will fall back to its GitHub asset.`)) return;
    const path = btn.dataset.path;
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    const { error } = await supabase.from('arcade_assets').delete().eq('asset_group', group).eq('asset_key', key);

    if (error) setStatus(error.message, 'error');
    else {
      setStatus(`${group}:${key} removed. GitHub fallback restored.`, 'success');
      await loadAssets();
    }
  }
}

async function init() {
  const access = await ensureRole(['admin', 'superadmin']);
  if (!access) return;

  await initAdminNav({ pageLabel: 'Arcade Asset Manager', active: 'arcade' });
  await startAccessMonitor();
  supabase = await getClient();

  buildSlots();
  $('#arcade-slot').addEventListener('change', () => {
    updateAccept();
    previewLocal();
  });
  $('#arcade-file').addEventListener('change', previewLocal);
  $('#arcade-asset-form').addEventListener('submit', uploadAsset);
  $('#arcade-library').addEventListener('click', handleLibraryClick);
  $('#arcade-refresh').addEventListener('click', loadAssets);

  setStatus('Admin access confirmed. Ready to upload.', 'success');
  await loadAssets();
}

init().catch((error) => {
  console.error('[arcade-admin] init failed', error);
  setStatus(error?.message || 'Unable to initialise Arcade Asset Manager.', 'error');
});
