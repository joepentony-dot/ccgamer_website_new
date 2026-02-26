// admin/js/admin-members.js
// Phase 3 — Members Directory
// Auth-safe, RPC-safe, non-coder copy/paste version

import { AUTH_CONFIG } from './config.js';
import { fetchUserRole } from './roles.js';

const ROLE_LABELS = {
  user: 'User',
  editor: 'Moderator',
  admin: 'Admin',
  superadmin: 'Superadmin'
};

const ALLOWED_ROLES = new Set(['admin', 'superadmin']);

let supabase = null;
let hasInitialised = false;

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForSupabaseReady(timeoutMs = 10000) {
  if (window.ccgSupabase?.isReady === true) return true;

  if (window.ccgSupabase && typeof window.ccgSupabase.waitForAuth === 'function') {
    try {
      await Promise.race([
        window.ccgSupabase.waitForAuth(),
        delay(timeoutMs).then(() => {
          throw new Error('timed_out');
        })
      ]);
      return true;
    } catch (_error) {
      // Continue with event-based fallback below.
    }
  }

  await new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const onReady = () => finish();
    window.addEventListener('ccg-auth-ready', onReady, { once: true });
    window.addEventListener('ccg:auth-ready', onReady, { once: true });

    window.setTimeout(() => {
      window.removeEventListener('ccg-auth-ready', onReady);
      window.removeEventListener('ccg:auth-ready', onReady);
      finish();
    }, timeoutMs);
  });

  return Boolean(window.ccgSupabase?.getClient);
}

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
 * Status helpers (prevents silent failures)
 */
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

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

async function resolveCurrentRole(user) {
  const metadataRole = normalizeRole(user?.app_metadata?.role || user?.user_metadata?.role || user?.role);
  if (metadataRole) return metadataRole;

  if (user?.id) {
    try {
      const tableRole = normalizeRole(await fetchUserRole({ userId: user.id, force: true }));
      if (tableRole) return tableRole;
    } catch (error) {
      console.warn('[admin-members] role lookup failed', error);
      setInlineStatus('Role lookup did not return a role for this account.', 'warning');
    }
  }

  return '';
}

function redirectToLogin(reason) {
  const loginPath = AUTH_CONFIG?.loginPage || '/admin/login.html';
  const url = new URL(loginPath, window.location.origin);
  if (reason) {
    url.searchParams.set('reason', reason);
  }
  window.location.replace(url.toString());
}

/**
 * Initialise admin members page
 * Safe whether auth fired before or after page load
 */
async function initAdminMembers() {
  if (hasInitialised) return;
  hasInitialised = true;

  try {
    setMemberStatus('Checking admin session…', 'info');
    setInlineStatus('Waiting for auth readiness…', 'info');

    const authReady = await waitForSupabaseReady(12000);
    if (!authReady) {
      setMemberStatus('Admin auth is still starting…', 'warning');
      setInlineStatus('Supabase auth readiness timed out. Please refresh this page.', 'warning');
      return;
    }

    supabase = await getSupabaseClient();
    if (!supabase) {
      setMemberStatus('Admin authentication unavailable.', 'error');
      setInlineStatus('Supabase client not available. Please refresh and sign in again.', 'error');
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      throw sessionError;
    }

    const session = sessionData?.session || null;
    const user = session?.user || null;
    if (!user?.id) {
      setMemberStatus('Please sign in to continue.', 'error');
      setInlineStatus('No active admin session was found.', 'error');
      redirectToLogin('signed_out');
      return;
    }

    const role = await resolveCurrentRole(user);
    if (!ALLOWED_ROLES.has(role)) {
      setMemberStatus('Access denied for this role.', 'error');
      setInlineStatus('Your account is missing admin permissions.', 'error');
      redirectToLogin('role');
      return;
    }

    setMemberStatus('Signed in', 'success');
    setInlineStatus('Loading members…', 'info');
    await loadMembers();
  } catch (err) {
    console.error('[admin-members] init failed', err);
    setMemberStatus('Unable to verify admin session.', 'error');
    setInlineStatus(err?.message || 'Failed to initialise members directory.', 'error');
  }
}

/**
 * Load members from Supabase
 * IMPORTANT: parameters MUST be supplied to match SQL signature
 */
async function loadMembers() {
  if (!supabase) {
    setInlineStatus('Supabase client not ready.', 'error');
    return;
  }

  setInlineStatus('Loading members…', 'info');

  const { data, error } = await supabase.rpc('admin_list_members', {
    p_banned: null,
    p_limit: 100,
    p_offset: 0,
    p_role: null,
    p_search: null
  });

  if (error) {
    console.error('[admin-members] admin_list_members failed', error);
    setInlineStatus(`Failed to load members: ${error.message}`, 'error');
    renderMembers([]);
    return;
  }

  const members = Array.isArray(data) ? data : [];
  renderMembers(members);
  setInlineStatus(
    `Loaded ${members.length} member${members.length === 1 ? '' : 's'}.`,
    'success'
  );
}

/**
 * Render members table
 */
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
      <td>${renderRoleControls(member)}</td>
      <td>${renderBanControls(member)}</td>
    `;

    tbody.appendChild(tr);
  });
}

/**
 * Role controls
 */
function renderRoleControls(member) {
  if (member.role === 'superadmin') {
    return '<em>Protected</em>';
  }

  const options = Object.entries(ROLE_LABELS)
    .map(
      ([key, label]) =>
        `<option value="${key}" ${member.role === key ? 'selected' : ''}>${label}</option>`
    )
    .join('');

  return `
    <select data-user-id="${member.user_id}" aria-label="Role for ${escapeHtml(member.email)}">
      ${options}
    </select>
    <button class="save-role" type="button">Save</button>
  `;
}

/**
 * Soft ban display (read-only for now)
 */
function renderBanControls(member) {
  if (member.role === 'superadmin') {
    return '<em>Protected</em>';
  }

  return member.banned
    ? '<span class="badge badge-warning">Banned</span>'
    : '<span>Active</span>';
}

/**
 * Handle role save clicks
 */
document.addEventListener('click', async (e) => {
  const target = e.target;
  if (!(target instanceof Element)) return;
  if (!target.classList.contains('save-role')) return;

  const select = target.previousElementSibling;
  if (!(select instanceof HTMLSelectElement)) {
    setInlineStatus('Could not find role selector.', 'error');
    return;
  }

  const userId = select.dataset.userId;
  const role = select.value;

  if (!userId || !role) {
    setInlineStatus('Missing member details for role update.', 'error');
    return;
  }

  await updateRole(userId, role);
});

/**
 * Update member role
 */
async function updateRole(userId, role) {
  if (!supabase) {
    setInlineStatus('Supabase client not ready.', 'error');
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

  const { error: notifyError } = await supabase.functions.invoke(
    'send-new-game-notification',
    {
      body: {
        message_type: 'role_promotion',
        user_id: userId,
        role
      }
    }
  );

  if (notifyError) {
    console.warn('[admin-members] role email notification failed', notifyError);
    setInlineStatus(
      'Role updated, but notification email could not be sent.',
      'warning'
    );
  } else {
    setInlineStatus('Role updated successfully.', 'success');
  }

  await loadMembers();
}

/**
 * Helpers
 */
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

/**
 * Auth-ready handling (both early & late)
 */
if (window.ccgSupabase?.isReady === true) {
  initAdminMembers();
} else {
  window.addEventListener('ccg-auth-ready', initAdminMembers, { once: true });
  window.addEventListener('ccg:auth-ready', initAdminMembers, { once: true });
  window.setTimeout(() => {
    initAdminMembers();
  }, 1200);
}
