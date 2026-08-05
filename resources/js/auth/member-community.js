import { getSupabaseClient } from './supabase-client.js';

const CSS_PATH = '/resources/css/member-community.css';
const MISSING_SCHEMA_CODES = new Set(['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205']);
const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{2,30}$/;

const state = {
  client: null,
  user: null,
  profile: null
};

function text(value) {
  return String(value ?? '').trim();
}

function isMissingSchema(error) {
  return MISSING_SCHEMA_CODES.has(String(error?.code || ''));
}

function ensureStylesheet() {
  if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_PATH;
  document.head.appendChild(link);
}

function publicProfileUrl(username) {
  return `${window.location.origin}/community/member.html?u=${encodeURIComponent(username)}`;
}

function setStatus(id, message, mode = '') {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = message;
  node.dataset.state = mode;
}

function ensurePublicSettings() {
  const settings = document.getElementById('memberSettings');
  const actions = settings?.querySelector('.profile-actions');
  if (!settings || !actions || document.getElementById('memberPublicSettings')) return;

  const panel = document.createElement('section');
  panel.className = 'member-public-settings';
  panel.id = 'memberPublicSettings';
  panel.innerHTML = `
    <h3>Optional Public Profile</h3>
    <p class="member-public-settings__intro">Your profile remains private unless you switch this on. Email, notes, activity history and unshared game lists are never included.</p>
    <form class="member-public-form" id="memberPublicProfileForm">
      <div class="member-public-form__grid">
        <label>Public username
          <input id="memberPublicUsername" type="text" maxlength="31" autocomplete="off" placeholder="e.g. c64-fan" aria-describedby="memberPublicUsernameHelp">
          <span id="memberPublicUsernameHelp" class="member-community-status">Lowercase letters, numbers and hyphens; 3–31 characters.</span>
        </label>
        <label>Share one personal list
          <select id="memberPublicListKey">
            <option value="none">Do not share a list</option>
            <option value="played">Played</option>
            <option value="want">Want to Play</option>
            <option value="owned">Owned as a Kid</option>
            <option value="still">Still Own</option>
          </select>
        </label>
      </div>
      <label>Public bio
        <textarea id="memberPublicBio" maxlength="600" placeholder="A short Commodore introduction for your public page."></textarea>
      </label>
      <label>Public collection title
        <input id="memberPublicListTitle" type="text" maxlength="80" placeholder="My CCG Collection">
      </label>
      <div class="member-public-form__checks">
        <label><input id="memberPublicEnabled" type="checkbox"> Make my profile public</label>
        <label><input id="memberShowTopPicks" type="checkbox"> Show my Top Picks</label>
        <label><input id="memberShowBadges" type="checkbox"> Show account badges</label>
      </div>
      <div class="member-public-form__actions">
        <button class="auth-btn" type="submit">Save public profile</button>
        <button class="auth-btn" id="memberCopyPublicLink" type="button">Copy public link</button>
        <a class="auth-btn" id="memberOpenPublicProfile" href="/community/member.html" target="_blank" rel="noopener">Preview profile</a>
      </div>
      <p class="member-public-link" id="memberPublicLink"></p>
      <p class="member-community-status" id="memberPublicProfileStatus" aria-live="polite"></p>
    </form>
  `;
  settings.insertBefore(panel, actions);
}

function ensureSubmissionPanel() {
  const community = document.getElementById('memberCommunity');
  if (!community || document.getElementById('memberSubmissionPanel')) return;

  const panel = document.createElement('section');
  panel.className = 'member-submission-panel';
  panel.id = 'memberSubmissionPanel';
  panel.innerHTML = `
    <h3>Send a Game Suggestion or Correction</h3>
    <p class="member-submission-panel__intro">Send a private note to CCG. Your submissions are visible only from your account and to the site administrator.</p>
    <form class="member-submission-form" id="memberSubmissionForm">
      <div class="member-submission-form__grid">
        <label>Type
          <select id="memberSubmissionType">
            <option value="game_suggestion">Game suggestion</option>
            <option value="correction">Game information correction</option>
            <option value="site_feedback">Website feedback</option>
          </select>
        </label>
        <label>Game slug or title (optional)
          <input id="memberSubmissionGame" type="text" maxlength="120" placeholder="e.g. paradroid">
        </label>
      </div>
      <label>Subject
        <input id="memberSubmissionSubject" type="text" minlength="3" maxlength="120" required>
      </label>
      <label>Message
        <textarea id="memberSubmissionMessage" minlength="10" maxlength="3000" required></textarea>
      </label>
      <div class="member-submission-form__actions">
        <button class="auth-btn" type="submit">Send to CCG</button>
        <span class="member-community-status" id="memberSubmissionStatus" aria-live="polite"></span>
      </div>
    </form>
    <div class="member-submission-history" id="memberSubmissionHistory"></div>
  `;
  community.appendChild(panel);
}

function renderPublicLink(username, isPublic) {
  const linkNode = document.getElementById('memberPublicLink');
  const openLink = document.getElementById('memberOpenPublicProfile');
  const copyButton = document.getElementById('memberCopyPublicLink');
  if (!username) {
    linkNode?.classList.remove('is-visible');
    if (openLink) openLink.hidden = true;
    if (copyButton) copyButton.disabled = true;
    return;
  }

  const url = publicProfileUrl(username);
  if (linkNode) {
    linkNode.textContent = isPublic ? url : `${url} — hidden until the public-profile switch is enabled`;
    linkNode.classList.add('is-visible');
  }
  if (openLink) {
    openLink.href = url;
    openLink.hidden = false;
  }
  if (copyButton) copyButton.disabled = false;
}

function populatePublicForm(profile) {
  document.getElementById('memberPublicUsername').value = profile.username || '';
  document.getElementById('memberPublicBio').value = profile.public_bio || '';
  document.getElementById('memberPublicEnabled').checked = Boolean(profile.is_public);
  document.getElementById('memberShowTopPicks').checked = profile.show_top_picks !== false;
  document.getElementById('memberShowBadges').checked = profile.show_badges !== false;
  document.getElementById('memberPublicListKey').value = profile.public_list_key || 'none';
  document.getElementById('memberPublicListTitle').value = profile.public_list_title || 'My CCG Collection';
  renderPublicLink(profile.username, profile.is_public);
}

async function loadProfile() {
  const { data, error } = await state.client
    .from('profiles')
    .select('username,display_name,is_public,public_bio,show_top_picks,show_badges,public_list_key,public_list_title')
    .eq('id', state.user.id)
    .maybeSingle();
  if (error) throw error;
  state.profile = data || {};
  populatePublicForm(state.profile);
}

async function savePublicProfile(event) {
  event.preventDefault();
  const username = text(document.getElementById('memberPublicUsername')?.value).toLowerCase();
  if (!HANDLE_PATTERN.test(username)) {
    setStatus('memberPublicProfileStatus', 'Use 3–31 lowercase letters, numbers or hyphens, beginning with a letter or number.', 'error');
    return;
  }

  const payload = {
    username,
    public_bio: text(document.getElementById('memberPublicBio')?.value).slice(0, 600),
    is_public: Boolean(document.getElementById('memberPublicEnabled')?.checked),
    show_top_picks: Boolean(document.getElementById('memberShowTopPicks')?.checked),
    show_badges: Boolean(document.getElementById('memberShowBadges')?.checked),
    public_list_key: document.getElementById('memberPublicListKey')?.value || 'none',
    public_list_title: text(document.getElementById('memberPublicListTitle')?.value).slice(0, 80) || 'My CCG Collection'
  };

  setStatus('memberPublicProfileStatus', 'Saving public-profile settings…');
  const { data, error } = await state.client
    .from('profiles')
    .update(payload)
    .eq('id', state.user.id)
    .select('username,display_name,is_public,public_bio,show_top_picks,show_badges,public_list_key,public_list_title')
    .single();

  if (error) {
    const duplicate = String(error.code || '') === '23505';
    setStatus('memberPublicProfileStatus', duplicate ? 'That public username is already in use.' : 'The public profile could not be saved.', 'error');
    return;
  }

  state.profile = data;
  populatePublicForm(data);
  setStatus('memberPublicProfileStatus', data.is_public ? 'Public profile saved and visible.' : 'Settings saved. Your profile remains private.', 'success');
}

async function copyPublicLink() {
  const username = text(document.getElementById('memberPublicUsername')?.value).toLowerCase();
  if (!HANDLE_PATTERN.test(username)) return;
  const url = publicProfileUrl(username);
  try {
    await navigator.clipboard.writeText(url);
    setStatus('memberPublicProfileStatus', 'Public-profile link copied.', 'success');
  } catch (error) {
    setStatus('memberPublicProfileStatus', url, '');
  }
}

function activityLabel(row) {
  if (row.type === 'rating') return `Rated ${row.game_slug || 'a game'} ${row.rating}/10`;
  if (row.type === 'comment') return `Commented on ${row.game_slug || 'a game'}`;
  if (row.type === 'badge') return `Earned badge: ${text(row.badge_key).replace(/[-_]+/g, ' ')}`;
  return 'Member activity';
}

async function loadAccountActivity() {
  try {
    const { data, error } = await state.client.rpc('get_my_member_activity', { row_limit: 12 });
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) return;

    const host = document.getElementById('memberActivityFeed');
    if (!host) return;
    host.replaceChildren();
    const list = document.createElement('ul');
    list.className = 'member-activity-list';
    rows.forEach((row) => {
      const item = document.createElement('li');
      item.className = 'member-activity-item';
      item.textContent = activityLabel(row);
      list.appendChild(item);
    });
    host.appendChild(list);

    const badges = rows.filter((row) => row.type === 'badge' && row.badge_key);
    if (badges.length) {
      const achievements = document.getElementById('memberAchievements');
      const badgeHost = document.createElement('div');
      badgeHost.className = 'member-server-badges';
      badges.forEach((row) => {
        const badge = document.createElement('span');
        badge.className = 'member-server-badge';
        badge.textContent = text(row.badge_key).replace(/[-_]+/g, ' ');
        badgeHost.appendChild(badge);
      });
      achievements?.appendChild(badgeHost);
    }
  } catch (error) {
    if (!isMissingSchema(error)) console.warn('[member-community] Account activity unavailable', error);
  }
}

function submissionLabel(type) {
  if (type === 'game_suggestion') return 'Game suggestion';
  if (type === 'correction') return 'Correction';
  return 'Website feedback';
}

function renderSubmissionHistory(rows) {
  const host = document.getElementById('memberSubmissionHistory');
  if (!host) return;
  host.replaceChildren();
  rows.slice(0, 5).forEach((row) => {
    const item = document.createElement('article');
    item.className = 'member-submission-history__item';
    const title = document.createElement('strong');
    title.textContent = row.subject;
    const meta = document.createElement('span');
    meta.className = 'member-submission-history__meta';
    const date = new Date(row.created_at).toLocaleDateString('en-GB');
    meta.textContent = `${submissionLabel(row.submission_type)} · ${row.status} · ${date}`;
    item.append(title, meta);
    host.appendChild(item);
  });
}

async function loadSubmissions() {
  try {
    const { data, error } = await state.client
      .from('member_submissions')
      .select('id,submission_type,subject,status,created_at')
      .eq('profile_id', state.user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    renderSubmissionHistory(Array.isArray(data) ? data : []);
  } catch (error) {
    if (!isMissingSchema(error)) console.warn('[member-community] Submission history unavailable', error);
  }
}

async function submitMemberMessage(event) {
  event.preventDefault();
  const payload = {
    profile_id: state.user.id,
    submission_type: document.getElementById('memberSubmissionType')?.value || 'game_suggestion',
    game_slug: text(document.getElementById('memberSubmissionGame')?.value) || null,
    subject: text(document.getElementById('memberSubmissionSubject')?.value),
    message: text(document.getElementById('memberSubmissionMessage')?.value)
  };

  if (payload.subject.length < 3 || payload.message.length < 10) {
    setStatus('memberSubmissionStatus', 'Add a subject and at least ten characters of detail.', 'error');
    return;
  }

  setStatus('memberSubmissionStatus', 'Sending…');
  const { error } = await state.client.from('member_submissions').insert(payload);
  if (error) {
    setStatus('memberSubmissionStatus', isMissingSchema(error) ? 'Submissions are awaiting the database migration.' : 'The submission could not be sent.', 'error');
    return;
  }

  event.currentTarget.reset();
  setStatus('memberSubmissionStatus', 'Sent to CCG.', 'success');
  await loadSubmissions();
}

function bindControls() {
  document.getElementById('memberPublicProfileForm')?.addEventListener('submit', (event) => {
    void savePublicProfile(event);
  });
  document.getElementById('memberCopyPublicLink')?.addEventListener('click', () => {
    void copyPublicLink();
  });
  document.getElementById('memberPublicUsername')?.addEventListener('input', (event) => {
    const username = text(event.target.value).toLowerCase();
    event.target.value = username.replace(/[^a-z0-9-]/g, '');
    renderPublicLink(event.target.value, Boolean(document.getElementById('memberPublicEnabled')?.checked));
  });
  document.getElementById('memberPublicEnabled')?.addEventListener('change', () => {
    renderPublicLink(text(document.getElementById('memberPublicUsername')?.value), Boolean(document.getElementById('memberPublicEnabled')?.checked));
  });
  document.getElementById('memberSubmissionForm')?.addEventListener('submit', (event) => {
    void submitMemberMessage(event);
  });
}

async function init() {
  if (!document.getElementById('memberHub')) return;
  ensureStylesheet();
  ensurePublicSettings();
  ensureSubmissionPanel();
  bindControls();

  try {
    state.client = await getSupabaseClient();
    const { data, error } = await state.client.auth.getUser();
    if (error) throw error;
    state.user = data?.user || null;
    if (!state.user) return;

    try {
      await loadProfile();
    } catch (error) {
      if (isMissingSchema(error)) setStatus('memberPublicProfileStatus', 'Public profiles are awaiting the database migration.', 'error');
      else throw error;
    }
    await Promise.all([loadAccountActivity(), loadSubmissions()]);
  } catch (error) {
    console.error('[member-community] Initialisation failed', error);
    setStatus('memberPublicProfileStatus', 'Member community tools could not be loaded.', 'error');
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
