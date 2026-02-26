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
 * Safely retrieve the global Supabase client
 */
function getSupabaseClient() {
  if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') {
    return null;
  }
  return window.ccgSupabase.getClient();
}

/**
 * Initialise members admin once auth is ready
 */
async function initAdminMembers() {
  await ensureRole(['admin', 'superadmin']);

  supabase = getSupabaseClient();
  if (!supabase) {
    console.error('[admin-members] Supabase client not available after auth-ready');
    showError('Admin authentication unavailable. Please refresh and sign in again.');
    return;
  }

  loadMembers();
}

/**
 * Load members list
 */
async function loadMembers() {
  const { data, error } = await supabase.rpc('admin_list_members');

  if (error) {
    console.error(error);
    showError(error.message);
    return;
  }

  renderMembers(data);
}

/**
 * Render members table
 */
function renderMembers(members) {
  const tbody = document.querySelector('#members-table tbody');
  tbody.innerHTML = '';

  members.forEach(member => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${member.email}</td>
      <td>${member.username || ''}</td>
      <td>${formatDate(member.signup_date)}</td>
      <td>${formatDate(member.last_sign_in)}</td>
      <td>
        <select data-user-id="${member.user_id}">
          ${Object.entries(ROLE_LABELS).map(([key, label]) =>
            `<option value="${key}" ${member.role === key ? 'selected' : ''}>${label}</option>`
          ).join('')}
        </select>
        <button class="save-role">Save</button>
      </td>
      <td>${renderBanControls(member)}</td>
    `;

    tr.querySelector('.save-role').addEventListener('click', () =>
      updateRole(member.user_id, tr.querySelector('select').value)
    );

    tbody.appendChild(tr);
  });
}

/**
 * Update user role
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

  // Trigger notification email
  await supabase.functions.invoke('send-admin-message', {
    body: {
      message_type: 'role_promotion',
      user_id: userId,
      role
    }
  });

  alert('Role updated successfully');
  loadMembers();
}

function formatDate(date) {
  return date ? new Date(date).toLocaleString() : '';
}

function showError(msg) {
  document.querySelector('#members-error').textContent = msg;
}

/**
 * Wait for global auth readiness
 */
window.addEventListener('ccg-auth-ready', initAdminMembers, { once: true });