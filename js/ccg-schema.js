(function () {
  function addSchema(id, data) {
    if (!data) return;

    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = JSON.stringify(data);

    document.head.appendChild(script);
  }

  function clean(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      if (Array.isArray(value)) {
        const cleanedItems = value
          .map((item) => {
            if (item && typeof item === 'object') {
              clean(item);
              return Object.keys(item).length ? item : undefined;
            }
            return item;
          })
          .filter((item) => item !== undefined && item !== null && item !== '');

        if (!cleanedItems.length) {
          delete obj[key];
        } else {
          obj[key] = cleanedItems;
        }
        return;
      }

      if (value && typeof value === 'object') {
        clean(value);
        if (!Object.keys(value).length) {
          delete obj[key];
        }
        return;
      }

      if (value === undefined || value === null || value === '') {
        delete obj[key];
      }
    });

    return obj;
  }

  function getSiteOrigin() {
    return 'https://www.cheekycommodoregamer.co.uk';
  }

  function normaliseAssetUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return undefined;
    if (/^https?:\/\//i.test(raw)) return raw;
    return `${getSiteOrigin()}/${raw.replace(/^\/+/, '')}`;
  }

  function hasStaticGameGraph() {
    return !!document.querySelector('script[type="application/ld+json"][data-ccg-schema="game-graph"]');
  }

  function loadGameReviewRuntime() {
    const isGamePage = document.documentElement?.getAttribute('data-ccg-page') === 'single-game'
      || !!document.querySelector('.ccg-page--single-game');
    if (!isGamePage || document.querySelector('script[data-ccg-zzap-game-reviews-runtime]')) return;

    const script = document.createElement('script');
    script.src = '/js/zzap64-game-reviews-runtime.js';
    script.setAttribute('data-ccg-zzap-game-reviews-runtime', 'true');
    document.body.appendChild(script);
  }

  window.ccgSchemaWebsite = function () {
    addSchema('ccg-schema-website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Cheeky Commodore Gamer',
      url: `${getSiteOrigin()}/`
    });
  };

  window.ccgSchemaGame = function (game) {
    if (!game || hasStaticGameGraph()) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: game.title,
      url: `${getSiteOrigin()}/games/${game.slug}/`,
      image: normaliseAssetUrl(game.thumbnail || game.thumb || game.cover),
      datePublished: game.year ? String(game.year) : undefined,
      genre: Array.isArray(game.genres) ? game.genres : [],
      gamePlatform: game.system || 'Commodore 64',
      publisher: game.credits?.publisher || game.publisher || [],
      author: game.credits?.musician || game.composer || game.musicBy || [],
      description: game.description || '',
      aggregateRating: game.ccg_rating
        ? {
            '@type': 'AggregateRating',
            ratingValue: String(game.ccg_rating),
            bestRating: '10',
            ratingCount: '1'
          }
        : undefined
    };

    clean(schema);
    addSchema('ccg-schema-game', schema);
  };

  window.ccgSchemaBreadcrumb = function (items) {
    if (!items || !items.length || hasStaticGameGraph()) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    };

    clean(schema);
    addSchema('ccg-schema-breadcrumb', schema);
  };

  window.ccgSchemaCollection = function (collection) {
    if (!collection || !Array.isArray(collection.items) || !collection.items.length) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: collection.title,
      itemListElement: collection.items
        .filter((game) => game && game.slug)
        .map((game, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${getSiteOrigin()}/games/${game.slug}/`
        }))
    };

    clean(schema);
    addSchema('ccg-schema-collection', schema);
  };

  window.ccgSchemaComposer = function (composerName, games) {
    if (!composerName) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: composerName,
      jobTitle: 'Video Game Composer',
      worksFor: {
        '@type': 'Organization',
        name: 'Commodore / Amiga'
      },
      subjectOf: Array.isArray(games)
        ? games
            .filter((game) => game && game.slug)
            .map((game) => ({
              '@type': 'VideoGame',
              name: game.title,
              url: `${getSiteOrigin()}/games/${game.slug}/`
            }))
        : []
    };

    clean(schema);
    addSchema('ccg-schema-composer', schema);
  };

  function initSchemaRuntime() {
    window.ccgSchemaWebsite();
    loadGameReviewRuntime();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSchemaRuntime, { once: true });
  } else {
    initSchemaRuntime();
  }
})();
