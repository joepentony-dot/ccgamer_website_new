import { ensureRole, startAccessMonitor } from './guard.js';
import { getSupabaseClient } from './auth.js';
import { initAdminNav } from './admin-nav.js';

const ALLOWED_ROLES = ['superadmin', 'admin'];

const statusNode = document.querySelector('[data-member-status]');
const tableBody = document.getElementById('membersTableBody');
const inlineStatus = document.getElementById('membersInlineStatus');
const searchInput = document.getElementById('membersSearch');
const roleFilter = document.getElementById('membersRoleFilter');
const bannedFilter = document.getElementById('membersBannedFilter');
const refreshButton = document.getElementById('membersRefresh');

let membersCache = [];
let loading = false;
let supportsBannedFilter = true;
let actorRole = 'admin';
let actorUserId = null;

function setStatus(message, state = 'info') {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.dataset.state = state;
}

function setInlineStatus(message, state = 'info') {
  if (!inlineStatus) return;
  inlineStatus.textContent = message;
  inlineStatus.dataset.state = state;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseBannedFilter() {
  const value = String(bannedFilter?.value || '').trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function roleLabel(role) {
  const normalized = String(role || 'user').toLowerCase();
  if (normalized === 'editor') return 'Moderator';
  return normalized || 'user';
}

function normalizeMemberRow(row) {
  return {
    ...row,
    user_id: row.user_id || row.id || null,
    signup_date: row.signup_date ?? row.created_at ?? null,
    last_sign_in: row.last_sign_in ?? row.last_sign_in_at ?? null,
    banned: row.banned === true,
    is_moderator_badge: row.is_moderator_badge === true
  };
}

function buildRoleOptions() {
  const options = [
    { value: 'user', label: 'user' },
    { value: 'editor', label: 'Moderator' },
    { value: 'admin', label: 'admin' }
  ];

  if (actorRole === 'superadmin') {
    options.push({ value: 'superadmin', label: 'superadmin' });
  }

  return options
    .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    .join('');
}

function getRoleControlMarkup(row) {
  const role = String(row.role || 'user').toLowerCase();
  const isSelf = actorUserId && row.user_id === actorUserId;
  const targetIsSuperadmin = role === 'superadmin';
  const cannotManage = isSelf || (actorRole !== 'superadmin' && targetIsSuperadmin);

  if (cannotManage) {
    return `<span>${isSelf ? 'Current account' : 'Only superadmin can edit this role.'}</span>`;
  }

  return `
    <div class="role-cell" data-role-user-id="${escapeHtml(row.user_id)}">
      <label>
        <span>Set role</span>
        <select class="role-select">${buildRoleOptions()}</select>
      </label>
      <button type="button" class="role-apply-btn">Apply</button>
    </div>
  `;
}

function getBadgeMarkup(row) {
  return row.is_moderator_badge ? 'Moderator' : '—';
}

function getBanControlMarkup(row) {
  const banned = row.banned === true;
  const reason = row.ban_reason ? String(row.ban_reason) : '';
  const statusLabel = banned ? 'BANNED' : 'ACTIVE';
  const buttonLabel = banned ? 'Unban user' : 'Soft ban user';

  return `
    <div class="ban-cell" data-ban-user-id="${escapeHtml(row.user_id)}">
      <strong class="ban-state" data-banned="${banned ? 'true' : 'false'}">${statusLabel}</strong>
      <small>${banned && row.banned_at ? `Since ${escapeHtml(formatDate(row.banned_at))}` : 'No active ban.'}</small>
      <label>
        <span>Reason</span>
        <input type="text" class="ban-reason-input" maxlength="300" placeholder="optional reason" value="${escapeHtml(reason)}" />
      </label>
      <button type="button" class="ban-toggle-btn">${buttonLabel}</button>
    </div>
  `;
}

function renderRows(rows = []) {
  if (!tableBody) return;
  tableBody.innerHTML = '';

  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="8">No members found.</td>';
    tableBody.appendChild(tr);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    const cells = [
      row.email || '—',
      row.username || '—',
      formatDate(row.signup_date),
      formatDate(row.last_sign_in),
      roleLabel(row.role),
      getBadgeMarkup(row)
    ];

    cells.forEach((value) => {
      const td = document.createElement('td');
      td.textContent = String(value);
      tr.appendChild(td);
    });

    const roleControlCell = document.createElement('td');
    roleControlCell.innerHTML = getRoleControlMarkup(row);
    tr.appendChild(roleControlCell);

    const controlCell = document.createElement('td');
    controlCell.innerHTML = getBanControlMarkup(row);
    tr.appendChild(controlCell);

    tableBody.appendChild(tr);

    const roleSelect = tr.querySelector('.role-select');
    if (roleSelect instanceof HTMLSelectElement) {
      roleSelect.value = String(row.role || 'user').toLowerCase();
    }
  });
}

async function fetchMembers(supabase, params) {
  const primaryResponse = await supabase.rpc('admin_list_members', params);
  if (!primaryResponse.error) return primaryResponse;

  const errorMessage = String(primaryResponse.error.message || '');
  const mayNotSupportBanned = params.p_banned !== undefined
    && /p_banned|function .* does not exist|unexpected parameter/i.test(errorMessage);

  if (!mayNotSupportBanned) return primaryResponse;

  supportsBannedFilter = false;
  const fallbackParams = { ...params };
  delete fallbackParams.p_banned;
  return supabase.rpc('admin_list_members', fallbackParams);
}

async function loadMembers() {
  if (loading) return;
  loading = true;
  setInlineStatus('Loading members…');

  try {
    const supabase = await getSupabaseClient();
    const searchValue = String(searchInput?.value || '').trim();
    const roleValue = String(roleFilter?.value || '').trim();
    const bannedValue = parseBannedFilter();

    const rpcParams = {
      p_search: searchValue || null,
      p_role: roleValue || null,
      p_limit: 200,
      p_offset: 0
    };

    if (supportsBannedFilter) {
      rpcParams.p_banned = bannedValue;
    }

    const { data, error } = await fetchMembers(supabase, rpcParams);

    if (error) {
      membersCache = [];
      renderRows([]);
      setInlineStatus(`Unable to load members: ${error.message}`, 'error');
      return;
    }

    membersCache = Array.isArray(data) ? data.map(normalizeMemberRow) : [];
    renderRows(membersCache);

    const filterSuffix = !supportsBannedFilter && bannedValue !== null
      ? ' (ban filter unavailable for current RPC version)'
      : '';
    setInlineStatus(`Loaded ${membersCache.length} members.${filterSuffix}`, 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Unknown error');
    membersCache = [];
    renderRows([]);
    setInlineStatus(`Unable to load members: ${message}`, 'error');
  } finally {
    loading = false;
  }
}

async function sendRoleChangeNotification(supabase, row, newRole) {
  const payload = {
    target_user_id: row.user_id,
    previous_role: String(row.role || 'user').toLowerCase(),
    new_role: String(newRole || 'user').toLowerCase()
  };

  try {
    const { error } = await supabase.functions.invoke('send-role-change-notification', {
      body: payload
    });

    if (error) {
      console.warn('[admin-members] role notification failed silently', error);
    }
  } catch (error) {
    console.warn('[admin-members] role notification failed silently', error);
  }
}

async function applyRoleChange(userId, nextRole) {
  const member = membersCache.find((item) => item.user_id === userId);
  if (!member) return;

  const previousRole = String(member.role || 'user').toLowerCase();
  const normalizedNextRole = String(nextRole || '').toLowerCase();

  if (!normalizedNextRole || normalizedNextRole === previousRole) {
    setInlineStatus('No role change needed.', 'info');
    return;
  }

  try {
    const supabase = await getSupabaseClient();

    const { error } = await supabase.rpc('admin_set_member_role', {
      p_user_id: userId,
      p_role: normalizedNextRole
    });

    if (error) {
      setInlineStatus(`Unable to update role: ${error.message}`, 'error');
      return;
    }

    await sendRoleChangeNotification(supabase, member, normalizedNextRole);
    setInlineStatus(`Role updated to ${roleLabel(normalizedNextRole)}.`, 'success');
    await loadMembers();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Unknown error');
    setInlineStatus(`Unable to update role: ${message}`, 'error');
  }
}

async function toggleBan(userId, shouldBan, reason) {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.rpc('admin_set_member_soft_ban', {
      p_user_id: userId,
      p_banned: shouldBan,
      p_reason: shouldBan ? (reason || null) : null
    });

    if (error) {
      setInlineStatus(`Unable to update ban status: ${error.message}`, 'error');
      return;
    }

    setInlineStatus(shouldBan ? 'User soft-banned.' : 'User unbanned.', 'success');
    await loadMembers();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Unknown error');
    setInlineStatus(`Unable to update ban status: ${message}`, 'error');
  }
}

async function bootstrap() {
  setStatus('Checking admin role…');

  const access = await ensureRole(ALLOWED_ROLES);
  if (!access) return;

  actorRole = String(access.role || 'admin').toLowerCase();

  const supabase = await getSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  actorUserId = authData?.user?.id || null;

  setStatus(`Signed in as ${roleLabel(access.role)}`, 'success');
  startAccessMonitor();

  await loadMembers();
}

refreshButton?.addEventListener('click', () => {
  loadMembers();
});

searchInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    loadMembers();
  }
});

roleFilter?.addEventListener('change', () => {
  loadMembers();
});

bannedFilter?.addEventListener('change', () => {
  loadMembers();
});

tableBody?.addEventListener('click', (event) => {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target) return;

  const roleButton = target.closest('.role-apply-btn');
  if (roleButton instanceof HTMLElement) {
    const roleCell = roleButton.closest('[data-role-user-id]');
    if (!(roleCell instanceof HTMLElement)) return;

    const userId = String(roleCell.dataset.roleUserId || '').trim();
    if (!userId) return;

    const roleSelect = roleCell.querySelector('.role-select');
    if (!(roleSelect instanceof HTMLSelectElement)) return;

    applyRoleChange(userId, roleSelect.value);
    return;
  }

  const banButton = target.closest('.ban-toggle-btn');
  if (!banButton) return;

  const cell = banButton.closest('[data-ban-user-id]');
  if (!(cell instanceof HTMLElement)) return;

  const userId = String(cell.dataset.banUserId || '').trim();
  if (!userId) return;

  const reasonInput = cell.querySelector('.ban-reason-input');
  const currentRecord = membersCache.find((member) => member.user_id === userId);
  const currentlyBanned = currentRecord?.banned === true;
  const reason = reasonInput instanceof HTMLInputElement ? reasonInput.value.trim() : '';

  toggleBan(userId, !currentlyBanned, reason);
});

initAdminNav({ pageLabel: 'Members', active: 'members' });
bootstrap().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unable to validate admin session.';
  setStatus(message, 'error');
});
