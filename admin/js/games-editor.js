const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';

/* -------------------- CONSTANTS -------------------- */

const REQUIRED_GENRE_VALUES = [
  'action adventure',
  'adventure',
  'arcade',
  'casino games',
  'fighting games',
  'horror',
  'miscellaneous',
  'platform',
  'puzzle',
  'racing',
  'role playing',
  'quiz',
  'shooting',
  'sports',
  'strategy'
];

const REQUIRED_COLLECTION_VALUES = [
  'cartridge',
  'licensed',
  'banned',
  'top picks',
  'retro events'
];

const EMPTY_DRAFT = {
  title: '',
  system: '',
  year: '',
  slug: '',
  id: '',
  genres: [],
  description: '',
  ccg_rating: 6,
  ccg_rating_reason: '',
  videoId: '',
  collections: [],
  pdf: '',
  disk: '',
  creditsPublisher: '',
  creditsDeveloper: '',
  creditsCoder: '',
  creditsGraphics: '',
  creditsMusic: '',
  creditsReReleaser: '',
  thumbnail: '',
  box3d: '',
  externalLinks: '',
  jsonExportMode: 'full',
  notifyMembers: false,
  sendTestEmail: false
};

/* -------------------- STATE -------------------- */

const state = {
  step: 1,
  library: [],
  slugSet: new Set(),
  idSet: new Set(),
  genres: [],
  collections: [],
  packageData: null,
  slugTouched: false,
  idTouched: false,
  draft: { ...EMPTY_DRAFT }
};

/* -------------------- DOM CACHE -------------------- */

const el = {
  topStatus: document.querySelector('[data-top-status]'),
  fetchLibraryButton: document.querySelector('[data-action="fetch-library"]'),
  stepSections: Array.from(document.querySelectorAll('[data-step]')),
  jumpButtons: Array.from(document.querySelectorAll('[data-step-jump]')),
  fields: Array.from(document.querySelectorAll('[data-field]')),
  genreOptions: document.querySelector('[data-genre-options]'),
  collectionOptions: document.querySelector('[data-collection-options]'),
  inlineGenreError: document.querySelector('[data-inline-error="genres"]'),
  inlineCollectionError: document.querySelector('[data-inline-error="collections"]'),
  inlineNewCategoryError: document.querySelector('[data-inline-error="new-category"]'),
  newCategoryInput: document.querySelector('[data-new-category-input]'),
  newCategoryButton: document.querySelector('[data-new-category-button]'),
  step1Errors: document.querySelector('[data-errors-step1]'),
  step2Errors: document.querySelector('[data-errors-step2]'),
  step3Errors: document.querySelector('[data-errors-step3]'),
  previewEntry: document.querySelector('[data-preview-entry]'),
  previewSitemap: document.querySelector('[data-preview-sitemap]'),
  previewRating: document.querySelector('[data-preview-rating]'),
  previewRatingReason: document.querySelector('[data-preview-rating-reason]'),
  previewFileFlat: document.querySelector('[data-preview-file-flat]'),
  previewFileFolder: document.querySelector('[data-preview-file-folder]'),
  previewGamesJsonPath: document.querySelector('[data-preview-games-json-path]'),
  downloadStatus: document.querySelector('[data-download-status]'),
  nextButtons: Array.from(document.querySelectorAll('[data-action="next"]')),
  backButtons: Array.from(document.querySelectorAll('[data-action="back"]')),
  downloadButton: document.querySelector('[data-action="download"]')
};

/* -------------------- INIT -------------------- */

init();

async function init() {
  bindEvents();
  await loadLibrary();
  renderStep();
}

/* -------------------- NOTIFICATION SEND -------------------- */

async function maybeSendNewGameNotifications(packageData) {
  const validationError = validateNotificationRequest(packageData);
  if (validationError) {
    setDownloadStatus(
      `Warning: Download started, but notifications were not sent: ${validationError}`,
      false,
      true
    );
    return;
  }

  try {
    if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') {
      throw new Error('Admin auth client not ready.');
    }

    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      throw new Error('Unable to obtain admin access token.');
    }

    const functionBase = String(window.CCG_SUPABASE_URL || '').replace(/\/+$/, '');
    const functionUrl = `${functionBase}/functions/v1/send-new-game-notification`;
    const anonKey = String(window.CCG_SUPABASE_ANON_KEY || '').trim();

    const absoluteThumbnailUrl = (() => {
      const thumb = packageData.gameEntry.thumbnail || '';
      if (!thumb) return '';
      return thumb.startsWith('http')
        ? thumb
        : `${SITE_ORIGIN}/${thumb.replace(/^\/+/, '')}`;
    })();

    const payload = {
      user_id: accessToken, // user resolved server-side
      game_name: packageData.gameEntry.title,
      game_slug: packageData.slug,
      game_thumbnail: absoluteThumbnailUrl,
      mode: packageData.notifyMembers ? 'coming_soon_members' : 'coming_soon'
    };

    if (packageData.sendTestEmail) {
      payload.test_email = true;
    }

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: 'Bearer ' + accessToken
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        String(responseData?.error || `Edge function request failed (${response.status}).`)
      );
    }

    const sentCount = Number(responseData?.sent || 0);
    const failed = Number(responseData?.failed || 0);

    if (failed > 0) {
      setDownloadStatus(
        `Warning: Notification sent to ${sentCount} recipients (${failed} failed).`,
        false,
        true
      );
      return;
    }

    setDownloadStatus(`Coming Soon notification sent to ${sentCount} recipients.`, false);
  } catch (error) {
    setDownloadStatus(
      `Warning: Download started, but notification sending failed: ${error.message}`,
      false,
      true
    );
  }
}

/* -------------------- AUTH TOKEN HELPER -------------------- */

async function getAdminAccessToken() {
  try {
    const client = await window.ccgSupabase.getClient();
    const { data, error } = await client.auth.getSession();
    if (error || !data?.session?.access_token) return null;
    return data.session.access_token;
  } catch {
    return null;
  }
}

/* -------------------- VALIDATION -------------------- */

function validateNotificationRequest(packageData) {
  if (!packageData.notifyMembers && !packageData.sendTestEmail) {
    return 'notification options are not enabled.';
  }
  if (!packageData.slug) return 'slug is required.';
  if (!packageData.gameEntry?.title) return 'title is required.';
  if (!window.CCG_SUPABASE_URL) return 'Supabase URL is missing.';
  if (!window.CCG_SUPABASE_ANON_KEY) return 'Supabase anon key is missing.';
  return '';
}

/* -------------------- STATUS -------------------- */

function setDownloadStatus(message, isError = false, isWarning = false) {
  if (!el.downloadStatus) return;
  el.downloadStatus.textContent = message;
  if (isWarning) {
    el.downloadStatus.className = 'status';
  } else {
    el.downloadStatus.className = `status ${isError ? 'error' : 'ok'}`;
  }
}

/* -------------------- PLACEHOLDER -------------------- */
/* (Remaining helper / UI / validation code is unchanged) */