// admin/js/admin-members.js
// Phase 3 — Members Directory
// Omega-safe: does NOT touch shared auth. Uses ensureRole() + global client only.

import { ensureRole } from './guard.js';

const ROLE_LABELS = {
  user: 'User',
  editor: 'Moderator',
  admin: 'Admin',
  superadmin: 'Superadmin'
};

let supabase = null;

function setInlineStatus(message, state = 'info') {
  const el = document.getElementById('membersInlineStatus');
  if (!el) return;
  el.textContent = message || '';
  el.dataset.state = state;
}

function setMemberStatus(message, state = 'info') {
  const el = document.querySelector('[data-member-status]');
  if (!el) return;
  el.textContent = message || '';
  el.dataset.state = state;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function formatDate(date) {
  return date ? new Date(date).toLocaleString() : '';
}

/**
 * IMPORTANT: In your project, window.ccgSupabase.getClient() may be async (returns a Promise).
 * This helper normalises it so we always end up with a real Supabase client instance.
 */
async function getGlobalSupabaseClient() {
  if (window.ccgSupabase && typeof window.ccgSupabase.getClient === 'function') {
    const maybeClient = window.ccgSupabase.getClient();
    // If it's a Promise, await it.
    if (maybeClient && typeof maybeClient.then === 'function') {
      return await maybeClient;
    }
    return maybeClient;
  }

  // Fallback only (keeps us from crashing)
  if (window.CCG_SUPABASE_CLIENT) return window.CCG_SUPABASE_CLIENT;

  return null;
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    setMemberStatus('Checking admin session…', 'info');
    setInlineStatus('Verifying permissions…', 'info');

    // Same gating pattern as other admin pages
    await ensureRole(['admin', 'superadmin']);

    supabase = await getGlobalSupabaseClient();

    if (!supabase) {
      setMemberStatus('Admin authentication unavailable.', 'error');
      setInlineStatus('Supabase client not ready. Please refresh and sign in again.', 'error');
      return;
    }

    // Defensive: confirm we really got the right object
    if (typeof supabase.rpc !== 'function') {
      console.error('[admin-members] getClient() did not return a Supabase client:', supabase);
      setMemberStatus('Unable to verify admin session.', 'error');
      setInlineStatus('Supabase client loaded, but RPC is unavailable (client mismatch).', 'error');
      return;
    }

    setMemberStatus('Signed in', 'success');
    wireControls();
    await loadMembers();
  } catch (err) {
    console.error('[admin-members] init failed', err);
    setMemberStatus('Unable to verify admin session.', 'error');
    setInlineStatus(err?.message || 'Failed to initialise Members.', 'error');
  }
});

function wireControls() {
  const refreshBtn = document.getElementById('membersRefresh');
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadMembers());

  const search = document.getElementById('membersSearch');
  const roleFilter = document.getElementById('membersRoleFilter');
  const bannedFilter = document.getElementById('membersBannedFilter');

  [search, roleFilter, bannedFilter].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', () => loadMembers());
    el.addEventListener('change', () => loadMembers());
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target;
    if (!(btn instanceof Element)) return;
    if (!btn.classList.contains('save-role')) return;

    const row = btn.closest('tr');
    if (!row) return;

    const select = row.querySelector('select[data-user-id]');
    if (!(select instanceof HTMLSelectElement)) {
      setInlineStatus('Could not find role selector for this row.', 'error');
      return;
    }

    const userId = select.dataset.userId;
    const newRole = select.value;

    if (!userId || !newRole) {
      setInlineStatus('Missing user id / role for update.', 'error');
      return;
    }

    await updateRole(userId, newRole);
  });
}

async function loadMembers() {
  if (!supabase) {
    setInlineStatus('Supabase client not ready.', 'error');
    return;
  }

  if (typeof supabase.rpc !== 'function') {
    setInlineStatus('Supabase RPC is unavailable (client mismatch).', 'error');
    return;
  }

  setInlineStatus('Loading members…', 'info');

  const search = document.getElementById('membersSearch');
  const roleFilter = document.getElementById('membersRoleFilter');
  const bannedFilter = document.getElementById('membersBannedFilter');

  const p_search = (search?.value || '').trim() || null;
  const p_role = (roleFilter?.value || '').trim() || null;

  let p_banned = null;
  const bannedVal = (bannedFilter?.value || '').trim();
  if (bannedVal === 'true') p_banned = true;
  if (bannedVal === 'false') p_banned = false;

  const { data, error } = await supabase.rpc('admin_list_members', {
    p_banned,
    p_limit: 100,
    p_offset: 0,
    p_role,
    p_search
  });

  if (error) {
    console.error('[admin-members] admin_list_members failed', error);
    setInlineStatus(`Failed to load members: ${error.message}`, 'error');
    renderMembers([]);
    return;
  }

  const members = Array.isArray(data) ? data : [];
  renderMembers(members);
  setInlineStatus(`Loaded ${members.length} member${members.length === 1 ? '' : 's'}.`, 'success');
}

function renderMembers(members) {
  const tbody = document.getElementById('membersTableBody');
  if (!tbody) {
    setInlineStatus('Members table body not found on page.', 'error');
    return;
  }

  tbody.innerHTML = '';

  if (!members.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="8">No members found.</td>';
    tbody.appendChild(tr);
    return;
  }

  members.forEach((m) => {
    const roleLabel = ROLE_LABELS[m.role] || m.role || 'User';
    const isProtected = m.role === 'superadmin';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(m.email)}</td>
      <td>${escapeHtml(m.username || '')}</td>
      <td>${escapeHtml(formatDate(m.signup_date))}</td>
      <td>${escapeHtml(formatDate(m.last_sign_in))}</td>
      <td>${escapeHtml(roleLabel)}</td>
      <td>${m.is_moderator_badge ? '<span class="badge badge-moderator">Moderator</span>' : ''}</td>
      <td>${isProtected ? '<em>Protected</em>' : renderRoleControls(m)}</td>
      <td>${isProtected ? '<em>Protected</em>' : renderBanState(m)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderRoleControls(member) {
  const options = Object.entries(ROLE_LABELS)
    .map(([key, label]) => {
      const selected = member.role === key ? 'selected' : '';
      return `<option value="${key}" ${selected}>${label}</option>`;
    })
    .join('');

  return `
    <select data-user-id="${escapeHtml(member.user_id)}" aria-label="Role for ${escapeHtml(member.email)}">
      ${options}
    </select>
    <button class="save-role" type="button">Save</button>
  `;
}

function renderBanState(member) {
  return member.banned
    ? '<span class="badge badge-warning">Banned</span>'
    : '<span>Active</span>';
}

async function updateRole(userId, role) {
  if (!supabase || typeof supabase.rpc !== 'function') {
    setInlineStatus('Supabase RPC is unavailable (client mismatch).', 'error');
    return;
  }

  setInlineStatus('Saving role…', 'info');

  const { error } = await supabase.rpc('admin_set_member_role', {
    p_user_id: userId,
    p_new_role: role
  });

  if (error) {
    console.error('[admin-members] admin_set_member_role failed', error);
    alert(`Failed to update role: ${error.message}`);
    setInlineStatus(`Role update failed: ${error.message}`, 'error');
    return;
  }

  setInlineStatus('Role updated. Refreshing list…', 'success');
  await loadMembers();
}