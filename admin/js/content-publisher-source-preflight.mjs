const SOURCE_MIN_WORDS = 40;
const THUMBNAIL_PREFIX = 'resources/images/thumbnails/all/';

export function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
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

  return errors;
}

function field(name) {
  return document.querySelector(`[data-game-field="${name}"]`);
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

function removeLegacyLemonControls() {
  field('lemonUrl')?.closest('label')?.remove();
  document.querySelector('[data-lemon-override]')?.remove();
  document.querySelector('[data-no-lemon-listing]')?.closest('label')?.remove();
  document.querySelector('[data-lemon-source-hint]')?.remove();
}

function installPreflight() {
  const form = document.querySelector('[data-game-form]');
  if (!form) return;

  removeLegacyLemonControls();

  form.addEventListener('submit', (event) => {
    const errors = validateGamePublisherSource({
      system: field('system')?.value,
      year: field('year')?.value,
      description: field('description')?.value,
      thumbnail: field('thumbnail')?.value
    });

    renderErrors(errors);
    if (errors.length) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { capture: true });
}

if (typeof document !== 'undefined') installPreflight();
