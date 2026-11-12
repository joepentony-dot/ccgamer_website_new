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


// Existing-game recovery must prove the deployed bytes are the current main output
// and that the saved source revision is an ancestor of that main commit.
export function savedRevisionMatchesLive({
  liveHtml = '',
  repositoryHtml = '',
  comparison = null,
  pageCommitComparison = null
} = {}) {
  const status = String(comparison?.status || '').toLowerCase();
  const behindBy = Number(comparison?.behind_by);
  const sourceIsInMain = (status === 'ahead' || status === 'identical') && behindBy === 0;
  // Existing-game edits already have a page at the canonical URL. Its last
  // committed generated revision must be *after* the saved source commit.
  // Comparing only current-main HTML to live HTML can otherwise match the
  // old version even though the edit has not been published.
  const pageStatus = String(pageCommitComparison?.status || '').toLowerCase();
  const pageBehind = Number(pageCommitComparison?.behind_by);
  const pageAhead = Number(pageCommitComparison?.ahead_by);
  const pageRebuiltAfterSource = pageStatus === 'ahead' && pageBehind === 0 && pageAhead >= 1;
  return sourceIsInMain && pageRebuiltAfterSource && String(liveHtml) === String(repositoryHtml);
}
