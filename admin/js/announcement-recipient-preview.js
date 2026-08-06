const PREVIEW_RPC = 'admin_announcement_recipient_counts';

function text(value) {
  return String(value ?? '').trim();
}

function setStatus(message, isError = false) {
  const node = document.getElementById('announceStatus');
  if (!node) return;
  node.textContent = message;
  node.dataset.state = isError ? 'error' : 'ok';
}

async function getSupabaseClient() {
  if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') {
    throw new Error('Supabase client bootstrap is unavailable on this page.');
  }
  return window.ccgSupabase.getClient();
}

function ensurePreviewNode() {
  let node = document.getElementById('announceRecipientPreview');
  if (node) return node;

  node = document.createElement('p');
  node.id = 'announceRecipientPreview';
  node.className = 'ccg-admin-hint';
  node.setAttribute('aria-live', 'polite');

  const optionsCard = document.getElementById('announceNotifyMembers')?.closest('.ccg-admin-card');
  const existingHint = optionsCard?.querySelector('.ccg-admin-hint');
  if (existingHint) existingHint.insertAdjacentElement('afterend', node);
  else optionsCard?.appendChild(node);

  return node;
}

function selectedContentType() {
  return text(document.getElementById('announceSendBtn')?.dataset.type || 'game').toLowerCase();
}

function preferenceDescription(type) {
  return type === 'game'
    ? 'new-game notifications'
    : 'video and Retro Special notifications';
}

let latestCounts = null;
let requestSequence = 0;
let allowNextSend = false;
let checkingBeforeSend = false;

async function loadRecipientCounts({ quiet = false } = {}) {
  const previewNode = ensurePreviewNode();
  const sendButton = document.getElementById('announceSendBtn');
  const slug = text(sendButton?.dataset.slug);
  const type = selectedContentType();
  const requestId = ++requestSequence;

  if (!slug) {
    latestCounts = null;
    previewNode.textContent = 'Eligible recipients: select live content first.';
    return null;
  }

  if (document.getElementById('announceTestEmail')?.checked) {
    latestCounts = { active: 1, optedIn: 1, eligible: 1, test: true, type };
    previewNode.textContent = 'Administrator test: 1 recipient.';
    return latestCounts;
  }

  if (!quiet) previewNode.textContent = 'Checking eligible recipients…';

  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc(PREVIEW_RPC, { p_content_type: type });
    if (requestId !== requestSequence) return null;
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    const counts = {
      active: Number(row?.active_members || 0),
      optedIn: Number(row?.opted_in_members || 0),
      eligible: Number(row?.eligible_recipients || 0),
      test: false,
      type
    };

    latestCounts = counts;
    previewNode.textContent = counts.eligible > 0
      ? `Eligible recipients: ${counts.eligible} of ${counts.active} active members (${counts.optedIn} have ${preferenceDescription(type)} enabled).`
      : `Eligible recipients: 0 of ${counts.active} active members. No members currently have ${preferenceDescription(type)} enabled with a confirmed email address.`;
    previewNode.dataset.state = counts.eligible > 0 ? 'ok' : 'warning';
    return counts;
  } catch (error) {
    if (requestId !== requestSequence) return null;
    latestCounts = null;
    console.error('[announce-preview] recipient count failed', error);
    previewNode.textContent = 'Recipient preview unavailable. Apply the Phase 20E SQL migration, then reload this page.';
    previewNode.dataset.state = 'error';
    return null;
  }
}

function observeSelection() {
  const sendButton = document.getElementById('announceSendBtn');
  if (!sendButton) return;

  const observer = new MutationObserver(() => {
    void loadRecipientCounts();
  });
  observer.observe(sendButton, {
    attributes: true,
    attributeFilter: ['data-slug', 'data-type']
  });
}

function observeResultMessage() {
  const status = document.getElementById('announceStatus');
  if (!status) return;

  const observer = new MutationObserver(() => {
    if (/Attempted:\s*0,\s*sent:\s*0,\s*failed:\s*0/i.test(status.textContent || '')) {
      const type = selectedContentType();
      status.textContent = `No email was sent. No eligible members currently have ${preferenceDescription(type)} enabled.`;
      status.dataset.state = 'error';
    }
  });
  observer.observe(status, { childList: true, characterData: true, subtree: true });
}

function bindRecipientChecks() {
  const sendButton = document.getElementById('announceSendBtn');
  const notifyMembers = document.getElementById('announceNotifyMembers');
  const testEmail = document.getElementById('announceTestEmail');
  if (!sendButton || !notifyMembers || !testEmail) return;

  notifyMembers.addEventListener('change', () => void loadRecipientCounts());
  testEmail.addEventListener('change', () => void loadRecipientCounts());

  sendButton.addEventListener('click', async (event) => {
    if (allowNextSend) {
      allowNextSend = false;
      return;
    }

    if (!notifyMembers.checked || testEmail.checked) return;
    if (checkingBeforeSend) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    checkingBeforeSend = true;

    try {
      const counts = await loadRecipientCounts({ quiet: true });
      if (!counts) {
        setStatus('Unable to verify eligible recipients. No member email was sent.', true);
        return;
      }

      if (counts.eligible < 1) {
        setStatus(
          `No email was sent. No eligible members currently have ${preferenceDescription(counts.type)} enabled.`,
          true
        );
        return;
      }

      allowNextSend = true;
      sendButton.click();
    } finally {
      checkingBeforeSend = false;
    }
  }, true);
}

function init() {
  if (!document.getElementById('announceSendBtn')) return;
  ensurePreviewNode();
  observeSelection();
  observeResultMessage();
  bindRecipientChecks();
  void loadRecipientCounts();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
