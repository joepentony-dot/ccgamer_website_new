/* ============================================================
   RETRO SPECIALS COLLECTION LOADER
   ------------------------------------------------------------
   Keeps the editorial/video collection visually aligned with the
   normal Omega collection grid while retaining video-specific data.
============================================================ */

const CCG_RETRO_SPECIALS_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';

function ccgEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ccgGetYouTubeThumbUrl(youtubeId, variant = 'hqdefault.jpg') {
  const id = String(youtubeId || '').trim();
  return id ? `https://img.youtube.com/vi/${encodeURIComponent(id)}/${variant}` : '';
}

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

function ccgIsMembersOnly(item) {
  const value = item?.membersOnly;
  return value === true ||
    value === 1 ||
    String(value || '').trim().toLowerCase() === 'true' ||
    String(value || '').trim().toLowerCase() === 'members';
}

function ccgGetRetroSpecialPath(slug) {
  const safeSlug = String(slug || '').trim();
  return safeSlug ? `/retro-specials/${encodeURIComponent(safeSlug)}/` : '';
}

function ccgGetRetroSpecialThumbnail(item, youtubeId) {
  const supplied = String(item?.thumbnail || '').trim();
  return supplied || ccgGetYouTubeThumbUrl(youtubeId);
}

function ccgBuildCollectionSkeletons(count = 6) {
  return Array.from({ length: count }, () => `
    <article class="ccg-card ccg-collection-skeleton" aria-hidden="true">
      <div class="ccg-collection-skeleton__media"></div>
      <div class="ccg-collection-skeleton__body">
        <span class="ccg-collection-skeleton__line ccg-collection-skeleton__line--title"></span>
        <span class="ccg-collection-skeleton__line"></span>
        <span class="ccg-collection-skeleton__line ccg-collection-skeleton__line--short"></span>
      </div>
    </article>
  `).join('');
}

function ccgPrimeRetroSpecialsUi() {
  const grid = document.getElementById('genreGamesGrid');
  if (!grid || grid.dataset.ccgPrimed === 'true') return;
  grid.dataset.ccgPrimed = 'true';
  grid.dataset.collectionState = 'loading';
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = ccgBuildCollectionSkeletons();
}

function ccgBuildRetroSpecialCard(item, index = 0) {
  const youtubeId = ccgResolveYoutubeId(item);
  const slug = String(item?.slug || item?.id || '').trim();
  const title = String(item?.title || '').trim();
  if (!youtubeId || !slug || !title) return '';

  const pageUrl = ccgGetRetroSpecialPath(slug);
  const description = String(item?.summary || item?.description || '').trim();
  const membersOnly = ccgIsMembersOnly(item);
  const thumb = ccgGetRetroSpecialThumbnail(item, youtubeId);
  const thumbFallback = ccgGetYouTubeThumbUrl(youtubeId, 'mqdefault.jpg');
  const accessLabel = membersOnly ? ' (members-only video)' : '';
  const loading = index < 2 ? 'eager' : 'lazy';
  const fetchPriority = index === 0 ? ' fetchpriority="high"' : '';
  const membersSash = membersOnly
    ? '<span class="ccg-collection-sash ccg-collection-sash--members" aria-hidden="true">Members only</span>'
    : '';
  const membersNotice = membersOnly
    ? '<p class="ccg-game-card__access"><strong>Members only:</strong> YouTube channel membership is required to watch this video.</p>'
    : '';
  const buttonText = membersOnly ? 'Open members feature' : 'Open feature';

  return `
    <article class="ccg-card ccg-game-card genre-card ccg-game-card--retro-event" data-members-only="${membersOnly}">
      <a class="ccg-game-card__link" href="${ccgEscapeHtml(pageUrl)}" aria-label="Open ${ccgEscapeHtml(title + accessLabel)}">
        <div class="ccg-game-card__media ccg-game-card__thumb">
          <img src="${ccgEscapeHtml(thumb)}" alt="${ccgEscapeHtml(`${title} – Retro Specials video thumbnail${accessLabel}`)}" loading="${loading}" decoding="async"${fetchPriority} width="480" height="270" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='${ccgEscapeHtml(thumbFallback)}';" />
          <span class="ccg-collection-badge ccg-collection-badge--event" aria-hidden="true">Retro special</span>
          ${membersSash}
        </div>
        <div class="ccg-game-card__body">
          <h3 class="ccg-game-card__title">${ccgEscapeHtml(title)}</h3>
          <p class="ccg-game-card__desc">${ccgEscapeHtml(description)}</p>
          ${membersNotice}
          <span class="ccg-game-card__actions"><span class="ccg-game-card__btn" aria-hidden="true">${ccgEscapeHtml(buttonText)}</span></span>
        </div>
      </a>
    </article>
  `;
}

function ccgInjectRetroSpecialStructuredData(items) {
  const existing = document.getElementById('ccg-retro-specials-item-list');
  if (existing) existing.remove();

  const itemListElement = items
    .map((item, index) => {
      const youtubeId = ccgResolveYoutubeId(item);
      const slug = String(item?.slug || item?.id || '').trim();
      const title = String(item?.title || '').trim();
      if (!youtubeId || !slug || !title) return null;

      const description = String(item?.summary || item?.description || '').trim();
      const thumbnail = ccgGetRetroSpecialThumbnail(item, youtubeId);
      const pagePath = ccgGetRetroSpecialPath(slug);

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'VideoObject',
          name: title,
          description,
          thumbnailUrl: [thumbnail],
          embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
          url: `${CCG_RETRO_SPECIALS_ORIGIN}${pagePath}`,
          isAccessibleForFree: !ccgIsMembersOnly(item)
        }
      };
    })
    .filter(Boolean);

  if (!itemListElement.length) return;

  const script = document.createElement('script');
  script.id = 'ccg-retro-specials-item-list';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Cheeky Commodore Gamer Retro Specials',
    numberOfItems: itemListElement.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement
  });
  document.head.appendChild(script);
}

async function ccgLoadRetroSpecials() {
  const response = await fetch('/data/retro-specials.json', { cache: 'default' });
  if (!response.ok) throw new Error(`Failed to load retro-specials.json (${response.status})`);

  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Retro Specials data must be an array.');

  return data
    .map((item, index) => ({
      ...item,
      youtubeId: ccgResolveYoutubeId(item),
      slug: String(item.slug || item.id || '').trim(),
      visible: item?.visible !== false && item?.published !== false,
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : 9999,
      index
    }))
    .filter((item) => item.slug && item.youtubeId && item.visible)
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
    grid.dataset.collectionState = 'ready';
    grid.setAttribute('aria-busy', 'false');
    ccgInjectRetroSpecialStructuredData(items);

    if (!items.length) {
      grid.innerHTML = '<div class="ccg-genre-empty"><h3>No items found in this collection</h3></div>';
    }
  } catch (error) {
    console.error('[CCG RETRO SPECIALS]', error);
    if (countEl) countEl.textContent = '0';
    grid.dataset.collectionState = 'error';
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = '<div class="ccg-genre-empty"><h3>Unable to load this collection</h3><p>Please refresh the page to try again.</p></div>';
  }
}

ccgPrimeRetroSpecialsUi();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ccgRunCollection, { once: true });
} else {
  ccgRunCollection();
}
