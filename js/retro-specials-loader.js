/* ============================================================
   RETRO SPECIALS COLLECTION LOADER
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
  return `https://img.youtube.com/vi/${encodeURIComponent(id)}/${variant || 'hqdefault.jpg'}`;
}

function ccgGetRetroSpecialPath(slug) {
  const safeSlug = String(slug || '').trim();
  return safeSlug ? `/retro-specials/${encodeURIComponent(safeSlug)}/` : '';
}

function ccgBuildRetroSpecialCard(item) {
  const title = String(item?.title || '').trim();
  const pageUrl = String(item?.pageUrl || '').trim();
  const description = String(item?.summary || item?.description || '').trim();
  const youtubeId = String(item?.youtubeId || '').trim();

  if (!title || !pageUrl) return '';

  const thumb = ccgGetYouTubeThumbUrl(youtubeId, 'hqdefault.jpg');
  const thumbFallback = ccgGetYouTubeThumbUrl(youtubeId, 'mqdefault.jpg');

  return `
    <article class="ccg-game-card genre-card ccg-game-card--retro-event">
      <a class="ccg-game-card__link" href="${ccgEscapeHtml(pageUrl)}">
        <div class="ccg-game-card__media ccg-game-card__thumb">
          <img src="${ccgEscapeHtml(thumb)}" alt="${ccgEscapeHtml(title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='${ccgEscapeHtml(thumbFallback)}';" />
        </div>
        <div class="ccg-game-card__body">
          <h3 class="ccg-game-card__title">${ccgEscapeHtml(title)}</h3>
          <p class="ccg-game-card__desc">${ccgEscapeHtml(description)}</p>
        </div>
      </a>
    </article>
  `;
}

async function ccgLoadRetroSpecials() {
  const response = await fetch('/data/retro-specials.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Could not load retro-specials.json (${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('retro-specials.json must be an array.');
  }

  return data
    .map((item, index) => {
      const orderValue = Number(item?.order);
      const slug = String(item?.slug || item?.id || '').trim();
      const youtubeId = String(item?.youtubeId || '').trim();
      return {
        id: String(item?.id || '').trim(),
        title: String(item?.title || '').trim(),
        summary: String(item?.summary || item?.description || '').trim(),
        youtubeId,
        pageUrl: ccgGetRetroSpecialPath(slug),
        visible: item?.visible !== false && item?.published !== false,
        order: Number.isFinite(orderValue) ? orderValue : Number.POSITIVE_INFINITY,
        index
      };
    })
    .filter((item) => item.id && item.title && item.pageUrl && item.visible)
    .sort((a, b) => (a.order - b.order) || (a.index - b.index));
}

function ccgRenderCards(gridEl, items) {
  if (!gridEl) return;
  gridEl.innerHTML = items.map(ccgBuildRetroSpecialCard).join('');
}

async function ccgRunRetroSpecialsCollection() {
  const grid = document.getElementById('genreGamesGrid');
  const countEl = document.getElementById('genreGamesCount');

  if (!grid) return;

  try {
    const items = await ccgLoadRetroSpecials();
    if (countEl) countEl.textContent = String(items.length);
    ccgRenderCards(grid, items);
  } catch (error) {
    console.error('[CCG RETRO SPECIALS]', error);
    if (countEl) countEl.textContent = '0';
    grid.innerHTML = '<div class="ccg-genre-empty"><h3>Unable to load Retro Specials</h3></div>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ccgRunRetroSpecialsCollection, { once: true });
} else {
  ccgRunRetroSpecialsCollection();
}
