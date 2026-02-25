import { getSupabaseClient } from './auth.js';
import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

const ALLOWED_ROLES = ['superadmin', 'admin', 'editor'];

const statusNode = document.querySelector('[data-member-status]');
const searchInput = document.getElementById('membersSearch');
const roleFilter = document.getElementById('membersRoleFilter');
const bannedFilter = document.getElementById('membersBannedFilter');
const refreshButton = document.getElementById('membersRefresh');
const bodyNode = document.getElementById('membersTableBody');
const timelineList = document.getElementById('timelineList');
const timelineRefresh = document.getElementById('timelineRefresh');
const messageForm = document.getElementById('messageForm');
const messageResult = document.getElementById('messageResult');

function setStatus(text, isError = false) {
  statusNode.textContent = text;
  statusNode.style.color = isError ? '#ff9aa2' : '#8fd7ff';
}

function parseBannedFilter() {
  if (bannedFilter.value === 'true') return true;
  if (bannedFilter.value === 'false') return false;
  return null;
}

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
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

function memberActionsMarkup(member) {
  const userId = member.user_id;
  const banLabel = member.banned ? 'Unban' : 'Soft ban';

  return `
    <div class="member-actions" data-user-id="${escapeHtml(userId)}">
      <label>
        Role
        <select data-action="role">
          ${['user', 'editor', 'mod', 'admin', 'superadmin'].map((role) => `<option value="${role}" ${member.role === role ? 'selected' : ''}>${role}</option>`).join('')}
        </select>
      </label>
      <button type="button" data-action="save-role">Save role</button>
      <button type="button" data-action="soft-ban">${banLabel}</button>
      <button type="button" data-action="hard-ban">Hard ban</button>
    </div>
  `;
}

async function loadMembers() {
  const supabase = await getSupabaseClient();
  setStatus('Loading members…');

  const { data, error } = await supabase.rpc('admin_list_members', {
    p_search: searchInput.value.trim() || null,
    p_role: roleFilter.value || null,
    p_banned: parseBannedFilter(),
    p_limit: 300,
    p_offset: 0
  });

  if (error) {
    setStatus(`Failed to load members: ${error.message}`, true);
    return;
  }

  bodyNode.innerHTML = (data || []).map((member) => {
    const prefs = [
      `games: ${member.notify_new_games ? 'on' : 'off'}`,
      `newsletter: ${member.notify_newsletter ? 'on' : 'off'}`,
      `admin: ${member.notify_admin ? 'on' : 'off'}`
    ].join('<br>');

    return `
      <tr>
        <td>${escapeHtml(member.email || '—')}</td>
        <td>${escapeHtml(member.username || '—')}</td>
        <td>${escapeHtml(member.role || 'user')}</td>
        <td>${escapeHtml(fmtDate(member.created_at))}</td>
        <td>${escapeHtml(fmtDate(member.last_sign_in_at))}</td>
        <td><small>${prefs}</small></td>
        <td>${member.banned ? `Banned<br><small>${escapeHtml(member.ban_reason || 'No reason')}</small>` : 'Active'}</td>
        <td>${memberActionsMarkup(member)}</td>
      </tr>
    `;
  }).join('');

  setStatus(`Loaded ${(data || []).length} members.`);
}

async function loadTimeline() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.rpc('admin_list_activity', {
    p_search: null,
    p_limit: 100
  });

  if (error) {
    timelineList.innerHTML = `<li>Failed to load timeline: ${escapeHtml(error.message)}</li>`;
    return;
  }

  timelineList.innerHTML = (data || []).map((event) => `
    <li>
      <strong>${escapeHtml(event.event_type)}</strong>
      <div>${escapeHtml(event.email || event.target_user_id || 'n/a')}</div>
      <small>${escapeHtml(fmtDate(event.created_at))}</small>
    </li>
  `).join('');
}

async function onTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const wrapper = button.closest('[data-user-id]');
  if (!wrapper) return;

  const userId = wrapper.getAttribute('data-user-id');
  const action = button.getAttribute('data-action');
  if (!userId || !action) return;

  const supabase = await getSupabaseClient();

  if (action === 'save-role') {
    const roleSelect = wrapper.querySelector('select[data-action="role"]');
    const role = roleSelect ? roleSelect.value : 'user';

    const { error } = await supabase.rpc('admin_set_member_role', {
      p_user_id: userId,
      p_role: role
    });

    setStatus(error ? `Role update failed: ${error.message}` : 'Role updated.', Boolean(error));
    await Promise.all([loadMembers(), loadTimeline()]);
    return;
  }

  if (action === 'soft-ban') {
    const shouldBan = button.textContent.toLowerCase().includes('soft ban');
    const reason = shouldBan ? window.prompt('Ban reason (required for audit):', 'Admin moderation') : '';

    const { error } = await supabase.rpc('admin_set_member_ban', {
      p_user_id: userId,
      p_banned: shouldBan,
      p_reason: reason || null
    });

    setStatus(error ? `Ban update failed: ${error.message}` : 'Ban status updated.', Boolean(error));
    await Promise.all([loadMembers(), loadTimeline()]);
    return;
  }

  if (action === 'hard-ban') {
    const reason = window.prompt('Hard ban reason (required):', 'Severe policy breach');
    if (!reason) return;

    const { data, error } = await supabase.functions.invoke('admin-hard-ban', {
      body: { userId, reason, confirm: true }
    });

    const failed = error || !data?.ok;
    setStatus(failed ? `Hard ban failed: ${error?.message || data?.error || 'unknown'}` : 'Hard ban applied.', failed);
    await Promise.all([loadMembers(), loadTimeline()]);
  }
}

async function onSendMessage(event) {
  event.preventDefault();
  const supabase = await getSupabaseClient();

  messageResult.textContent = 'Sending…';

  const { data, error } = await supabase.functions.invoke('send-admin-message', {
    body: {
      messageType: document.getElementById('messageType').value,
      subject: document.getElementById('messageSubject').value.trim(),
      body: document.getElementById('messageBody').value.trim(),
      onlyOptedIn: document.getElementById('messageOptInOnly').checked
    }
  });

  if (error || !data?.ok) {
    messageResult.textContent = `Send failed: ${error?.message || data?.error || 'unknown'}`;
    messageResult.style.color = '#ff9aa2';
    return;
  }

  messageResult.textContent = `Sent to ${data.sent} member(s).`;
  messageResult.style.color = '#8fd7ff';
  await loadTimeline();
}

async function bootstrap() {
  setStatus('Checking admin session…');
  const access = await ensureRole(ALLOWED_ROLES);
  if (!access) return;

  setStatus(`Signed in as ${access.role}.`);
  startAccessMonitor();

  await Promise.all([loadMembers(), loadTimeline()]);

  refreshButton.addEventListener('click', () => {
    loadMembers();
  });
  timelineRefresh.addEventListener('click', () => {
    loadTimeline();
  });
  bodyNode.addEventListener('click', onTableClick);
  messageForm.addEventListener('submit', onSendMessage);
}

initAdminNav({ pageLabel: 'Members', active: 'members' });
bootstrap().catch((error) => {
  setStatus(error?.message || 'Unable to load members admin page.', true);
});
