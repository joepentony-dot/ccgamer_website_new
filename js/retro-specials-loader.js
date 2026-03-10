/* ============================================================
   RETRO SPECIALS COLLECTION LOADER
   ------------------------------------------------------------
   • Loads curated specials from /data/retro-events.json
   • Renders with existing collection card layout
   • Uses youtubeId to derive watch URLs and thumbnails
   • Supports retro_special + retro_event + demo_music types
============================================================ */

function ccgEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ccgGetRetroPagePath(type, slug) {
  const safeSlug = String(slug || '').trim();
  if (!safeSlug) return '';
  if (type === 'retro_special') return `/retro-specials/${encodeURIComponent(safeSlug)}/`;
  if (type === 'retro_event') return `/retro-events/${encodeURIComponent(safeSlug)}/`;
  if (type === 'demo_music') return `/amiga-demo-music/${encodeURIComponent(safeSlug)}/`;
  return '';
}

function ccgGetYouTubeThumbUrl(youtubeId, variant) {
  const id = String(youtubeId || '').trim();
  if (!id) return '';
  const file = variant || 'hqdefault.jpg';
  return `https://img.youtube.com/vi/${encodeURIComponent(id)}/${file}`;
}

function ccgBuildRetroSpecialCard(eventItem) {
  const title = String(eventItem?.title || '').trim();
  const videoUrl = String(eventItem?.url || '').trim();
  const pageUrl = String(eventItem?.pageUrl || '').trim();
  if (!title || !(pageUrl || videoUrl)) return '';

  const safeTitle = ccgEscapeHtml(title);
  const safeCardUrl = ccgEscapeHtml(pageUrl || videoUrl);

  const youtubeId = String(eventItem?.youtube_video_id || eventItem?.youtubeId || eventItem?.youtube || '').trim();
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
      ${eventBadge}
      ${mediaBlock}
      <div class="ccg-game-card__body">
        <div class="game-title-wrapper">
          <h3 class="ccg-game-card__title">${safeTitle}</h3>
        </div>
        <div class="ccg-game-card__actions">
          <a href="${safeCardUrl}" class="ccg-btn ccg-btn--primary ccg-game-card__btn">WATCH VIDEO</a>
        </div>
      </div>
    </article>
  `;
}

async function ccgLoadRetroSpecials() {
  const response = await fetch('/data/retro-events.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Could not load retro-events.json (${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('retro-events.json must be an array.');
  }

  return data
    .map((eventItem, index) => {
      const rawType = String(eventItem?.type || '').trim().toLowerCase();
      let type = 'retro_event';
      if (rawType === 'demo_music' || rawType === 'amiga_demo_music') type = 'demo_music';
      if (rawType === 'retro_special') type = 'retro_special';
      const orderValue = Number(eventItem?.sort_order ?? eventItem?.order);
      const youtubeId = String(eventItem?.youtube_video_id || eventItem?.youtubeId || eventItem?.youtube || '').trim();
      const slug = String(eventItem?.slug || eventItem?.id || '').trim();

      return {
        id: String(eventItem?.id || '').trim(),
        type,
        title: String(eventItem?.title || '').trim(),
        youtubeId,
        url: String(eventItem?.youtube_url || eventItem?.url || '').trim() || (youtubeId ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}` : ''),
        pageUrl: ccgGetRetroPagePath(type, slug),
        membersOnly: eventItem?.membersOnly === true,
        visible: eventItem?.visible !== false && eventItem?.published !== false,
        badge: String(eventItem?.badge || '').trim(),
        seo: {
          title: String(eventItem?.seo?.title || '').trim(),
          description: String(eventItem?.seo?.description || '').trim()
        },
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
  gridEl.innerHTML = items.map(ccgBuildRetroSpecialCard).join('');
}

async function ccgRunRetroSpecialsCollection() {
  const gridRetro = document.getElementById('genreGamesGrid');
  const countEl = document.getElementById('genreGamesCount');

  if (!gridRetro) {
    console.warn('[CCG RETRO SPECIALS] Missing grid container');
    return;
  }

  try {
    const events = await ccgLoadRetroSpecials();
    const retroSpecials = events.filter((eventItem) => eventItem.type === 'retro_special');

    if (countEl) {
      countEl.textContent = String(retroSpecials.length);
    }

    if (retroSpecials.length > 0) {
      ccgRenderCards(gridRetro, retroSpecials);
    } else {
      gridRetro.innerHTML = `
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
    console.error('[CCG RETRO SPECIALS]', error);
    if (countEl) {
      countEl.textContent = '0';
    }
    gridRetro.innerHTML = `
      <div class="ccg-genre-empty">
        <h3>Unable to load Retro Specials</h3>
        <p>Please try again later.</p>
      </div>
    `;

  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ccgRunRetroSpecialsCollection, { once: true });
} else {
  ccgRunRetroSpecialsCollection();
}
