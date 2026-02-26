// admin/js/admin-members.js

import { ensureRole } from './guard.js';

const ROLE_LABELS = {
  user: 'User',
  editor: 'Moderator',
  admin: 'Admin',
  superadmin: 'Superadmin'
};

let supabase = null;
let hasInitialised = false;

function getSupabaseClient() {
  if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') {
    return null;
  }
  return window.ccgSupabase.getClient();
}

function setStatus(message, state = 'info') {
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

async function initAdminMembers() {
  if (hasInitialised) return;
  hasInitialised = true;

  try {
    setMemberStatus('Checking admin session…', 'info');

    await ensureRole(['admin', 'superadmin']);

    supabase = getSupabaseClient();
    if (!supabase) {
      setMemberStatus('Admin authentication unavailable.', 'error');
      setStatus('Could not find Supabase client. Please refresh and sign in again.', 'error');
      return;
    }

    setMemberStatus('Signed in', 'success');
    await loadMembers();
  } catch (error) {
    console.error('[admin-members] init failed', error);
    setMemberStatus('Unable to verify admin session.', 'error');
    setStatus(error?.message || 'Unable to load members directory.', 'error');
  }
}

async function loadMembers() {
  if (!supabase) {
    setStatus('Supabase client is not ready yet.', 'error');
    return;
  }

  setStatus('Loading members…', 'info');

  const { data, error } = await supabase.rpc('admin_list_members');

  if (error) {
    console.error('[admin-members] admin_list_members failed', error);
    setStatus(`Failed to load members: ${error.message}`, 'error');
    renderMembers([]);
    return;
  }

  const members = Array.isArray(data) ? data : [];
  renderMembers(members);
  setStatus(`Loaded ${members.length} member${members.length === 1 ? '' : 's'}.`, 'success');
}

function renderMembers(members) {
  const tbody = document.getElementById('membersTableBody');
  if (!tbody) {
    setStatus('Members table body not found on page.', 'error');
    return;
  }

  tbody.innerHTML = '';

  if (!members.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="8">No members found.</td>';
    tbody.appendChild(tr);
    return;
  }

  members.forEach((member) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${escapeHtml(member.email)}</td>
      <td>${escapeHtml(member.username || '')}</td>
      <td>${escapeHtml(formatDate(member.signup_date))}</td>
      <td>${escapeHtml(formatDate(member.last_sign_in))}</td>
      <td>${escapeHtml(ROLE_LABELS[member.role] || member.role || 'User')}</td>
      <td>
        ${member.is_moderator_badge
          ? '<span class="badge badge-moderator">Moderator</span>'
          : ''
        }
      </td>
      <td>
        ${renderRoleControls(member)}
      </td>
      <td>
        ${renderBanControls(member)}
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function renderRoleControls(member) {
  if (member.role === 'superadmin') {
    return '<em>Protected</em>';
  }

  const optionsMarkup = Object.entries(ROLE_LABELS)
    .map(([key, label]) => `<option value="${key}" ${member.role === key ? 'selected' : ''}>${label}</option>`)
    .join('');

  return `
    <select data-user-id="${member.user_id}" aria-label="Role for ${escapeHtml(member.email || member.user_id)}">
      ${optionsMarkup}
    </select>
    <button class="save-role" type="button">Save</button>
  `;
}

function renderBanControls(member) {
  if (member.role === 'superadmin') {
    return '<em>Protected</em>';
  }

  return member.banned
    ? '<span class="badge badge-warning">Banned</span>'
    : '<span>Active</span>';
}

document.addEventListener('click', async (e) => {
  const target = e.target;
  if (!(target instanceof Element) || !target.classList.contains('save-role')) return;

  const select = target.previousElementSibling;
  if (!(select instanceof HTMLSelectElement)) {
    setStatus('Unable to find role selector for this row.', 'error');
    return;
  }

  const userId = select.dataset.userId;
  const role = select.value;

  if (!userId || !role) {
    setStatus('Missing member details for role update.', 'error');
    return;
  }

  await updateRole(userId, role);
});

async function updateRole(userId, role) {
  if (!supabase) {
    setStatus('Supabase client is not ready yet.', 'error');
    return;
  }

  setStatus('Saving role…', 'info');

  const { error } = await supabase.rpc('admin_set_member_role', {
    p_user_id: userId,
    p_role: role
  });

  if (error) {
    console.error('[admin-members] admin_set_member_role failed', error);
    alert(`Failed to update role: ${error.message}`);
    setStatus(`Role update failed: ${error.message}`, 'error');
    return;
  }

  const { error: notifyError } = await supabase.functions.invoke('send-new-game-notification', {
    body: {
      message_type: 'role_promotion',
      user_id: userId,
      role
    }
  });

  if (notifyError) {
    console.warn('[admin-members] role email notification failed', notifyError);
    setStatus('Role updated, but the notification email could not be sent.', 'warning');
  } else {
    setStatus('Role updated successfully.', 'success');
  }

  await loadMembers();
}

function formatDate(date) {
  return date ? new Date(date).toLocaleString() : '';
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

if (window.ccgSupabase?.isReady === true) {
  initAdminMembers();
} else {
  window.addEventListener('ccg-auth-ready', initAdminMembers, { once: true });
}
