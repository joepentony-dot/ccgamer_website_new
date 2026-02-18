/* ============================================================
   RETRO EVENTS COLLECTION LOADER
   ------------------------------------------------------------
   • Loads curated events from /games/collections/retro-events.json
   • Renders with existing collection card layout
   • Uses YouTube thumbnails and external video links only
============================================================ */

function ccgEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ccgVideoUrl(youtubeId) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`;
}

function ccgThumbUrl(youtubeId) {
  return `https://img.youtube.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`;
}

function ccgBuildRetroEventCard(eventItem) {
  const title = String(eventItem?.title || '').trim();
  if (!title) return '';

  const safeTitle = ccgEscapeHtml(title);
  const videoUrl = ccgVideoUrl(eventItem.youtubeId);
  const thumbUrl = ccgThumbUrl(eventItem.youtubeId);
  const isMembersOnly = eventItem?.membersOnly === true;
  const membersOnlyAttr = isMembersOnly ? ' data-members-only="true"' : '';
  const membersOnlyBadge = isMembersOnly
    ? '<span class="ccg-collection-badge ccg-collection-badge--members" aria-hidden="true">Members Only</span>'
    : '';

  return `
    <div class="ccg-game-card genre-card ccg-game-card--retro-event"${membersOnlyAttr}>
      ${membersOnlyBadge}
      <a href="${videoUrl}" class="ccg-game-card__media ccg-game-card__media--retro" target="_blank" rel="noopener noreferrer" aria-label="Watch ${safeTitle} on YouTube">
        <img src="${thumbUrl}" alt="${safeTitle}" loading="lazy" width="480" height="360" />
      </a>
      <div class="ccg-game-card__body">
        <div class="game-title-wrapper">
          <h3 class="ccg-game-card__title">${safeTitle}</h3>
        </div>
        <div class="ccg-game-card__actions">
          <a href="${videoUrl}" class="ccg-btn ccg-btn--primary ccg-game-card__btn" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
        </div>
      </div>
    </div>
  `;
}

async function ccgLoadRetroEvents() {
  const response = await fetch('/games/collections/retro-events.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Could not load retro-events.json (${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('retro-events.json must be an array.');
  }

  return data
    .map((eventItem) => ({
      id: String(eventItem?.id || '').trim(),
      title: String(eventItem?.title || '').trim(),
      youtubeId: String(eventItem?.youtubeId || '').trim(),
      membersOnly: eventItem?.membersOnly === true
    }))
    .filter((eventItem) => eventItem.id && eventItem.title && eventItem.youtubeId);
}

async function ccgRunRetroEventsCollection() {
  const grid = document.getElementById('genreGamesGrid');
  const countEl = document.getElementById('genreGamesCount');

  if (!grid) {
    console.warn('[CCG RETRO EVENTS] Missing grid container');
    return;
  }

  try {
    const events = await ccgLoadRetroEvents();
    const cards = events.map(ccgBuildRetroEventCard).join('');

    if (countEl) {
      countEl.textContent = String(events.length);
    }

    if (cards) {
      grid.innerHTML = cards;
    } else {
      grid.innerHTML = `
        <div class="ccg-genre-empty">
          <h3>No collection entries yet</h3>
          <p>We&apos;re refreshing this set — check back soon or browse every game.</p>
          <div class="ccg-genre-empty__actions">
            <a class="ccg-btn ccg-btn--primary" href="../index.html">Browse All Games</a>
            <a class="ccg-btn ccg-btn--secondary" href="../genres/index.html">Browse by Genre</a>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('[CCG RETRO EVENTS]', error);
    if (countEl) {
      countEl.textContent = '0';
    }
    grid.innerHTML = `
      <div class="ccg-genre-empty">
        <h3>Unable to load Retro Events</h3>
        <p>Please try again later.</p>
      </div>
    `;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ccgRunRetroEventsCollection, { once: true });
} else {
  ccgRunRetroEventsCollection();
}
