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

function renderRows(rows = []) {
  if (!tableBody) return;
  tableBody.innerHTML = '';

  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="5">No members found.</td>';
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

    tableBody.appendChild(tr);
  });
}

async function loadMembers() {
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
    renderRows([]);
    setInlineStatus('Unable to load members.', 'error');
    return;
  }

  renderRows(Array.isArray(data) ? data : []);
  setInlineStatus(`Loaded ${Array.isArray(data) ? data.length : 0} members.`, 'success');
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

initAdminNav({ pageLabel: 'Members', active: 'members' });
bootstrap().catch(() => {
  setStatus('Unable to validate admin session.', 'error');
});
