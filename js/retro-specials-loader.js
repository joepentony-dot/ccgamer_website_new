/* ============================================================
   RETRO SPECIALS COLLECTION LOADER (LOCKED + HARDENED)
============================================================ */

function ccgEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ccgGetYouTubeThumbUrl(youtubeId) {
  const id = String(youtubeId || '').trim();
  return id ? `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : '';
}

/* 🔥 HARD FIX — MATCH GENERATOR */
function ccgResolveYoutubeId(item) {
  return String(
    item?.youtubeId ||
    item?.youtube_video_id ||
    item?.videoId ||
    item?.videoid ||
    item?.youtube ||
    ''
  ).trim();
}

function ccgGetRetroSpecialPath(slug) {
  return slug ? `/retro-specials/${encodeURIComponent(slug)}/` : '';
}

function ccgBuildRetroSpecialCard(item) {
  const youtubeId = ccgResolveYoutubeId(item);
  const slug = String(item?.slug || item?.id || '').trim();

  if (!youtubeId || !slug) return '';

  const pageUrl = ccgGetRetroSpecialPath(slug);
  const title = String(item?.title || '').trim();
  const description = String(item?.summary || item?.description || '').trim();

  const thumb = ccgGetYouTubeThumbUrl(youtubeId);

  return `
    <article class="ccg-game-card genre-card ccg-game-card--retro-event">
      <a class="ccg-game-card__link" href="${ccgEscapeHtml(pageUrl)}">
        <div class="ccg-game-card__media ccg-game-card__thumb">
          <img src="${ccgEscapeHtml(thumb)}" alt="${ccgEscapeHtml(title)}" loading="lazy" />
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
    throw new Error('Failed to load retro-specials.json');
  }

  const data = await response.json();

  return data
    .map((item, index) => ({
      ...item,
      youtubeId: ccgResolveYoutubeId(item),
      slug: String(item.slug || item.id || '').trim(),
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : 9999,
      index
    }))
    .filter((item) => item.slug)
    .sort((a, b) => (a.order - b.order) || (a.index - b.index));
}

async function ccgRunCollection() {
  const grid = document.getElementById('genreGamesGrid');
  const countEl = document.getElementById('genreGamesCount');

  if (!grid) return;

  try {
    const items = await ccgLoadRetroSpecials();

    if (countEl) countEl.textContent = String(items.length);

    grid.innerHTML = items.map(ccgBuildRetroSpecialCard).join('');

    if (!items.length) {
      grid.innerHTML = '<div class="ccg-genre-empty"><h3>No items found in this collection</h3></div>';
    }

  } catch (error) {
    console.error('[CCG RETRO SPECIALS]', error);

    if (countEl) countEl.textContent = '0';

    grid.innerHTML = '<div class="ccg-genre-empty"><h3>Unable to load this collection</h3></div>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ccgRunCollection, { once: true });
} else {
  ccgRunCollection();
}
