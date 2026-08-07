/* ============================================================
   AMIGA DEMO MUSIC COLLECTION LOADER
   ------------------------------------------------------------
   Uses the shared Omega collection-card presentation while keeping
   Amiga demoscene-specific labels and metadata.
============================================================ */

const CCG_AMIGA_DEMO_MUSIC_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';

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
  if (!id) return '';
  return `https://img.youtube.com/vi/${encodeURIComponent(id)}/${variant}`;
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

function ccgGetDetailPath(slug) {
  const safeSlug = String(slug || '').trim();
  return safeSlug ? `/amiga-demo-music/${encodeURIComponent(safeSlug)}/` : '';
}

function ccgGetAmigaDemoThumbnail(item, youtubeId) {
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

function ccgPrimeAmigaDemoUi() {
  const grid = document.getElementById('genreGamesGrid');
  if (!grid || grid.dataset.ccgPrimed === 'true') return;
  grid.dataset.ccgPrimed = 'true';
  grid.dataset.collectionState = 'loading';
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = ccgBuildCollectionSkeletons();
}

function ccgBuildCard(item, index = 0) {
  const title = String(item?.title || '').trim();
  const pageUrl = String(item?.pageUrl || '').trim();
  const description = String(item?.summary || item?.description || '').trim();
  const youtubeId = ccgResolveYoutubeId(item);
  const membersOnly = ccgIsMembersOnly(item);
  if (!title || !pageUrl || !youtubeId) return '';

  const thumb = ccgGetAmigaDemoThumbnail(item, youtubeId);
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
  const buttonText = membersOnly ? 'Open members demo' : 'Open demo';

  return `
    <article class="ccg-card ccg-game-card genre-card ccg-game-card--retro-event" data-members-only="${membersOnly}">
      <a class="ccg-game-card__link" href="${ccgEscapeHtml(pageUrl)}" aria-label="Open ${ccgEscapeHtml(title + accessLabel)}">
        <div class="ccg-game-card__media ccg-game-card__thumb">
          <img src="${ccgEscapeHtml(thumb)}" alt="${ccgEscapeHtml(`${title} – Amiga Demo Music video thumbnail${accessLabel}`)}" loading="${loading}" decoding="async"${fetchPriority} width="480" height="270" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='${ccgEscapeHtml(thumbFallback)}';" />
          <span class="ccg-collection-badge ccg-collection-badge--event" aria-hidden="true">Amiga demo</span>
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

function ccgInjectAmigaDemoMusicStructuredData(items) {
  const existing = document.getElementById('ccg-amiga-demo-music-item-list');
  if (existing) existing.remove();

  const itemListElement = items
    .map((item, index) => {
      const youtubeId = ccgResolveYoutubeId(item);
      const title = String(item?.title || '').trim();
      const pageUrl = String(item?.pageUrl || '').trim();
      if (!youtubeId || !title || !pageUrl) return null;

      const description = String(item?.summary || item?.description || '').trim();
      const thumbnail = ccgGetAmigaDemoThumbnail(item, youtubeId);

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'VideoObject',
          name: title,
          description,
          thumbnailUrl: [thumbnail],
          embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
          url: `${CCG_AMIGA_DEMO_MUSIC_ORIGIN}${pageUrl}`,
          isAccessibleForFree: !ccgIsMembersOnly(item)
        }
      };
    })
    .filter(Boolean);

  if (!itemListElement.length) return;

  const script = document.createElement('script');
  script.id = 'ccg-amiga-demo-music-item-list';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Cheeky Commodore Gamer Amiga Demo Music',
    numberOfItems: itemListElement.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement
  });
  document.head.appendChild(script);
}

async function ccgLoadItems() {
  const response = await fetch('/data/amiga-demo-music.json', { cache: 'default' });
  if (!response.ok) throw new Error(`Could not load amiga-demo-music.json (${response.status})`);

  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Collection data must be an array.');

  return data
    .map((item, index) => {
      const orderValue = Number(item?.order);
      const youtubeId = ccgResolveYoutubeId(item);
      const slug = String(item?.slug || item?.id || '').trim();

      return {
        ...item,
        id: String(item?.id || '').trim(),
        title: String(item?.title || '').trim(),
        summary: String(item?.summary || item?.description || '').trim(),
        description: String(item?.description || '').trim(),
        thumbnail: String(item?.thumbnail || '').trim(),
        membersOnly: ccgIsMembersOnly(item),
        youtubeId,
        pageUrl: ccgGetDetailPath(slug),
        visible: item?.visible !== false && item?.published !== false,
        order: Number.isFinite(orderValue) ? orderValue : Number.POSITIVE_INFINITY,
        index,
        type: String(item?.type || '').trim().toLowerCase()
      };
    })
    .filter((item) => item.id && item.title && item.pageUrl && item.youtubeId && item.visible && item.type === 'amiga-demo-music')
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
    grid.dataset.collectionState = 'ready';
    grid.setAttribute('aria-busy', 'false');
    ccgInjectAmigaDemoMusicStructuredData(items);

    if (!items.length) {
      grid.innerHTML = '<div class="ccg-genre-empty"><h3>No items found in this collection</h3></div>';
    }
  } catch (error) {
    console.error('[CCG AMIGA DEMO MUSIC]', error);
    if (countEl) countEl.textContent = '0';
    grid.dataset.collectionState = 'error';
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = '<div class="ccg-genre-empty"><h3>Unable to load this collection</h3><p>Please refresh the page to try again.</p></div>';
  }
}

ccgPrimeAmigaDemoUi();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ccgRunCollection, { once: true });
} else {
  ccgRunCollection();
}
