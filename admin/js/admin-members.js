import { ensureRole, startAccessMonitor } from './guard.js';
import { getSupabaseClient } from './auth.js';
import { initAdminNav } from './admin-nav.js';

const ALLOWED_ROLES = ['superadmin', 'admin'];

const statusNode = document.querySelector('[data-member-status]');
const tableBody = document.getElementById('membersTableBody');
const inlineStatus = document.getElementById('membersInlineStatus');
const searchInput = document.getElementById('membersSearch');
const roleFilter = document.getElementById('membersRoleFilter');
const refreshButton = document.getElementById('membersRefresh');

let membersCache = [];
let loading = false;

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
    tr.innerHTML = '<td colspan="6">No members found.</td>';
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
      row.role || 'user'
    ];

    cells.forEach((value) => {
      const td = document.createElement('td');
      td.textContent = String(value);
      tr.appendChild(td);
    });

    const controlCell = document.createElement('td');
    controlCell.innerHTML = getBanControlMarkup(row);
    tr.appendChild(controlCell);

    tableBody.appendChild(tr);
  });
}

async function hydrateBanState(rows) {
  const supabase = await getSupabaseClient();
  const userIds = rows.map((row) => row.user_id).filter(Boolean);
  if (!userIds.length) return rows;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, banned, ban_reason, banned_at')
    .in('id', userIds);

  if (error || !Array.isArray(data)) return rows;

  const banById = new Map(data.map((item) => [item.id, item]));
  return rows.map((row) => {
    const banState = banById.get(row.user_id);
    return {
      ...row,
      banned: banState?.banned === true,
      ban_reason: banState?.ban_reason || null,
      banned_at: banState?.banned_at || null
    };
  });
}

async function loadMembers() {
  if (loading) return;
  loading = true;
  setInlineStatus('Loading members…');

  const supabase = await getSupabaseClient();
  const searchValue = String(searchInput?.value || '').trim();
  const roleValue = String(roleFilter?.value || '').trim();

  const { data, error } = await supabase.rpc('admin_list_members_phase1', {
    p_search: searchValue || null,
    p_role: roleValue || null,
    p_limit: 200,
    p_offset: 0
  });

  if (error) {
    membersCache = [];
    renderRows([]);
    setInlineStatus('Unable to load members.', 'error');
    loading = false;
    return;
  }

  const baseRows = Array.isArray(data) ? data : [];
  membersCache = await hydrateBanState(baseRows);
  renderRows(membersCache);
  setInlineStatus(`Loaded ${membersCache.length} members.`, 'success');
  loading = false;
}

async function toggleBan(userId, shouldBan, reason) {
  const supabase = await getSupabaseClient();

  const { error } = await supabase.rpc('admin_set_member_soft_ban', {
    p_user_id: userId,
    p_banned: shouldBan,
    p_reason: shouldBan ? (reason || null) : null
  });

  if (error) {
    setInlineStatus('Unable to update ban status.', 'error');
    return;
  }

  setInlineStatus(shouldBan ? 'User soft-banned.' : 'User unbanned.', 'success');
  await loadMembers();
}

async function bootstrap() {
  setStatus('Checking admin role…');

  const access = await ensureRole(ALLOWED_ROLES);
  if (!access) return;

  setStatus(`Signed in as ${access.role}`, 'success');
  startAccessMonitor();

  await loadMembers();
}

refreshButton?.addEventListener('click', () => {
  loadMembers().catch(() => {
    setInlineStatus('Unable to load members.', 'error');
  });
});

searchInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    loadMembers().catch(() => {
      setInlineStatus('Unable to load members.', 'error');
    });
  }
});

roleFilter?.addEventListener('change', () => {
  loadMembers().catch(() => {
    setInlineStatus('Unable to load members.', 'error');
  });
});

tableBody?.addEventListener('click', (event) => {
  const button = event.target instanceof HTMLElement ? event.target.closest('.ban-toggle-btn') : null;
  if (!button) return;

  const cell = button.closest('[data-ban-user-id]');
  if (!(cell instanceof HTMLElement)) return;

  const userId = String(cell.dataset.banUserId || '').trim();
  if (!userId) return;

  const reasonInput = cell.querySelector('.ban-reason-input');
  const currentRecord = membersCache.find((member) => member.user_id === userId);
  const currentlyBanned = currentRecord?.banned === true;
  const reason = reasonInput instanceof HTMLInputElement ? reasonInput.value.trim() : '';

  toggleBan(userId, !currentlyBanned, reason).catch(() => {
    setInlineStatus('Unable to update ban status.', 'error');
  });
});

initAdminNav({ pageLabel: 'Members', active: 'members' });
bootstrap().catch(() => {
  setStatus('Unable to validate admin session.', 'error');
});
