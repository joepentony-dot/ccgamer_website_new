const CSS_PATH = '/resources/css/member-public-profile-preview.css';
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9-]{2,30}$/;

let observer = null;

function text(value) {
  return String(value ?? '').trim();
}

function ensureStylesheet() {
  if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_PATH;
  document.head.appendChild(link);
}

function visitorUrl(username) {
  if (!USERNAME_PATTERN.test(username)) return '/community/member.html?preview=1';
  return `/community/member.html?u=${encodeURIComponent(username)}`;
}

function item(label, value) {
  const node = document.createElement('li');
  const title = document.createElement('strong');
  title.textContent = `${label}: `;
  const detail = document.createElement('span');
  detail.textContent = value;
  node.append(title, detail);
  return node;
}

function ensurePrivacySummary() {
  const form = document.getElementById('memberPublicProfileForm');
  const checks = form?.querySelector('.member-public-form__checks');
  if (!form || !checks) return null;

  let panel = document.getElementById('memberPublicPrivacySummary');
  if (panel) return panel;

  panel = document.createElement('aside');
  panel.className = 'member-public-privacy-summary';
  panel.id = 'memberPublicPrivacySummary';
  panel.innerHTML = `
    <div class="member-public-privacy-summary__header">
      <strong>Visitor-facing preview</strong>
      <span id="memberPublicVisibilityState">Private</span>
    </div>
    <ul id="memberPublicPrivacyList"></ul>
    <p><strong>Never included:</strong> email address, private notes, unshared lists, private activity history or account controls.</p>
  `;
  checks.insertAdjacentElement('afterend', panel);
  return panel;
}

function updateSummary() {
  const panel = ensurePrivacySummary();
  if (!panel) return;

  const username = text(document.getElementById('memberPublicUsername')?.value).toLowerCase();
  const bio = text(document.getElementById('memberPublicBio')?.value);
  const enabled = Boolean(document.getElementById('memberPublicEnabled')?.checked);
  const showTopPicks = Boolean(document.getElementById('memberShowTopPicks')?.checked);
  const showBadges = Boolean(document.getElementById('memberShowBadges')?.checked);
  const listKey = document.getElementById('memberPublicListKey')?.value || 'none';
  const listTitle = text(document.getElementById('memberPublicListTitle')?.value) || 'My CCG Collection';

  const stateNode = document.getElementById('memberPublicVisibilityState');
  if (stateNode) {
    stateNode.textContent = enabled ? 'Public after saving' : 'Private';
    stateNode.dataset.state = enabled ? 'public' : 'private';
  }

  const list = document.getElementById('memberPublicPrivacyList');
  if (list) {
    list.replaceChildren(
      item('Public username', USERNAME_PATTERN.test(username) ? `@${username}` : 'Not ready'),
      item('Bio', bio ? 'Shown' : 'No public bio'),
      item('Top Picks', showTopPicks ? 'Shown' : 'Hidden'),
      item('Activity badges', showBadges ? 'Shown' : 'Hidden'),
      item('Shared game list', listKey === 'none' ? 'None' : `${listTitle} (${listKey})`)
    );
  }

  const openLink = document.getElementById('memberOpenPublicProfile');
  if (openLink) {
    openLink.href = enabled && USERNAME_PATTERN.test(username)
      ? visitorUrl(username)
      : '/community/member.html?preview=1';
    openLink.textContent = enabled && USERNAME_PATTERN.test(username)
      ? 'Open public profile'
      : 'Preview private settings';
  }
}

function bindForm() {
  const form = document.getElementById('memberPublicProfileForm');
  if (!form || form.dataset.phase9PreviewBound === 'true') return false;

  form.dataset.phase9PreviewBound = 'true';
  ensurePrivacySummary();
  form.addEventListener('input', updateSummary);
  form.addEventListener('change', updateSummary);
  form.addEventListener('submit', () => window.setTimeout(updateSummary, 400));
  updateSummary();
  return true;
}

function init() {
  if (!document.getElementById('memberHub')) return;
  ensureStylesheet();
  if (bindForm()) return;

  observer = new MutationObserver(() => {
    if (!bindForm()) return;
    observer?.disconnect();
    observer = null;
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(() => {
    observer?.disconnect();
    observer = null;
  }, 10000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
