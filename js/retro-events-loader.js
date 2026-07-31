/* ============================================================
   RETRO EVENTS COLLECTION LOADER
============================================================ */

const CCG_RETRO_EVENTS_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';

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
  return safeSlug ? `/retro-events/${encodeURIComponent(safeSlug)}/` : '';
}

function ccgGetRetroEventThumbnail(item, youtubeId) {
  const supplied = String(item?.thumbnail || '').trim();
  return supplied || ccgGetYouTubeThumbUrl(youtubeId, 'hqdefault.jpg');
}

function ccgBuildCard(item, index = 0) {
  const title = String(item?.title || '').trim();
  const pageUrl = String(item?.pageUrl || '').trim();
  const description = String(item?.summary || item?.description || '').trim();
  const youtubeId = ccgResolveYoutubeId(item);
  const membersOnly = ccgIsMembersOnly(item);

  if (!title || !pageUrl || !youtubeId) return '';

  const thumb = ccgGetRetroEventThumbnail(item, youtubeId);
  const thumbFallback = ccgGetYouTubeThumbUrl(youtubeId, 'mqdefault.jpg');
  const accessLabel = membersOnly ? ' (members-only video)' : '';
  const loading = index < 2 ? 'eager' : 'lazy';
  const fetchPriority = index === 0 ? ' fetchpriority="high"' : '';
  const eventBadge = '<span class="ccg-collection-badge ccg-collection-badge--event" aria-hidden="true">Retro event</span>';
  const membersSash = membersOnly
    ? '<span class="ccg-collection-sash ccg-collection-sash--members" aria-hidden="true">Members only</span>'
    : '';
  const membersNotice = membersOnly
    ? '<p class="ccg-game-card__access"><strong>Members only:</strong> YouTube channel membership is required to watch this video.</p>'
    : '';
  const buttonText = membersOnly ? 'View members-only event' : 'View event';

  return `
    <article class="ccg-game-card genre-card ccg-game-card--retro-event" data-members-only="${membersOnly}">
      <a class="ccg-game-card__link" href="${ccgEscapeHtml(pageUrl)}" aria-label="Open ${ccgEscapeHtml(title + accessLabel)}">
        <div class="ccg-game-card__media ccg-game-card__thumb">
          <img src="${ccgEscapeHtml(thumb)}" alt="${ccgEscapeHtml(`${title} – Retro Events video thumbnail${accessLabel}`)}" loading="${loading}" decoding="async"${fetchPriority} width="480" height="360" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='${ccgEscapeHtml(thumbFallback)}';" />
          ${eventBadge}
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

function ccgInjectRetroEventStructuredData(items) {
  const existing = document.getElementById('ccg-retro-events-item-list');
  if (existing) existing.remove();

  const itemListElement = items
    .map((item, index) => {
      const youtubeId = ccgResolveYoutubeId(item);
      const title = String(item?.title || '').trim();
      const pageUrl = String(item?.pageUrl || '').trim();

      if (!youtubeId || !title || !pageUrl) return null;

      const description = String(item?.summary || item?.description || '').trim();
      const thumbnail = ccgGetRetroEventThumbnail(item, youtubeId);

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'VideoObject',
          name: title,
          description,
          thumbnailUrl: [thumbnail],
          embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
          url: `${CCG_RETRO_EVENTS_ORIGIN}${pageUrl}`,
          isAccessibleForFree: !ccgIsMembersOnly(item)
        }
      };
    })
    .filter(Boolean);

  if (!itemListElement.length) return;

  const script = document.createElement('script');
  script.id = 'ccg-retro-events-item-list';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Cheeky Commodore Gamer Retro Events',
    numberOfItems: itemListElement.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement
  });

  document.head.appendChild(script);
}

async function ccgLoadItems() {
  const response = await fetch('/data/retro-events.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load retro-events.json (${response.status})`);

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
    .filter((item) => item.id && item.title && item.pageUrl && item.youtubeId && item.visible && item.type === 'retro-events')
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
    ccgInjectRetroEventStructuredData(items);

    if (!items.length) {
      grid.innerHTML = '<div class="ccg-genre-empty"><h3>No items found in this collection</h3></div>';
    }
  } catch (error) {
    console.error('[CCG RETRO EVENTS]', error);
    if (countEl) countEl.textContent = '0';
    grid.innerHTML = '<div class="ccg-genre-empty"><h3>Unable to load this collection</h3></div>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ccgRunCollection, { once: true });
} else {
  ccgRunCollection();
}
