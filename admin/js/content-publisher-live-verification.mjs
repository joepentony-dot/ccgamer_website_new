// A 200 response is not enough to confirm publication: SPA/fallback routes
// can serve unrelated HTML. Require the generated canonical and OG route.
export function publishedGamePageMatches(html, slug, siteOrigin = 'https://www.cheekycommodoregamer.co.uk') {
  const safeSlug = String(slug || '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(safeSlug)) return false;
  const expected = `${siteOrigin}/games/${safeSlug}/`;
  const markup = String(html || '');
  if (!markup.includes('<html')) return false;

  const attributes = (tag) => {
    const result = {};
    for (const match of tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      result[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
    }
    return result;
  };
  const canonical = [...markup.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .some((attrs) => attrs.rel?.toLowerCase() === 'canonical' && attrs.href === expected);
  const social = [...markup.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .some((attrs) => attrs.property?.toLowerCase() === 'og:url' && attrs.content === expected);
  return canonical && social;
}
