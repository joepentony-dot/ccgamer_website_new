// admin/js/member-hub-health.js
// Phase 12 — administrator-only live Member Hub deployment health report.

import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

const MIGRATION_ORDER = Object.freeze([
  '20260805_member_hub_cloud_library.sql',
  '20260805_member_hub_deletion_tombstones.sql',
  '20260805230000_member_hub_public_profiles_compatibility.sql',
  '20260805233000_member_badge_engine.sql',
  '20260805234500_member_public_profile_preview.sql',
  '20260806000500_member_submissions_admin_inbox.sql',
  '20260806003000_member_hub_health_check.sql'
]);

const state = {
  client: null,
  rows: [],
  loading: false
};

function text(value) {
  return String(value ?? '').trim();
}

function setStatus(message, mode = 'info') {
  const node = document.getElementById('memberHealthStatus');
  if (!node) return;
  node.textContent = message;
  node.dataset.state = mode;
}

function setAuthStatus(message, mode = 'info') {
  const node = document.querySelector('[data-admin-status]');
  if (!node) return;
  node.textContent = message;
  node.dataset.state = mode;
}

async function getGlobalSupabaseClient() {
  if (window.ccgSupabase && typeof window.ccgSupabase.getClient === 'function') {
    const result = window.ccgSupabase.getClient();
    return result && typeof result.then === 'function' ? await result : result;
  }
  return window.CCG_SUPABASE_CLIENT || null;
}

function appendText(parent, className, value, tagName = 'span') {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = value;
  parent.appendChild(node);
  return node;
}

function componentRow(row) {
  const item = document.createElement('article');
  item.className = `member-health__item ${row.ready ? 'is-ready' : 'is-missing'}`;
  item.dataset.componentKey = text(row.component_key);

  appendText(item, 'member-health__state', row.ready ? 'Ready' : 'Missing');
  appendText(item, 'member-health__label', text(row.component_label) || 'Member Hub component', 'strong');
  appendText(item, 'member-health__detail', text(row.detail) || 'No deployment detail supplied.');
  appendText(item, 'member-health__action', row.ready ? 'No action required' : text(row.action_file) || 'Review account foundation', 'code');
  return item;
}

function groupRows(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const category = text(row.category) || 'Other';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(row);
  });
  return groups;
}

function missingMigrationFiles() {
  const missing = new Set(
    state.rows
      .filter((row) => !row.ready)
      .map((row) => text(row.action_file))
      .filter((file) => file && file !== 'Existing account foundation')
  );

  return [...missing].sort((a, b) => {
    const aIndex = MIGRATION_ORDER.indexOf(a);
    const bIndex = MIGRATION_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b, 'en-GB');
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

function renderMigrationPlan() {
  const panel = document.getElementById('memberHealthMissingPanel');
  const list = document.getElementById('memberHealthMigrationList');
  if (!panel || !list) return;

  const files = missingMigrationFiles();
  panel.hidden = files.length === 0;
  list.replaceChildren();

  files.forEach((file) => {
    const item = document.createElement('li');
    const code = document.createElement('code');
    code.textContent = file;
    item.appendChild(code);
    list.appendChild(item);
  });
}

function renderSummary() {
  const total = state.rows.length;
  const ready = state.rows.filter((row) => row.ready).length;
  const missing = Math.max(0, total - ready);
  const percent = total ? Math.round((ready / total) * 100) : 0;

  const readyNode = document.getElementById('memberHealthReadyCount');
  const missingNode = document.getElementById('memberHealthMissingCount');
  const percentNode = document.getElementById('memberHealthPercent');
  if (readyNode) readyNode.textContent = String(ready);
  if (missingNode) missingNode.textContent = String(missing);
  if (percentNode) percentNode.textContent = `${percent}%`;
}

function renderHealth() {
  renderSummary();
  renderMigrationPlan();

  const host = document.getElementById('memberHealthGroups');
  if (!host) return;
  host.replaceChildren();

  if (!state.rows.length) {
    const empty = document.createElement('p');
    empty.className = 'member-health__empty';
    empty.textContent = 'No health components were returned.';
    host.appendChild(empty);
    return;
  }

  groupRows(state.rows).forEach((rows, category) => {
    const section = document.createElement('section');
    section.className = 'member-health__group';

    const heading = document.createElement('div');
    heading.className = 'member-health__group-heading';
    appendText(heading, '', category, 'h3');
    const ready = rows.filter((row) => row.ready).length;
    appendText(heading, '', `${ready} of ${rows.length} ready`);

    const items = document.createElement('div');
    items.className = 'member-health__items';
    rows.forEach((row) => items.appendChild(componentRow(row)));

    section.append(heading, items);
    host.appendChild(section);
  });

  const checkedAt = document.getElementById('memberHealthCheckedAt');
  if (checkedAt) {
    checkedAt.textContent = `Checked ${new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date())}`;
  }
}

async function runHealthCheck() {
  if (!state.client || state.loading) return;
  state.loading = true;
  setStatus('Checking live Member Hub database structure…', 'info');

  const button = document.getElementById('memberHealthRefresh');
  if (button) {
    button.disabled = true;
    button.textContent = 'Checking…';
  }

  try {
    const { data, error } = await state.client.rpc('admin_get_member_hub_health');
    if (error) throw error;

    state.rows = (Array.isArray(data) ? data : [])
      .map((row) => ({
        ...row,
        ready: row?.ready === true,
        sort_order: Number(row?.sort_order || 0)
      }))
      .sort((a, b) => a.sort_order - b.sort_order);

    renderHealth();
    const missing = state.rows.filter((row) => !row.ready).length;
    setStatus(
      missing
        ? `${missing} Member Hub ${missing === 1 ? 'component requires' : 'components require'} deployment work.`
        : 'All reported Member Hub database components are ready.',
      missing ? 'warning' : 'success'
    );
  } catch (error) {
    console.error('[member-hub-health] Health check failed', error);
    state.rows = [];
    renderHealth();
    setStatus('The health report is awaiting the Phase 12 Supabase migration.', 'error');
  } finally {
    state.loading = false;
    if (button) {
      button.disabled = false;
      button.textContent = 'Run health check';
    }
  }
}

async function copyMigrationList() {
  const files = missingMigrationFiles();
  if (!files.length) return;
  const payload = files.map((file, index) => `${index + 1}. ${file}`).join('\n');
  const button = document.getElementById('memberHealthCopyMigrations');

  try {
    await navigator.clipboard.writeText(payload);
    if (button) button.textContent = 'Migration list copied';
  } catch (error) {
    if (button) button.textContent = 'Copy unavailable';
  }

  window.setTimeout(() => {
    if (button) button.textContent = 'Copy migration list';
  }, 1800);
}

function bindControls() {
  document.getElementById('memberHealthRefresh')?.addEventListener('click', () => {
    void runHealthCheck();
  });
  document.getElementById('memberHealthCopyMigrations')?.addEventListener('click', () => {
    void copyMigrationList();
  });
}

async function init() {
  try {
    setAuthStatus('Checking administrator session…', 'info');
    const access = await ensureRole(['admin', 'superadmin']);
    if (!access) return;

    document.documentElement.dataset.memberHubHealthGate = 'granted';
    setAuthStatus('Signed in', 'success');
    await initAdminNav({ active: 'health', pageLabel: 'Member Hub Health' });
    await startAccessMonitor();

    state.client = await getGlobalSupabaseClient();
    if (!state.client || typeof state.client.rpc !== 'function') {
      throw new Error('Supabase RPC client is unavailable.');
    }

    bindControls();
    await runHealthCheck();
  } catch (error) {
    console.error('[member-hub-health] Initialisation failed', error);
    setAuthStatus('Administrator access could not be verified.', 'error');
    setStatus(error?.message || 'The Member Hub health report could not be started.', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  void init();
}
