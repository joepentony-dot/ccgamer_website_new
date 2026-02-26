// admin/js/admin-members.js

import { ensureRole } from './guard.js';

const ROLE_LABELS = {
  user: 'User',
  editor: 'Moderator',
  admin: 'Admin',
  superadmin: 'Superadmin'
};

document.addEventListener('DOMContentLoaded', async () => {
  await ensureRole(['admin', 'superadmin']);
  loadMembers();
});

async function loadMembers() {
  const { data, error } = await window.ccgSupabase
    .rpc('admin_list_members');

  if (error) {
    console.error(error);
    showError(error.message);
    return;
  }

  renderMembers(data);
}

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

async function updateRole(userId, role) {
  const { error } = await window.ccgSupabase
    .rpc('admin_set_member_role', {
      p_user_id: userId,
      p_role: role
    });

  if (error) {
    alert('Failed to update role: ' + error.message);
    return;
  }

  // Trigger email
  await window.ccgSupabase.functions.invoke('send-admin-message', {
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