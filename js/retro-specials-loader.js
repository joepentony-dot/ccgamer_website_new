/* ============================================================
   RETRO SPECIALS COLLECTION LOADER
   ------------------------------------------------------------
   Adds discovery controls to the Retro Specials collection while
   preserving the existing Omega cards, URLs and static fallback.
============================================================ */

const CCG_RETRO_SPECIALS_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const CCG_RETRO_SPECIALS_DATASETS = [
  '/data/retro-specials.json'
];
const CCG_RETRO_SPECIALS_PAGE_SIZE = 12;
const CCG_RETRO_SPECIALS_LATEST_COUNT = 4;
const CCG_RETRO_SPECIALS_DISCOVERY_CSS = '/resources/css/retro-specials-discovery.css';
const CCG_RETRO_SPECIALS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'c64', label: 'C64' },
  { id: 'amiga', label: 'Amiga' },
  { id: 'zzap64', label: 'Zzap!64' },
  { id: 'pc', label: 'PC' },
  { id: 'zx-spectrum', label: 'ZX Spectrum' },
  { id: 'arcade', label: 'Arcade' },
  { id: 'retro-history', label: 'Retro History' }
];

const ccgRetroSpecialsState = {
  items: [],
  latestSlugs: new Set(),
  query: '',
  filter: 'all',
  sort: 'newest',
  visibleCount: CCG_RETRO_SPECIALS_PAGE_SIZE
};

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

function ccgEnsureRetroSpecialsDiscoveryStyles() {
  if (document.querySelector(`link[href="${CCG_RETRO_SPECIALS_DISCOVERY_CSS}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CCG_RETRO_SPECIALS_DISCOVERY_CSS;
  link.dataset.ccgRetroSpecialsDiscoveryStyle = 'true';
  document.head.appendChild(link);
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

  // Preserve the server-rendered/static card fallback while JSON loads.
  // Only show skeletons when the page genuinely has no fallback cards.
  if (!grid.querySelector('.ccg-game-card')) {
    grid.innerHTML = ccgBuildCollectionSkeletons();
  }
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

function ccgRetroSpecialsDateValue(item) {
  const timestamp = Date.parse(String(item?.created_at || ''));
  if (Number.isFinite(timestamp)) return timestamp;
  const order = Number(item?.order);
  return Number.isFinite(order) ? order : 0;
}

function ccgRetroSpecialsText(item) {
  const seo = item?.seo && typeof item.seo === 'object' ? item.seo : {};
  const extras = [item?.tags, item?.topics, item?.platforms, item?.filters]
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter(Boolean)
    .join(' ');

  return [
    item?.title,
    item?.summary,
    item?.description,
    seo?.title,
    seo?.description,
    extras
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function ccgRetroSpecialsExplicitTokens(item) {
  return [item?.tags, item?.topics, item?.platforms, item?.filters]
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());
}

function ccgGetRetroSpecialFilters(item) {
  const text = ccgRetroSpecialsText(item);
  const explicit = ccgRetroSpecialsExplicitTokens(item).join(' ');
  const filters = new Set();
  const matches = (pattern) => pattern.test(`${text} ${explicit}`);

  if (matches(/\bcommodore 64\b|\bc64\b|sid chip|zzap!?64|light fantastic|\bseuck\b/i)) filters.add('c64');
  if (matches(/\bamiga\b|x-copy|guru meditation/i)) filters.add('amiga');
  if (matches(/zzap!?64/i)) filters.add('zzap64');
  if (matches(/\bpc\b|windows 95|macintosh|endorfun/i)) filters.add('pc');
  if (matches(/zx spectrum|\bspectrum\b/i)) filters.add('zx-spectrum');
  if (matches(/\barcade\b|coin-op|cabinet|arcade club/i)) filters.add('arcade');
  if (matches(/history|story|memories|retrospective|revisit|revisiting|forgotten|banned|budget|sid chip|x-copy|guru meditation|light fantastic|endorfun|controvers|timothy leary|microsoft/i)) {
    filters.add('retro-history');
  }

  CCG_RETRO_SPECIALS_FILTERS.forEach(({ id, label }) => {
    if (id !== 'all' && explicit.includes(id)) filters.add(id);
    if (id !== 'all' && explicit.includes(label.toLowerCase())) filters.add(id);
  });

  return filters;
}

function ccgSortRetroSpecials(items, sortMode = 'newest') {
  const list = [...items];
  if (sortMode === 'az') {
    return list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'en-GB', { sensitivity: 'base' }));
  }
  if (sortMode === 'oldest') {
    return list.sort((a, b) => ccgRetroSpecialsDateValue(a) - ccgRetroSpecialsDateValue(b));
  }
  return list.sort((a, b) => ccgRetroSpecialsDateValue(b) - ccgRetroSpecialsDateValue(a));
}

function ccgInjectRetroSpecialStructuredData(items) {
  const existing = document.getElementById('ccg-retro-specials-item-list');
  if (existing) existing.remove();

  const orderedItems = ccgSortRetroSpecials(items, 'newest');
  const itemListElement = orderedItems
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
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement
  });
  document.head.appendChild(script);
}

async function ccgFetchRetroSpecialDataset(url, required = false) {
  try {
    const response = await fetch(url, { cache: 'default' });
    if (!response.ok) throw new Error(`Failed to load ${url} (${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(`${url} must contain an array.`);
    return data;
  } catch (error) {
    if (required) throw error;
    console.warn('[CCG RETRO SPECIALS] Optional dataset unavailable:', url, error);
    return [];
  }
}

async function ccgLoadRetroSpecials() {
  const datasets = await Promise.all(
    CCG_RETRO_SPECIALS_DATASETS.map((url, index) => ccgFetchRetroSpecialDataset(url, index === 0))
  );
  const data = datasets.flat();

  return data
    .map((item, index) => ({
      ...item,
      youtubeId: ccgResolveYoutubeId(item),
      slug: String(item.slug || item.id || '').trim(),
      visible: item?.visible !== false && item?.published !== false,
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : 9999,
      index
    }))
    .filter((item) => item.slug && item.youtubeId && item.visible);
}

function ccgBuildRetroSpecialsDiscoveryShell() {
  const grid = document.getElementById('genreGamesGrid');
  const main = grid?.closest('.ccg-genre-main');
  if (!grid || !main) return null;

  let shell = document.getElementById('ccgRetroSpecialsDiscovery');
  if (!shell) {
    shell = document.createElement('div');
    shell.id = 'ccgRetroSpecialsDiscovery';
    shell.className = 'ccg-retro-specials-discovery-shell';
    shell.innerHTML = `
      <section class="ccg-retro-latest" id="ccgRetroSpecialsLatest" aria-labelledby="ccgRetroSpecialsLatestTitle">
        <div class="ccg-retro-section-heading">
          <div>
            <p class="ccg-retro-section-heading__eyebrow">Recently added</p>
            <h2 id="ccgRetroSpecialsLatestTitle">Latest Retro Specials</h2>
          </div>
          <p>Four of the newest features from the Cheeky Commodore Gamer channel.</p>
        </div>
        <div id="ccgRetroSpecialsLatestGrid" class="ccg-retro-latest__grid"></div>
      </section>

      <section class="ccg-retro-discovery" aria-labelledby="ccgRetroSpecialsFindTitle">
        <div class="ccg-retro-section-heading ccg-retro-section-heading--compact">
          <div>
            <p class="ccg-retro-section-heading__eyebrow">Search the archive</p>
            <h2 id="ccgRetroSpecialsFindTitle">Find a Retro Special</h2>
          </div>
          <p>Search by title or subject, filter by platform or topic, then sort the results.</p>
        </div>

        <div class="ccg-retro-discovery__toolbar">
          <label class="ccg-retro-search" for="ccgRetroSpecialsSearch">
            <span class="ccg-retro-search__label">Search Retro Specials</span>
            <span class="ccg-retro-search__field">
              <span aria-hidden="true">⌕</span>
              <input id="ccgRetroSpecialsSearch" type="search" autocomplete="off" spellcheck="false" placeholder="Try Endorfun, Zzap!64, SID, budget..." />
            </span>
          </label>

          <label class="ccg-retro-sort" for="ccgRetroSpecialsSort">
            <span>Sort</span>
            <select id="ccgRetroSpecialsSort">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="az">A–Z</option>
            </select>
          </label>
        </div>

        <div class="ccg-retro-filters" id="ccgRetroSpecialsFilters" role="group" aria-label="Filter Retro Specials by platform or topic">
          ${CCG_RETRO_SPECIALS_FILTERS.map(({ id, label }) => `
            <button type="button" class="ccg-retro-filter${id === 'all' ? ' is-active' : ''}" data-retro-filter="${ccgEscapeHtml(id)}" aria-pressed="${id === 'all' ? 'true' : 'false'}">${ccgEscapeHtml(label)}</button>
          `).join('')}
        </div>

        <div class="ccg-retro-discovery__status-row">
          <p id="ccgRetroSpecialsStatus" class="ccg-retro-discovery__status" aria-live="polite"></p>
          <button type="button" id="ccgRetroSpecialsReset" class="ccg-retro-discovery__reset" hidden>Reset search &amp; filters</button>
        </div>
      </section>
    `;
    main.parentNode.insertBefore(shell, main);
  }

  let archiveHeading = document.getElementById('ccgRetroSpecialsArchiveHeading');
  if (!archiveHeading) {
    archiveHeading = document.createElement('div');
    archiveHeading.id = 'ccgRetroSpecialsArchiveHeading';
    archiveHeading.className = 'ccg-retro-archive-heading';
    archiveHeading.innerHTML = `
      <div>
        <p class="ccg-retro-section-heading__eyebrow">Full collection</p>
        <h2>Browse all Retro Specials</h2>
      </div>
      <p id="ccgRetroSpecialsArchiveNote">Newest additions are shown above.</p>
    `;
    main.insertBefore(archiveHeading, grid);
  }

  let loadMore = document.getElementById('ccgRetroSpecialsLoadMore');
  if (!loadMore) {
    loadMore = document.createElement('div');
    loadMore.id = 'ccgRetroSpecialsLoadMore';
    loadMore.className = 'ccg-retro-load-more';
    loadMore.innerHTML = '<button type="button" class="ccg-btn ccg-btn--secondary">Load 12 more</button>';
    main.appendChild(loadMore);
  }

  return shell;
}

function ccgUpdateRetroSpecialFilterButtons() {
  document.querySelectorAll('[data-retro-filter]').forEach((button) => {
    const active = button.dataset.retroFilter === ccgRetroSpecialsState.filter;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function ccgRetroSpecialMatches(item) {
  const query = ccgRetroSpecialsState.query.trim().toLowerCase();
  if (query && !ccgRetroSpecialsText(item).includes(query)) return false;

  if (ccgRetroSpecialsState.filter !== 'all') {
    const filters = ccgGetRetroSpecialFilters(item);
    if (!filters.has(ccgRetroSpecialsState.filter)) return false;
  }

  return true;
}

function ccgRenderRetroSpecialsDiscovery() {
  const grid = document.getElementById('genreGamesGrid');
  const latestSection = document.getElementById('ccgRetroSpecialsLatest');
  const latestGrid = document.getElementById('ccgRetroSpecialsLatestGrid');
  const status = document.getElementById('ccgRetroSpecialsStatus');
  const reset = document.getElementById('ccgRetroSpecialsReset');
  const loadMore = document.getElementById('ccgRetroSpecialsLoadMore');
  const archiveNote = document.getElementById('ccgRetroSpecialsArchiveNote');
  if (!grid) return;

  const isDefaultView = !ccgRetroSpecialsState.query &&
    ccgRetroSpecialsState.filter === 'all' &&
    ccgRetroSpecialsState.sort === 'newest';

  const newest = ccgSortRetroSpecials(ccgRetroSpecialsState.items, 'newest');
  const latestItems = newest.slice(0, CCG_RETRO_SPECIALS_LATEST_COUNT);
  ccgRetroSpecialsState.latestSlugs = new Set(latestItems.map((item) => item.slug));

  if (latestSection && latestGrid) {
    latestSection.hidden = !isDefaultView;
    if (isDefaultView) {
      latestGrid.innerHTML = latestItems.map(ccgBuildRetroSpecialCard).join('');
    }
  }

  let candidates = ccgRetroSpecialsState.items.filter(ccgRetroSpecialMatches);
  candidates = ccgSortRetroSpecials(candidates, ccgRetroSpecialsState.sort);

  if (isDefaultView) {
    candidates = candidates.filter((item) => !ccgRetroSpecialsState.latestSlugs.has(item.slug));
  }

  const visibleItems = candidates.slice(0, ccgRetroSpecialsState.visibleCount);
  grid.innerHTML = visibleItems.length
    ? visibleItems.map(ccgBuildRetroSpecialCard).join('')
    : '<div class="ccg-genre-empty ccg-retro-empty"><h3>No Retro Specials match that search</h3><p>Try another title, platform or topic.</p></div>';

  grid.dataset.collectionState = 'ready';
  grid.setAttribute('aria-busy', 'false');

  if (status) {
    if (isDefaultView) {
      status.textContent = `${candidates.length} more specials in the archive · ${latestItems.length} latest features above`;
    } else {
      status.textContent = `${candidates.length} special${candidates.length === 1 ? '' : 's'} found`;
    }
  }

  if (archiveNote) {
    archiveNote.textContent = isDefaultView
      ? 'Newest additions are shown above.'
      : 'Showing the full collection for your current search, filter or sort.';
  }

  if (reset) reset.hidden = isDefaultView;
  ccgUpdateRetroSpecialFilterButtons();

  if (loadMore) {
    const button = loadMore.querySelector('button');
    const remaining = Math.max(0, candidates.length - visibleItems.length);
    loadMore.hidden = remaining === 0;
    if (button) button.textContent = remaining > CCG_RETRO_SPECIALS_PAGE_SIZE
      ? `Load ${CCG_RETRO_SPECIALS_PAGE_SIZE} more`
      : `Load ${remaining} more`;
  }
}

function ccgBindRetroSpecialsDiscovery() {
  const search = document.getElementById('ccgRetroSpecialsSearch');
  const sort = document.getElementById('ccgRetroSpecialsSort');
  const filters = document.getElementById('ccgRetroSpecialsFilters');
  const reset = document.getElementById('ccgRetroSpecialsReset');
  const loadMore = document.getElementById('ccgRetroSpecialsLoadMore');

  search?.addEventListener('input', () => {
    ccgRetroSpecialsState.query = search.value.trim().toLowerCase();
    ccgRetroSpecialsState.visibleCount = CCG_RETRO_SPECIALS_PAGE_SIZE;
    ccgRenderRetroSpecialsDiscovery();
  });

  sort?.addEventListener('change', () => {
    ccgRetroSpecialsState.sort = sort.value || 'newest';
    ccgRetroSpecialsState.visibleCount = CCG_RETRO_SPECIALS_PAGE_SIZE;
    ccgRenderRetroSpecialsDiscovery();
  });

  filters?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-retro-filter]');
    if (!button) return;
    ccgRetroSpecialsState.filter = button.dataset.retroFilter || 'all';
    ccgRetroSpecialsState.visibleCount = CCG_RETRO_SPECIALS_PAGE_SIZE;
    ccgRenderRetroSpecialsDiscovery();
  });

  reset?.addEventListener('click', () => {
    ccgRetroSpecialsState.query = '';
    ccgRetroSpecialsState.filter = 'all';
    ccgRetroSpecialsState.sort = 'newest';
    ccgRetroSpecialsState.visibleCount = CCG_RETRO_SPECIALS_PAGE_SIZE;
    if (search) search.value = '';
    if (sort) sort.value = 'newest';
    ccgRenderRetroSpecialsDiscovery();
    search?.focus();
  });

  loadMore?.querySelector('button')?.addEventListener('click', () => {
    ccgRetroSpecialsState.visibleCount += CCG_RETRO_SPECIALS_PAGE_SIZE;
    ccgRenderRetroSpecialsDiscovery();
  });
}

function ccgUpdateRetroSpecialsIntro() {
  const heroTitle = document.querySelector('.ccg-collection-hero .ccg-genre-hero__title');
  const tagline = document.querySelector('.ccg-collection-hero .ccg-genre-hero__tagline');
  const introHeading = document.querySelector('.ccg-collection-intro h2');
  const introParagraph = document.querySelector('.ccg-collection-intro p');

  if (heroTitle) heroTitle.textContent = 'Retro Specials';
  if (tagline) tagline.textContent = 'Retro gaming documentaries, rankings, magazine retrospectives, computer history and forgotten stories.';
  if (introHeading) introHeading.textContent = 'Retro Specials – Computer & Gaming Stories';
  if (introParagraph) {
    introParagraph.textContent = 'Explore long-form Retro Specials spanning Commodore 64, Amiga, PC, ZX Spectrum, arcade history, magazine retrospectives and the stranger corners of classic computer culture.';
  }
}

async function ccgRunCollection() {
  const grid = document.getElementById('genreGamesGrid');
  const countEl = document.getElementById('genreGamesCount');
  if (!grid) return;

  try {
    const items = await ccgLoadRetroSpecials();
    if (countEl) countEl.textContent = String(items.length);

    ccgRetroSpecialsState.items = items;
    ccgEnsureRetroSpecialsDiscoveryStyles();
    ccgBuildRetroSpecialsDiscoveryShell();
    ccgUpdateRetroSpecialsIntro();
    ccgBindRetroSpecialsDiscovery();
    ccgInjectRetroSpecialStructuredData(items);
    ccgRenderRetroSpecialsDiscovery();

    if (!items.length) {
      grid.innerHTML = '<div class="ccg-genre-empty"><h3>No items found in this collection</h3></div>';
    }
  } catch (error) {
    console.error('[CCG RETRO SPECIALS]', error);
    grid.dataset.collectionState = 'fallback';
    grid.setAttribute('aria-busy', 'false');
    // Keep the static fallback cards visible if the JSON request fails.
    if (!grid.querySelector('.ccg-game-card')) {
      if (countEl) countEl.textContent = '0';
      grid.dataset.collectionState = 'error';
      grid.innerHTML = '<div class="ccg-genre-empty"><h3>Unable to load this collection</h3><p>Please refresh the page to try again.</p></div>';
    }
  }
}

ccgPrimeRetroSpecialsUi();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ccgRunCollection, { once: true });
} else {
  ccgRunCollection();
}
