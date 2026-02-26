// admin/js/admin-members.js

import { ensureRole } from './guard.js';

const ROLE_LABELS = {
  user: 'User',
  editor: 'Moderator',
  admin: 'Admin',
  superadmin: 'Superadmin'
};

let supabase = null;

/**
 * Get the global Supabase client safely
 */
function getSupabaseClient() {
  if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') {
    return null;
  }
  return window.ccgSupabase.getClient();
}

/**
 * Init once auth is ready
 */
async function initAdminMembers() {
  await ensureRole(['admin', 'superadmin']);

  supabase = getSupabaseClient();
  if (!supabase) {
    showError('Admin authentication unavailable. Please refresh and sign in again.');
    return;
  }

  loadMembers();
}

/**
 * Load members via RPC
 */
async function loadMembers() {
  const { data, error } = await supabase.rpc('admin_list_members');

  if (error) {
    console.error(error);
    showError(error.message);
    return;
  }

  renderMembers(data || []);
}

/**
 * Render members table
 */
function renderMembers(members) {
  const tbody = document.getElementById('membersTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  members.forEach(member => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${member.email}</td>
      <td>${member.username || ''}</td>
      <td>${formatDate(member.signup_date)}</td>
      <td>${formatDate(member.last_sign_in)}</td>
      <td>${ROLE_LABELS[member.role] || member.role}</td>
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

/**
 * Role select + save
 */
function renderRoleControls(member) {
  if (member.role === 'superadmin') {
    return '<em>Protected</em>';
  }

  return `
    <select data-user-id="${member.user_id}">
      ${Object.entries(ROLE_LABELS).map(([key, label]) =>
        `<option value="${key}" ${member.role === key ? 'selected' : ''}>${label}</option>`
      ).join('')}
    </select>
    <button class="save-role">Save</button>
  `;
}

/**
 * Attach role handlers after render
 */
document.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('save-role')) return;

  const select = e.target.previousElementSibling;
  const userId = select.dataset.userId;
  const role = select.value;

  await updateRole(userId, role);
});

/**
 * Update role RPC
 */
async function updateRole(userId, role) {
  const { error } = await supabase.rpc('admin_set_member_role', {
    p_user_id: userId,
    p_role: role
  });

  if (error) {
    alert('Failed to update role: ' + error.message);
    return;
  }

  await supabase.functions.invoke('send-admin-message', {
    body: {
      message_type: 'role_promotion',
      user_id: userId,
      role
    }
  });

  loadMembers();
}

/**
 * Utils
 */
function formatDate(date) {
  return date ? new Date(date).toLocaleString() : '';
}

function showError(msg) {
  const el = document.getElementById('membersInlineStatus');
  if (el) {
    el.textContent = msg;
    el.dataset.state = 'error';
  }
}

/**
 * Wait for global auth readiness
 */
window.addEventListener('ccg-auth-ready', initAdminMembers, { once: true });