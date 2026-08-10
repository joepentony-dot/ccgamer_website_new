(() => {
  'use strict';

  const root = document.querySelector('[data-video-library]');
  if (!root) return;

  const results = root.querySelector('[data-video-results]');
  const search = root.querySelector('[data-video-search]');
  const count = root.querySelector('[data-video-result-count]');
  const empty = root.querySelector('[data-video-empty]');
  const more = root.querySelector('[data-video-more]');
  const filters = [...root.querySelectorAll('[data-video-filter]')];
  const indexUrl = root.getAttribute('data-video-index') || '/videos/video-index.json';

  if (!results || !search) return;

  let items = [];
  let activeFilter = 'all';
  let visibleLimit = 48;
  const PAGE_SIZE = 48;

  const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    return element;
  };

  const buildCard = (item) => {
    const article = make('article', 'video-library-card');
    const link = make('a', 'video-library-card__link');
    link.href = item.url;

    const media = make('span', 'video-library-card__media');
    const image = document.createElement('img');
    image.src = item.thumbnail;
    image.alt = `${item.title} video thumbnail`;
    image.loading = 'lazy';
    image.decoding = 'async';
    media.appendChild(image);
    media.appendChild(make('span', 'video-library-card__badge', item.badge));

    const copy = make('span', 'video-library-card__copy');
    copy.appendChild(make('span', 'video-library-card__title', item.title));
    if (item.description) copy.appendChild(make('span', 'video-library-card__description', item.description));

    const meta = make('span', 'video-library-card__meta');
    if (item.platform) meta.appendChild(make('span', '', item.platform));
    if (item.year) meta.appendChild(make('span', '', String(item.year)));
    if (item.collectionLabel && !item.platform) meta.appendChild(make('span', '', item.collectionLabel));
    if (meta.childNodes.length) copy.appendChild(meta);

    link.append(media, copy);
    article.appendChild(link);
    return article;
  };

  const filteredItems = () => {
    const query = normalize(search.value);
    return items.filter((item) => {
      if (activeFilter !== 'all' && item.filter !== activeFilter) return false;
      if (!query) return true;
      return normalize(`${item.title} ${item.description} ${item.platform} ${item.year} ${item.publisher || ''} ${item.collectionLabel || ''}`).includes(query);
    });
  };

  const render = () => {
    const matches = filteredItems();
    const visible = matches.slice(0, visibleLimit);
    const fragment = document.createDocumentFragment();
    visible.forEach((item) => fragment.appendChild(buildCard(item)));
    results.replaceChildren(fragment);

    if (count) count.textContent = `${matches.length} ${matches.length === 1 ? 'video' : 'videos'} found`;
    if (empty) empty.hidden = matches.length !== 0;
    if (more) more.hidden = matches.length <= visibleLimit;
  };

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.getAttribute('data-video-filter') || 'all';
      visibleLimit = PAGE_SIZE;
      filters.forEach((candidate) => candidate.setAttribute('aria-pressed', candidate === button ? 'true' : 'false'));
      render();
    });
  });

  search.addEventListener('input', () => {
    visibleLimit = PAGE_SIZE;
    render();
  });

  more?.addEventListener('click', () => {
    visibleLimit += PAGE_SIZE;
    render();
  });

  fetch(indexUrl, { headers: { Accept: 'application/json' } })
    .then((response) => {
      if (!response.ok) throw new Error(`Video index returned ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      items = Array.isArray(payload?.items) ? payload.items : [];
      if (!items.length) return;
      render();
    })
    .catch((error) => {
      console.warn('[video-library] Could not load searchable video index:', error.message);
    });
})();
