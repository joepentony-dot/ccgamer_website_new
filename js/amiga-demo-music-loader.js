/* ============================================================
   AMIGA DEMO MUSIC COLLECTION LOADER
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

function ccgGetDetailPath(slug) {
  const safeSlug = String(slug || '').trim();
  return safeSlug ? `/amiga-demo-music/${encodeURIComponent(safeSlug)}/` : '';
}

function ccgBuildCard(item) {
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

async function ccgLoadItems() {
  const response = await fetch('/data/amiga-demo-music.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load amiga-demo-music.json (${response.status})`);

  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Collection data must be an array.');

  return data
    .map((item, index) => {
      const orderValue = Number(item?.sort_order ?? item?.order);
      const youtubeId = String(item?.youtube_video_id || item?.youtubeId || item?.youtube || '').trim();
      const slug = String(item?.slug || item?.id || '').trim();
      return {
        id: String(item?.id || '').trim(),
        title: String(item?.title || '').trim(),
        summary: String(item?.summary || item?.description || '').trim(),
        description: String(item?.description || '').trim(),
        youtubeId,
        pageUrl: ccgGetDetailPath(slug),
        visible: item?.visible !== false && item?.published !== false,
        order: Number.isFinite(orderValue) ? orderValue : Number.POSITIVE_INFINITY,
        index
      };
    })
    .filter((item) => item.id && item.title && item.pageUrl && item.visible)
    .sort((a, b) => (a.order - b.order) || (a.index - b.index));
}

async function ccgRunCollection() {
  const grid = document.getElementById('genreGamesGrid');
  const countEl = document.getElementById('genreGamesCount');
  if (!grid) return;

  try {
    const items = await ccgLoadItems();
    if (countEl) countEl.textContent = String(items.length);
    grid.innerHTML = items.map(ccgBuildCard).join('');
  } catch (error) {
    console.error('[CCG AMIGA DEMO MUSIC]', error);
    if (countEl) countEl.textContent = '0';
    grid.innerHTML = '<div class="ccg-genre-empty"><h3>Unable to load this collection</h3></div>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ccgRunCollection, { once: true });
} else {
  ccgRunCollection();
}
