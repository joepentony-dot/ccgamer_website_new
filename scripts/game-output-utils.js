(function universalModule(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }

  const exports = factory();
  root.CCGGameOutputUtils = exports;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGameOutputUtils() {
  const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
  const GAME_ROUTE_PREFIX = '/games';
  const SPECIAL_SLUG_ALIASES = new Map([
    ['smash-t-5', 'smash-tv'],
    ['smash-t-v', 'smash-tv']
  ]);
  const GAME_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function slugifySegment(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function normalizeGameSlug(value, fallbackValue = '') {
    const primary = slugifySegment(value);
    const fallback = slugifySegment(fallbackValue);
    const slug = SPECIAL_SLUG_ALIASES.get(primary) || primary || SPECIAL_SLUG_ALIASES.get(fallback) || fallback;
    return slug;
  }

  function isValidGameSlug(value) {
    return GAME_SLUG_PATTERN.test(String(value || '').trim());
  }

  function assertValidGameSlug(value) {
    const slug = String(value || '').trim();
    if (!isValidGameSlug(slug)) {
      throw new Error(`Invalid game slug: ${value}`);
    }
    return slug;
  }

  function slugToGameId(slug) {
    return normalizeGameSlug(slug).replace(/-/g, '_');
  }

  function getGameCanonicalPath(slug) {
    const normalizedSlug = assertValidGameSlug(normalizeGameSlug(slug));
    return `${GAME_ROUTE_PREFIX}/${normalizedSlug}/`;
  }

  function getGameCanonicalUrl(slug, origin = SITE_ORIGIN) {
    return `${String(origin || SITE_ORIGIN).replace(/\/+$/, '')}${getGameCanonicalPath(slug)}`;
  }

  function getGameSeoUrls(slug, origin = SITE_ORIGIN) {
    const canonicalUrl = getGameCanonicalUrl(slug, origin);
    return {
      canonicalUrl,
      ogUrl: canonicalUrl,
      twitterUrl: canonicalUrl
    };
  }

  function getGameRedirectStubData(slug, origin = SITE_ORIGIN) {
    const normalizedSlug = assertValidGameSlug(normalizeGameSlug(slug));
    const canonicalPath = getGameCanonicalPath(normalizedSlug);
    return {
      slug: normalizedSlug,
      canonicalPath,
      canonicalUrl: getGameCanonicalUrl(normalizedSlug, origin),
      redirectTarget: canonicalPath,
      robots: 'noindex,follow'
    };
  }

  function formatGameSitemapUrl(slug, origin = SITE_ORIGIN) {
    return getGameCanonicalUrl(slug, origin);
  }

  return {
    SITE_ORIGIN,
    GAME_ROUTE_PREFIX,
    GAME_SLUG_PATTERN,
    normalizeGameSlug,
    isValidGameSlug,
    assertValidGameSlug,
    slugToGameId,
    getGameCanonicalPath,
    getGameCanonicalUrl,
    getGameSeoUrls,
    getGameRedirectStubData,
    formatGameSitemapUrl
  };
});
