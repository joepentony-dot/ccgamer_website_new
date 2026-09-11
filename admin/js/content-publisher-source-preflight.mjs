const SOURCE_MIN_WORDS = 40;
const THUMBNAIL_PREFIX = 'resources/images/thumbnails/all/';
const LEMON_HOSTS = {
  C64: 'lemon64.com',
  AMIGA: 'lemonamiga.com'
};

export function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function normaliseList(value) {
  const items = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean))];
}

function joinNatural(items) {
  const list = normaliseList(items);
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, and ${list.at(-1)}`;
}

function platformDetails(system) {
  return String(system || '').toUpperCase() === 'AMIGA'
    ? { long: 'Commodore Amiga', short: 'Amiga' }
    : { long: 'Commodore 64 (C64)', short: 'C64' };
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export function defaultThumbnailPathForSlug(value) {
  const slug = slugify(value);
  return slug ? `${THUMBNAIL_PREFIX}${slug}.webp` : '';
}

export function generateGameSourceDescription(source) {
  const title = String(source?.title || '').trim();
  const system = String(source?.system || '').toUpperCase();
  const year = Number(source?.year);
  const publishers = normaliseList(source?.publisher);
  const developer = String(source?.developer || '').trim();
  const genres = normaliseList(source?.genres);

  if (!title || !['C64', 'AMIGA'].includes(system) || !Number.isInteger(year) || !publishers.length) return '';

  const platform = platformDetails(system);
  const sentences = [
    `${title} is a ${year} ${platform.long} game published by ${joinNatural(publishers)}.`
  ];

  if (developer && !publishers.some((publisher) => publisher.toLowerCase() === developer.toLowerCase())) {
    sentences.push(`${developer} is recorded as the developer.`);
  }

  if (genres.length) {
    sentences.push(`It is catalogued on the Cheeky Commodore Gamer site under ${joinNatural(genres)}, placing it among ${platform.short} releases from ${year}.`);
  } else {
    sentences.push(`It is catalogued as part of the Cheeky Commodore Gamer ${platform.short} archive for ${year}.`);
  }

  sentences.push(
    'The game page brings together the CCG rating, video coverage, verified magazine review scores where available, creator credits, artwork, and manual or authorised download information when those sources have been established.'
  );
  sentences.push(
    `Later re-release labels are kept separate from the publisher details for this ${year} release, helping distinguish the version catalogued here from subsequent issues.`
  );

  return sentences.join(' ').replace(/\s+/g, ' ').trim();
}

export function detectReleaseYear(description) {
  const text = String(description || '');
  const patterns = [
    /\b(?:released|published|launched)(?:\s+[A-Za-z’'&.-]+){0,6}\s+(?:in\s+)?((?:19|20)\d{2})\b/i,
    /\b((?:19|20)\d{2})\s+(?:Commodore\s+64|C64|Commodore\s+Amiga|Amiga)\b/i,
    /\b(?:Commodore\s+64|C64|Commodore\s+Amiga|Amiga)(?:\s+[A-Za-z’'&.-]+){0,4}\s+(?:from|released\s+in)\s+((?:19|20)\d{2})\b/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

export function validateLemonSourceUrl(value, system = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    const expectedHost = LEMON_HOSTS[String(system || '').toUpperCase()] || '';
    if (!Object.values(LEMON_HOSTS).includes(host)) return 'Lemon source must use lemon64.com or lemonamiga.com.';
    if (expectedHost && host !== expectedHost) {
      return `${system.toUpperCase()} games must use the matching ${expectedHost} game page.`;
    }
    if (!/^\/game\/[^/]+\/?$/i.test(url.pathname)) return 'Lemon source must be a direct /game/... page.';
    if (!['http:', 'https:'].includes(url.protocol)) return 'Lemon source must use HTTP or HTTPS.';
    return '';
  } catch {
    return 'Lemon source URL is not valid.';
  }
}

export function validateGamePublisherSource(source) {
  const errors = [];
  const system = String(source?.system || '').toUpperCase();
  const year = Number(source?.year);
  const description = String(source?.description || '').trim();
  const thumbnail = String(source?.thumbnail || '').trim();

  if (!['C64', 'AMIGA'].includes(system)) errors.push('Choose C64 or AMIGA before publishing.');
  if (!Number.isInteger(year) || year < 1970 || year > 2100) errors.push('Enter a valid release year.');

  const words = wordCount(description);
  if (words < SOURCE_MIN_WORDS) {
    errors.push(`Description must contain at least ${SOURCE_MIN_WORDS} words so publishing can recover if YouTube metadata is unavailable. Current count: ${words}.`);
  }
  if (words > 165) errors.push('Description must be 165 words or fewer for the archive fallback.');
  if (description && !/[.!?][”"']?$/.test(description)) errors.push('Description must end at a sentence boundary.');

  const statedYear = detectReleaseYear(description);
  if (statedYear && Number.isInteger(year) && statedYear !== year) {
    errors.push(`Release year conflict: the Year field says ${year}, but the description identifies the release as ${statedYear}. Resolve this before publishing.`);
  }

  if (!thumbnail.startsWith(THUMBNAIL_PREFIX) || !/\.(?:png|jpe?g|webp)$/i.test(thumbnail)) {
    errors.push(`Thumbnail path must point to an image inside ${THUMBNAIL_PREFIX}`);
  }

  const lemonError = validateLemonSourceUrl(source?.lemonUrl, system);
  if (lemonError) errors.push(lemonError);

  return errors;
}

function field(name) {
  return document.querySelector(`[data-game-field="${name}"]`);
}

function selectedGenres() {
  return Array.from(document.querySelectorAll('[data-game-genres] input[type="checkbox"]:checked'))
    .map((input) => String(input.value || '').trim())
    .filter(Boolean);
}

function sourceFactsFromForm() {
  return {
    title: field('title')?.value,
    system: field('system')?.value,
    year: field('year')?.value,
    publisher: field('publisher')?.value,
    developer: field('developer')?.value,
    genres: selectedGenres()
  };
}

function renderDescriptionStatus(message, state = '') {
  const node = document.querySelector('[data-game-description-generator-status]');
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function generateDescriptionIntoForm() {
  const description = field('description');
  if (!description) return false;
  if (String(description.value || '').trim()) {
    renderDescriptionStatus('Existing description kept unchanged. Clear it first if you want the factual fallback regenerated.', 'idle');
    return true;
  }

  const generated = generateGameSourceDescription(sourceFactsFromForm());
  if (!generated) {
    renderDescriptionStatus('Enter title, system, year and publisher first, then generate the fallback description.', 'warning');
    return false;
  }

  description.value = generated;
  description.dispatchEvent(new Event('input', { bubbles: true }));
  description.dispatchEvent(new Event('change', { bubbles: true }));
  renderDescriptionStatus(`Factual fallback generated from entered release data (${wordCount(generated)} words). You can edit it before publishing.`, 'ok');
  return true;
}

function installDescriptionAutomation() {
  const description = field('description');
  const label = description?.closest('label');
  if (!description || !label || document.querySelector('[data-generate-game-description]')) return;

  description.required = false;
  description.removeAttribute('required');
  const textNode = Array.from(label.childNodes).find((node) => node.nodeType === 3 && String(node.textContent || '').trim());
  if (textNode) textNode.nodeValue = 'Description (optional — generated if blank)\n          ';

  const controls = document.createElement('div');
  controls.className = 'publisher-header-actions';
  controls.dataset.gameDescriptionAutomation = 'true';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ccg-btn ccg-btn--ghost';
  button.dataset.generateGameDescription = 'true';
  button.textContent = 'Generate factual description';
  button.addEventListener('click', () => generateDescriptionIntoForm());

  const status = document.createElement('small');
  status.dataset.gameDescriptionGeneratorStatus = 'true';
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'Leave this blank and publishing will generate a factual fallback from the release details you enter; verified YouTube copy can still enrich the public archive later.';

  controls.append(button, status);
  label.insertAdjacentElement('afterend', controls);
}

function installThumbnailPathAutomation() {
  const title = field('title');
  const slug = field('slug');
  const thumbnail = field('thumbnail');
  if (!slug || !thumbnail || thumbnail.dataset.webpDefaultInstalled === 'true') return;

  thumbnail.dataset.webpDefaultInstalled = 'true';
  let lastAutoPath = '';
  let writing = false;

  const sync = () => {
    const desired = defaultThumbnailPathForSlug(slug.value);
    const current = String(thumbnail.value || '').trim();
    if (!desired) return;
    if (current && current !== lastAutoPath) return;

    writing = true;
    thumbnail.value = desired;
    lastAutoPath = desired;
    thumbnail.dispatchEvent(new Event('input', { bubbles: true }));
    thumbnail.dispatchEvent(new Event('change', { bubbles: true }));
    writing = false;
  };

  thumbnail.addEventListener('input', () => {
    if (writing) return;
    const current = String(thumbnail.value || '').trim();
    if (current !== lastAutoPath) lastAutoPath = '';
  });
  slug.addEventListener('input', sync);
  title?.addEventListener('input', () => queueMicrotask(sync));
  sync();
}

function installLemonSourceAutomationHint() {
  const input = field('lemonUrl');
  const label = input?.closest('label');
  if (!input || !label || document.querySelector('[data-lemon-source-automation-hint]')) return;

  const textNode = Array.from(label.childNodes).find((node) => node.nodeType === 3 && String(node.textContent || '').trim());
  if (textNode) textNode.nodeValue = 'Lemon game source URL (optional)\n            ';

  const hint = document.createElement('small');
  hint.dataset.lemonSourceAutomationHint = 'true';
  hint.textContent = 'Usually leave this blank: publishing first tries to discover and verify the matching Lemon64 or Lemon Amiga game page automatically. Paste the exact game page only if discovery misses it; magazine scores are imported automatically.';
  input.insertAdjacentElement('afterend', hint);
}

function renderErrors(errors) {
  const box = document.querySelector('[data-game-validation]');
  if (!box) return;
  if (!errors.length) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  box.hidden = false;
  box.innerHTML = `<strong>Game source preflight stopped publishing:</strong><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>`;
  box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function removeLegacyLemonOverrides() {
  document.querySelector('[data-lemon-override]')?.remove();
  document.querySelector('[data-no-lemon-listing]')?.closest('label')?.remove();
  document.querySelector('[data-lemon-source-hint]')?.remove();
}

function installPreflight() {
  const form = document.querySelector('[data-game-form]');
  if (!form) return;

  removeLegacyLemonOverrides();
  installDescriptionAutomation();
  installThumbnailPathAutomation();
  installLemonSourceAutomationHint();

  form.addEventListener('submit', (event) => {
    if (!String(field('description')?.value || '').trim()) generateDescriptionIntoForm();

    const errors = validateGamePublisherSource({
      system: field('system')?.value,
      year: field('year')?.value,
      description: field('description')?.value,
      thumbnail: field('thumbnail')?.value,
      lemonUrl: field('lemonUrl')?.value
    });

    renderErrors(errors);
    if (errors.length) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { capture: true });
}

if (typeof document !== 'undefined') installPreflight();