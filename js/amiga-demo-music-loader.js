/* ============================================================
   AMIGA DEMO MUSIC COLLECTION LOADER
   ------------------------------------------------------------
   • Loads curated demo music from /data/amiga-demo-music.json
   • Renders with existing Retro Events collection card layout
   • Uses youtubeId to derive watch URLs and thumbnails
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

function ccgBuildDemoMusicCard(eventItem) {
  const title = String(eventItem?.title || '').trim();
  const videoUrl = String(eventItem?.url || '').trim();
  if (!title || !videoUrl) return '';

  const safeTitle = ccgEscapeHtml(title);
  const safeVideoUrl = ccgEscapeHtml(videoUrl);

  const youtubeId = String(eventItem?.youtube_video_id || eventItem?.youtubeId || eventItem?.youtube || '').trim();
  const thumb = ccgGetYouTubeThumbUrl(youtubeId, 'hqdefault.jpg');
  const thumbFallback = ccgGetYouTubeThumbUrl(youtubeId, 'mqdefault.jpg');

  const isMembersOnly = eventItem?.membersOnly === true;
  const membersOnlyAttr = isMembersOnly ? ' data-members-only="true"' : '';
  const membersOnlyBadge = isMembersOnly
    ? '<span class="ccg-collection-badge ccg-collection-badge--members" aria-label="Members only">MEMBERS ONLY</span>'
    : '';

  const mediaBlock = thumb
    ? `
      <div class="ccg-game-card__media ccg-game-card__thumb">
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

async function ccgLoadDemoMusic() {
  const response = await fetch('/data/amiga-demo-music.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Could not load amiga-demo-music.json (${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('amiga-demo-music.json must be an array.');
  }

  return data
    .map((eventItem, index) => {
      const orderValue = Number(eventItem?.sort_order ?? eventItem?.order);
      const youtubeId = String(eventItem?.youtube_video_id || eventItem?.youtubeId || eventItem?.youtube || '').trim();

      return {
        id: String(eventItem?.id || '').trim(),
        type: 'demo_music',
        title: String(eventItem?.title || '').trim(),
        youtubeId,
        url: String(eventItem?.youtube_url || eventItem?.url || '').trim() || (youtubeId ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}` : ''),
        membersOnly: eventItem?.membersOnly === true,
        visible: eventItem?.visible !== false && eventItem?.published !== false,
        order: Number.isFinite(orderValue) ? orderValue : Number.POSITIVE_INFINITY,
        index
      };
    })
    .filter((eventItem) => eventItem.id && eventItem.title && eventItem.url && eventItem.visible)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.index - b.index;
    });
}

function ccgRenderCards(gridEl, items) {
  if (!gridEl) return;
  gridEl.innerHTML = items.map(ccgBuildDemoMusicCard).join('');
}

async function ccgRunDemoMusicCollection() {
  const grid = document.getElementById('genreGamesGrid');
  const countEl = document.getElementById('genreGamesCount');

  if (!grid) {
    console.warn('[CCG AMIGA DEMO MUSIC] Missing grid container');
    return;
  }

  try {
    const tracks = await ccgLoadDemoMusic();

    if (countEl) {
      countEl.textContent = String(tracks.length);
    }

    if (tracks.length > 0) {
      ccgRenderCards(grid, tracks);
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
    console.error('[CCG AMIGA DEMO MUSIC]', error);
    if (countEl) {
      countEl.textContent = '0';
    }
    grid.innerHTML = `
      <div class="ccg-genre-empty">
        <h3>Unable to load Amiga Demo Music</h3>
        <p>Please try again later.</p>
      </div>
    `;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ccgRunDemoMusicCollection, { once: true });
} else {
  ccgRunDemoMusicCollection();
}
