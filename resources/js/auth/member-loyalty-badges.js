import { getSupabaseClient } from './supabase-client.js';

const CSS_PATH = '/resources/css/member-loyalty-badges.css';
const DISCORD_URL = 'https://discord.gg/83Xw9ktAn4';

const TIERS = [
  { start: 1, name: 'New Member' },
  { start: 3, name: 'Regular Member' },
  { start: 6, name: 'Established Member' },
  { start: 12, name: 'One-Year Club' },
  { start: 24, name: 'Two-Year Club' },
  { start: 36, name: 'Long-Standing Member' },
  { start: 60, name: 'CCG Hall of Fame' }
];

const state = {
  displayName: 'CCG Member',
  joinedAt: null,
  month: 1,
  tier: TIERS[0]
};

function ensureStylesheet() {
  if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_PATH;
  document.head.appendChild(link);
}

function safeDate(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function earliestDate(...values) {
  const dates = values.map(safeDate).filter(Boolean);
  if (!dates.length) return null;
  return new Date(Math.min(...dates.map((date) => date.getTime())));
}

function addMonthsSafe(date, amount) {
  const result = new Date(date.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + amount);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

function completedMonths(joinedAt, now = new Date()) {
  let total = (now.getFullYear() - joinedAt.getFullYear()) * 12 + (now.getMonth() - joinedAt.getMonth());
  const anniversary = addMonthsSafe(joinedAt, total);
  if (now < anniversary) total -= 1;
  return Math.max(0, total);
}

function tierFor(month) {
  return [...TIERS].reverse().find((tier) => month >= tier.start) || TIERS[0];
}

function nextTierFor(month) {
  return TIERS.find((tier) => tier.start > month) || null;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function setStatus(message, mode = '') {
  const node = document.getElementById('memberLoyaltyShareStatus');
  if (!node) return;
  node.textContent = message;
  node.dataset.state = mode;
}

function progressForTier(month) {
  const current = tierFor(month);
  const next = nextTierFor(month);
  if (!next) return 100;
  const span = Math.max(1, next.start - current.start);
  return Math.max(0, Math.min(100, ((month - current.start + 1) / span) * 100));
}

function shareText() {
  const monthWord = state.month === 1 ? 'month' : 'months';
  return `${state.displayName} has been part of the Cheeky Commodore Gamer community for ${state.month} ${monthWord} and has earned the ${state.tier.name} badge. ${DISCORD_URL}`;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

function drawCenteredText(context, value, y, maxWidth) {
  context.fillText(String(value), 600, y, maxWidth);
}

function createBadgeBlob() {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('Canvas is unavailable.'));
      return;
    }

    const mode = document.documentElement.getAttribute('data-ccg-mode')
      || document.body.dataset.ccgMode
      || 'c64';
    const accent = mode === 'amiga' ? '#ff4fcb' : '#27d8ff';
    const secondary = mode === 'amiga' ? '#8b72ff' : '#6f82ff';

    const gradient = context.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#07101f');
    gradient.addColorStop(0.55, '#101933');
    gradient.addColorStop(1, '#050913');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1200, 630);

    context.strokeStyle = accent;
    context.lineWidth = 8;
    context.strokeRect(28, 28, 1144, 574);

    const glow = context.createRadialGradient(600, 285, 40, 600, 285, 430);
    glow.addColorStop(0, `${accent}55`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, 1200, 630);

    context.textAlign = 'center';
    context.fillStyle = '#ffffff';
    context.font = '700 34px Arial, sans-serif';
    drawCenteredText(context, 'CHEEKY COMMODORE GAMER', 92, 1080);

    context.fillStyle = accent;
    context.font = '800 128px Arial, sans-serif';
    drawCenteredText(context, `MONTH ${state.month}`, 280, 1050);

    context.fillStyle = '#ffffff';
    context.font = '700 50px Arial, sans-serif';
    drawCenteredText(context, state.tier.name, 365, 1000);

    context.fillStyle = secondary;
    context.font = '700 30px Arial, sans-serif';
    drawCenteredText(context, state.displayName, 430, 1000);

    context.fillStyle = 'rgba(255,255,255,0.78)';
    context.font = '400 25px Arial, sans-serif';
    drawCenteredText(context, 'A valued member of the CCG community', 490, 1000);
    drawCenteredText(context, 'cheekycommodoregamer.co.uk', 548, 1000);

    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Badge image could not be created.'));
    }, 'image/png');
  });
}

function downloadBlob(blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ccg-member-badge-month-${state.month}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function shareBadge() {
  setStatus('Preparing your badge…');
  try {
    const blob = await createBadgeBlob();
    const file = new File([blob], `ccg-member-badge-month-${state.month}.png`, {
      type: 'image/png'
    });
    const payload = {
      title: `CCG ${state.tier.name} badge`,
      text: shareText(),
      url: 'https://www.cheekycommodoregamer.co.uk/community/'
    };

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ ...payload, files: [file] });
      setStatus('Badge shared.', 'success');
      return;
    }

    await copyText(shareText());
    downloadBlob(blob);
    setStatus('Badge image downloaded and Discord text copied. Upload the image in Discord and paste the copied message.', 'success');
  } catch (error) {
    if (error?.name === 'AbortError') {
      setStatus('Sharing cancelled.');
      return;
    }
    console.error('[member-loyalty] Share failed', error);
    setStatus('The badge could not be prepared right now.', 'error');
  }
}

async function copyForDiscord() {
  try {
    await copyText(shareText());
    setStatus('Discord badge message copied.', 'success');
  } catch (error) {
    setStatus('The Discord message could not be copied.', 'error');
  }
}

function renderBadge() {
  const achievements = document.getElementById('memberAchievements');
  const badgeGrid = achievements?.querySelector('.member-achievements');
  if (!achievements || !badgeGrid || !state.joinedAt) return;

  document.getElementById('memberLoyaltyBadge')?.remove();

  const nextIncrement = addMonthsSafe(state.joinedAt, state.month);
  const nextTier = nextTierFor(state.month);
  const monthWord = state.month === 1 ? 'month' : 'months';
  const panel = document.createElement('article');
  panel.className = 'member-loyalty-badge';
  panel.id = 'memberLoyaltyBadge';
  panel.dataset.memberMonth = String(state.month);
  panel.dataset.memberTier = state.tier.name;
  panel.innerHTML = `
    <div class="member-loyalty-badge__mark" aria-label="Membership month ${state.month}">
      <p class="member-loyalty-badge__eyebrow">CCG loyalty badge</p>
      <strong class="member-loyalty-badge__month">${state.month}</strong>
      <span class="member-loyalty-badge__month-label">${monthWord}</span>
    </div>
    <div class="member-loyalty-badge__content">
      <h3 class="member-loyalty-badge__title">${state.tier.name}</h3>
      <p class="member-loyalty-badge__message">Thank you for being part of the Cheeky Commodore Gamer community. This badge advances by one every completed month of membership.</p>
      <div class="member-loyalty-badge__progress" aria-label="Progress towards the next loyalty tier"><span style="width:${progressForTier(state.month)}%"></span></div>
      <p class="member-loyalty-badge__next">Next monthly badge: ${formatDate(nextIncrement)}${nextTier ? ` · Next named tier at month ${nextTier.start}` : ' · Highest named tier reached'}</p>
      <div class="member-loyalty-badge__actions">
        <button type="button" class="auth-btn" id="memberShareLoyaltyBadge">Share badge</button>
        <button type="button" class="auth-btn" id="memberCopyLoyaltyBadge">Copy for Discord</button>
        <a class="auth-btn" href="${DISCORD_URL}" target="_blank" rel="noopener">Open Discord</a>
      </div>
      <p class="member-loyalty-badge__status" id="memberLoyaltyShareStatus" aria-live="polite"></p>
    </div>
  `;

  achievements.insertBefore(panel, badgeGrid);
  document.getElementById('memberShareLoyaltyBadge')
    ?.addEventListener('click', () => { void shareBadge(); });
  document.getElementById('memberCopyLoyaltyBadge')
    ?.addEventListener('click', () => { void copyForDiscord(); });
}

async function loadMemberDetails() {
  const client = await getSupabaseClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  const user = authData?.user;
  if (!user) return false;

  let profile = null;
  try {
    const { data, error } = await client
      .from('profiles')
      .select('display_name,username,created_at')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    profile = data;
  } catch (error) {
    console.warn('[member-loyalty] Profile details unavailable; using account creation date.', error);
  }

  state.displayName = String(
    profile?.display_name
    || profile?.username
    || user.user_metadata?.display_name
    || 'CCG Member'
  ).trim();

  state.joinedAt = earliestDate(profile?.created_at, user.created_at);
  if (!state.joinedAt) return false;

  state.month = completedMonths(state.joinedAt) + 1;
  state.tier = tierFor(state.month);
  return true;
}

async function init() {
  if (!document.getElementById('memberHub')) return;
  ensureStylesheet();
  try {
    if (await loadMemberDetails()) renderBadge();
  } catch (error) {
    console.warn('[member-loyalty] Badge could not be loaded.', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  void init();
}
