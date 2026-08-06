import { ensureRole } from './guard.js';
import { initAdminNav } from './admin-nav.js';

let supabase = null;

function text(value) {
  return String(value ?? '').trim();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function setStatus(message, state = 'info') {
  const node = document.getElementById('supportersInlineStatus');
  if (!node) return;
  node.textContent = message || '';
  node.dataset.state = state;
}

function setSessionStatus(message, state = 'info') {
  const node = document.querySelector('[data-supporter-status]');
  if (!node) return;
  node.textContent = message || '';
  node.dataset.state = state;
}

async function getClient() {
  if (window.ccgSupabase && typeof window.ccgSupabase.getClient === 'function') {
    return await window.ccgSupabase.getClient();
  }
  return window.CCG_SUPABASE_CLIENT || null;
}

function renderRows(rows) {
  const body = document.getElementById('supportersTableBody');
  if (!body) return;
  body.innerHTML = '';

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="7">No opted-in or previously verified supporters found.</td></tr>';
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.dataset.userId = row.user_id;
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(row.display_name || 'Member')}</strong><br>
        <small>${escapeHtml(row.email || '')}</small>
      </td>
      <td>${row.hall_of_fame_opt_in ? '<span class="badge">Yes</span>' : '<span>No</span>'}</td>
      <td><label><input type="checkbox" data-field="verified"${row.supporter_verified ? ' checked' : ''}> Verified</label></td>
      <td><input type="date" data-field="since" value="${escapeHtml(row.supporter_since || '')}"></td>
      <td><input type="text" data-field="note" maxlength="120" value="${escapeHtml(row.supporter_note || '')}" placeholder="Optional short public note"></td>
      <td><input type="number" data-field="order" min="0" step="1" value="${Number(row.supporter_sort_order || 0)}"></td>
      <td><button type="button" data-save-supporter>Save</button></td>
    `;
    body.appendChild(tr);
  });
}

async function loadSupporters() {
  if (!supabase || typeof supabase.rpc !== 'function') {
    setStatus('Supabase RPC is unavailable.', 'error');
    return;
  }

  setStatus('Loading supporter records…', 'info');
  const search = text(document.getElementById('supportersSearch')?.value) || null;
  const { data, error } = await supabase.rpc('admin_list_supporters', {
    p_search: search,
    p_limit: 250
  });

  if (error) {
    console.error('[admin-supporters] admin_list_supporters failed', error);
    renderRows([]);
    setStatus(
      ['42883', 'PGRST202'].includes(String(error.code || ''))
        ? 'Supporter controls are unavailable. Apply the supporter migration, then reload.'
        : `Could not load supporters: ${error.message}`,
      'error'
    );
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  renderRows(rows);
  setStatus(`Loaded ${rows.length} supporter record${rows.length === 1 ? '' : 's'}.`, 'success');
}

async function saveRow(row) {
  const userId = row.dataset.userId;
  if (!userId) return;

  const button = row.querySelector('[data-save-supporter]');
  const verified = Boolean(row.querySelector('[data-field="verified"]')?.checked);
  const since = text(row.querySelector('[data-field="since"]')?.value) || null;
  const note = text(row.querySelector('[data-field="note"]')?.value) || null;
  const sortOrder = Math.max(0, Number(row.querySelector('[data-field="order"]')?.value || 0));

  if (button) button.disabled = true;
  setStatus('Saving supporter recognition…', 'info');

  const { error } = await supabase.rpc('admin_set_supporter_status', {
    p_user_id: userId,
    p_verified: verified,
    p_tier: 'supporter',
    p_supporter_since: since,
    p_note: note,
    p_sort_order: sortOrder
  });

  if (button) button.disabled = false;

  if (error) {
    console.error('[admin-supporters] admin_set_supporter_status failed', error);
    setStatus(`Could not save supporter recognition: ${error.message}`, 'error');
    return;
  }

  setStatus('Supporter recognition saved.', 'success');
  await loadSupporters();
}

function wireControls() {
  document.getElementById('supportersRefresh')?.addEventListener('click', loadSupporters);

  let searchTimer = null;
  document.getElementById('supportersSearch')?.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(loadSupporters, 250);
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('[data-save-supporter]');
    if (!button) return;
    const row = button.closest('tr');
    if (row) void saveRow(row);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    initAdminNav({ active: 'supporters' });
    setSessionStatus('Checking admin session…', 'info');
    await ensureRole(['admin', 'superadmin']);

    supabase = await getClient();
    if (!supabase || typeof supabase.rpc !== 'function') {
      throw new Error('Supabase client unavailable');
    }

    setSessionStatus('Signed in', 'success');
    wireControls();
    await loadSupporters();
  } catch (error) {
    console.error('[admin-supporters] initialisation failed', error);
    setSessionStatus('Unable to verify admin session.', 'error');
    setStatus(error?.message || 'Failed to initialise supporter management.', 'error');
  }
});
