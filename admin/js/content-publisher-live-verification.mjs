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



// Deployment performs a narrowly scoped, deterministic first-paint rewrite
// for a game's 3D box. Reverse only those three known substitutions before
// comparing the deployed HTML to the committed revision. Do not strip arbitrary
// HTML or ignore changes to editorial content, ratings or navigation.
export function normaliseDeployedGameHtml(liveHtml, slug) {
  let html = String(liveHtml || '');
  if (!html.includes('data-ccg-box3d-prefilled="true"')) return html;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug || ''))) return null;

  const stagedHero = '<section class="game-hero game-hero--has-box3d" data-ccg-box3d-prefilled="true">';
  const sourceHero = '<section class="game-hero">';
  const stagedSlot = 'class="game-hero__box3d"';
  const sourceSlot = 'class="game-hero__box3d" hidden';
  if (html.split(stagedHero).length !== 2 || html.split(stagedSlot).length !== 2) return null;

  const imgPattern = /(<img class="game-hero__box3d-img"\s*)src="(\/resources\/images\/games\/boxes-3d\/([^"]+)\.webp)" alt="([^"]*)"/g;
  const matches = [...html.matchAll(imgPattern)];
  if (matches.length !== 1) return null;
  const filenames = [slug, slug[0].toUpperCase() + slug.slice(1), slug.toUpperCase()];
  const expectedAlt = '3D box artwork for ' + slug.replaceAll('-', ' ');
  if (!filenames.includes(matches[0][3]) || matches[0][4] !== expectedAlt) return null;

  html = html.replace(stagedHero, sourceHero).replace(stagedSlot, sourceSlot);
  return html.replace(imgPattern, (_all, prefix) => prefix + 'alt=""');
}

// Existing-game recovery must prove the deployed bytes are the current main output
// and that the saved source revision is an ancestor of that main commit.
export function savedRevisionMatchesLive({
  liveHtml = '',
  repositoryHtml = '',
  comparison = null,
  pageCommitComparison = null,
  slug = ''
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
  return sourceIsInMain && pageRebuiltAfterSource &&
    normaliseDeployedGameHtml(liveHtml, slug) === String(repositoryHtml);
}
