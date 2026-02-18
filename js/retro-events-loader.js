/* ============================================================
   RETRO EVENTS COLLECTION LOADER
   ------------------------------------------------------------
   • Loads curated events from /games/collections/retro-events.json
   • Renders with existing collection card layout
   • Uses direct external links from dataset
   • Restores YouTube thumbnails via youtubeId
============================================================ */

function ccgEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ccgGetYouTubeThumbUrl(youtubeId, variant) {
  const id = String(youtubeId || '').trim();
  if (!id) return '';
  const file = variant || 'hqdefault.jpg';
  return `https://img.youtube.com/vi/${encodeURIComponent(id)}/${file}`;
}

function ccgBuildRetroEventCard(eventItem) {
  const title = String(eventItem?.title || '').trim();
  const videoUrl = String(eventItem?.url || '').trim();
  if (!title || !videoUrl) return '';

  const safeTitle = ccgEscapeHtml(title);
  const safeVideoUrl = ccgEscapeHtml(videoUrl);

  const youtubeId = String(eventItem?.youtubeId || '').trim();
  const thumb = ccgGetYouTubeThumbUrl(youtubeId, 'hqdefault.jpg');
  const thumbFallback = ccgGetYouTubeThumbUrl(youtubeId, 'mqdefault.jpg');

  const isMembersOnly = eventItem?.membersOnly === true;
  const badgeText = String(eventItem?.badge || '').trim();

  const membersOnlyAttr = isMembersOnly ? ' data-members-only="true"' : '';
  const membersOnlyBadge = isMembersOnly
    ? '<span class="ccg-collection-badge ccg-collection-badge--members" aria-label="Members only">MEMBERS ONLY</span>'
    : '';

  const eventBadge = badgeText
    ? `<span class="ccg-collection-badge ccg-collection-badge--event" aria-label="${ccgEscapeHtml(badgeText)}">${ccgEscapeHtml(badgeText)}</span>`
    : '';

  // Media block: only render if youtubeId exists (keeps layout safe)
  const mediaBlock = thumb
    ? `
      <div class="ccg-game-card__media">
        <img
          src="${ccgEscapeHtml(thumb)}"
          alt="${safeTitle}"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          onerror="this.onerror=null; this.src='${ccgEscapeHtml(thumbFallback)}';"
        />
      </div>
    `
    : '';

  return `
    <article class="ccg-game-card genre-card ccg-game-card--retro-event"${membersOnlyAttr}>
      ${membersOnlyBadge}
      ${eventBadge}
      ${mediaBlock}
      <div class="ccg-game-card__body">
        <div class="game-title-wrapper">
          <h3 class="ccg-game-card__title">${safeTitle}</h3>
        </div>
        <div class="ccg-game-card__actions">
          <a href="${safeVideoUrl}" class="ccg-btn ccg-btn--primary ccg-game-card__btn" target="_blank" rel="noopener noreferrer">WATCH VIDEO</a>
        </div>
      </div>
    </article>
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
    .map((eventItem, index) => ({
      id: String(eventItem?.id || '').trim(),
      title: String(eventItem?.title || '').trim(),
      url: String(eventItem?.url || '').trim(),
      youtubeId: String(eventItem?.youtubeId || '').trim(),
      membersOnly: eventItem?.membersOnly === true,
      badge: String(eventItem?.badge || '').trim(),
      order: Number.isFinite(Number(eventItem?.order)) ? Number(eventItem.order) : Number.MAX_SAFE_INTEGER,
      index
    }))
    // youtubeId is optional (but strongly recommended). Keep entries even if blank.
    .filter((eventItem) => eventItem.id && eventItem.title && eventItem.url)
    .sort((a, b) => (a.order - b.order) || (a.index - b.index));
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