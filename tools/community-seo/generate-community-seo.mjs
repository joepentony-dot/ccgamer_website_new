import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const outDir = path.join(repoRoot, 'community', 'seo');
const baseSiteUrl = 'https://www.cheekycommodoregamer.co.uk';

function nowMinusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function formatGeneratedAt(date = new Date()) {
  return date.toISOString();
}

function scoreTrending(item) {
  const avgRating = Number(item.avg_rating || 0);
  const ratingCount = Number(item.rating_count || 0);
  const commentCount = Number(item.comment_count || 0);
  return (ratingCount * 1) + (commentCount * 2) + avgRating;
}

async function fetchRows(endpoint, env) {
  const url = `${env.url.replace(/\/$/, '')}/rest/v1/${endpoint}`;
  const response = await fetch(url, {
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed (${response.status}) for ${endpoint}: ${text.slice(0, 280)}`);
  }

  return response.json();
}

function aggregateByGame(ratings, comments) {
  const map = new Map();

  ratings.forEach((row) => {
    if (!row.game_slug) return;
    const item = map.get(row.game_slug) || { game_slug: row.game_slug, rating_sum: 0, rating_count: 0, comment_count: 0 };
    item.rating_sum += Number(row.rating || 0);
    item.rating_count += 1;
    map.set(row.game_slug, item);
  });

  comments.forEach((row) => {
    if (!row.game_slug) return;
    const item = map.get(row.game_slug) || { game_slug: row.game_slug, rating_sum: 0, rating_count: 0, comment_count: 0 };
    item.comment_count += 1;
    map.set(row.game_slug, item);
  });

  return Array.from(map.values()).map((item) => ({
    game_slug: item.game_slug,
    avg_rating: item.rating_count ? item.rating_sum / item.rating_count : 0,
    rating_count: item.rating_count,
    comment_count: item.comment_count,
    score: scoreTrending({
      avg_rating: item.rating_count ? item.rating_sum / item.rating_count : 0,
      rating_count: item.rating_count,
      comment_count: item.comment_count
    })
  }));
}

function aggregateMembers(ratings, comments, badges, profilesById) {
  const map = new Map();
  const upsert = (userId) => {
    if (!userId) return null;
    if (!map.has(userId)) {
      map.set(userId, {
        user_id: userId,
        username: profilesById.get(userId) || 'user',
        rating_count: 0,
        comment_count: 0,
        badge_count: 0,
        points: 0
      });
    }
    return map.get(userId);
  };

  ratings.forEach((row) => {
    const item = upsert(row.user_id);
    if (!item) return;
    item.rating_count += 1;
    item.points += 1;
  });

  comments.forEach((row) => {
    const item = upsert(row.user_id);
    if (!item) return;
    item.comment_count += 1;
    item.points += 2;
  });

  badges.forEach((row) => {
    const item = upsert(row.user_id);
    if (!item) return;
    item.badge_count += 1;
    item.points += 5;
  });

  return Array.from(map.values()).sort((a, b) => b.points - a.points).slice(0, 10);
}

function pageTemplate({ title, description, canonicalPath, heading, intro, bodyHtml, generatedAt }) {
  return `<!DOCTYPE html>
<html lang="en" data-ccg-page="community-seo">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${baseSiteUrl}${canonicalPath}" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/resources/css/ccg-master.css" />
  <link rel="stylesheet" href="/resources/css/ccg-mode.css" />
  <link rel="stylesheet" href="/resources/css/ccg-overlays.css" />
  <link rel="stylesheet" href="/resources/css/ccg-footer.css" />
  <link rel="stylesheet" href="/resources/css/ccg-community.css" />
</head>
<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">
  <div class="ccg-bg" aria-hidden="true">
    <div class="ccg-bg-starfield" aria-hidden="true"></div>
    <div class="ccg-bg-grid" aria-hidden="true"></div>
  </div>

  <header class="ccg-header" data-ccg-header>
    <div class="ccg-header-inner">
      <a href="/home.html" class="ccg-brand">
        <img src="/resources/images/ccgamer-logo.png" alt="Cheeky Commodore Gamer logo" class="ccg-brand__logo" width="1500" height="1032" />
        <div class="ccg-brand__text">
          <div class="ccg-brand__kicker">Stay a while, stay forever!</div>
          <div class="ccg-brand__title">
            <span class="ccg-brand__neon-cheeky">CHEEKY COMMODORE</span>
            <span class="ccg-brand__neon-sub">GAMER</span>
          </div>
        </div>
      </a>
      <nav class="ccg-nav" aria-label="Primary navigation">
        <ul class="ccg-nav__list ccg-nav__list--primary">
          <li><a href="/home.html" class="ccg-nav__link">Home</a></li>
          <li><a href="/games/index.html" class="ccg-nav__link">Games</a></li>
          <li><a href="/games/genres/index.html" class="ccg-nav__link">Genres</a></li>
          <li><a href="/games/collections/index.html" class="ccg-nav__link">Collections</a></li>
          <li><a href="/community/index.html" class="ccg-nav__link">Community</a></li>
        </ul>
      </nav>
      <div class="ccg-header-actions"></div>
    </div>
    <div class="ccg-header-neon-strip"></div>
  </header>

  <main class="ccg-community-layout">
    <section class="ccg-community-card">
      <h1>${heading}</h1>
      <p>${intro}</p>
      <p class="ccg-community-muted">Last generated: ${generatedAt}</p>
      <div class="ccg-seo-links">
        <a href="/community/seo/top-rated.html">Top Rated</a>
        <a href="/community/seo/most-discussed.html">Most Discussed</a>
        <a href="/community/seo/trending.html">Trending</a>
        <a href="/community/seo/top-members.html">Top Members</a>
      </div>
    </section>
    <section class="ccg-community-card">
      ${bodyHtml}
    </section>
  </main>

  <footer class="ccg-footer">
    <p class="ccg-footer__text">© <span data-ccg-year></span> Cheeky Commodore Gamer.</p>
  </footer>
  <script src="/js/ccg-global.js" defer></script>
  <script src="/js/ccg-mode-engine.js" defer></script>
</body>
</html>`;
}

function gameTable(items, scoreLabel) {
  if (!items.length) return '<p class="ccg-community-muted">No community data available for this page.</p>';

  return `<div class="community-seo-table-wrap"><table class="community-seo-table"><thead><tr><th>Game</th><th>Average Rating</th><th>Ratings</th><th>Comments</th><th>${scoreLabel}</th></tr></thead><tbody>${items.map((item) => `<tr><td><a href="/games/${encodeURIComponent(item.game_slug)}/">${item.game_slug}</a></td><td>${Number(item.avg_rating || 0).toFixed(2)}</td><td>${Number(item.rating_count || 0)}</td><td>${Number(item.comment_count || 0)}</td><td>${Number(item.score || 0).toFixed(2)}</td></tr>`).join('')}</tbody></table></div>`;
}

function membersTable(items) {
  if (!items.length) return '<p class="ccg-community-muted">No member activity available for this page.</p>';

  return `<div class="community-seo-table-wrap"><table class="community-seo-table"><thead><tr><th>Member</th><th>Comments</th><th>Ratings</th><th>Badges</th><th>Points</th></tr></thead><tbody>${items.map((item) => `<tr><td><a href="/community/profile.html?u=${encodeURIComponent(item.username)}">@${item.username}</a></td><td>${Number(item.comment_count || 0)}</td><td>${Number(item.rating_count || 0)}</td><td>${Number(item.badge_count || 0)}</td><td>${Number(item.points || 0)}</td></tr>`).join('')}</tbody></table></div>`;
}

async function loadCommunityData() {
  const env = {
    url: process.env.CCG_SUPABASE_URL,
    key: process.env.CCG_SUPABASE_ANON_KEY
  };

  if (!env.url || !env.key) {
    return {
      topRated: [],
      mostDiscussed: [],
      trending: [],
      topMembers: [],
      mode: 'empty'
    };
  }

  const [ratingsAll, ratings7d, ratings30d, comments7d, comments30d, badges30d, profiles] = await Promise.all([
    fetchRows('game_ratings?select=user_id,game_slug,rating,created_at&limit=10000', env),
    fetchRows(`game_ratings?select=user_id,game_slug,rating,created_at&created_at=gte.${encodeURIComponent(nowMinusDays(7))}&limit=10000`, env),
    fetchRows(`game_ratings?select=user_id,game_slug,rating,created_at&created_at=gte.${encodeURIComponent(nowMinusDays(30))}&limit=10000`, env),
    fetchRows(`game_comments?select=user_id,game_slug,created_at&created_at=gte.${encodeURIComponent(nowMinusDays(7))}&limit=10000`, env),
    fetchRows(`game_comments?select=user_id,game_slug,created_at&created_at=gte.${encodeURIComponent(nowMinusDays(30))}&limit=10000`, env),
    fetchRows(`user_badges?select=user_id,badge_key,awarded_at&awarded_at=gte.${encodeURIComponent(nowMinusDays(30))}&limit=10000`, env).catch(() => []),
    fetchRows('profiles?select=id,username&limit=10000', env).catch(() => [])
  ]);

  const topRated = aggregateByGame(ratingsAll, [])
    .filter((item) => item.rating_count >= 5)
    .sort((a, b) => (b.avg_rating - a.avg_rating) || (b.rating_count - a.rating_count))
    .slice(0, 10);

  const mostDiscussed = aggregateByGame([], comments30d)
    .sort((a, b) => b.comment_count - a.comment_count)
    .slice(0, 10)
    .map((item) => ({ ...item, score: item.comment_count }));

  const trending = aggregateByGame(ratings7d, comments7d)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const profilesById = new Map((profiles || []).map((row) => [row.id, row.username || 'user']));
  const topMembers = aggregateMembers(ratings30d, comments30d, badges30d, profilesById);

  return {
    topRated,
    mostDiscussed,
    trending,
    topMembers,
    mode: 'live'
  };
}

async function writePage(fileName, payload) {
  const target = path.join(outDir, fileName);
  await fs.writeFile(target, payload, 'utf8');
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const data = await loadCommunityData();
  const generatedAt = formatGeneratedAt();

  await writePage('top-rated.html', pageTemplate({
    title: 'CCG Community Top Rated Games',
    description: 'Top rated games in the Cheeky Commodore Gamer community.',
    canonicalPath: '/community/seo/top-rated.html',
    heading: 'Top Rated Games (All Time)',
    intro: 'Community average scores with a minimum 5-rating threshold.',
    bodyHtml: gameTable(data.topRated, 'Rating Score'),
    generatedAt
  }));

  await writePage('most-discussed.html', pageTemplate({
    title: 'CCG Community Most Discussed Games',
    description: 'Most discussed games in the CCG community during the last 30 days.',
    canonicalPath: '/community/seo/most-discussed.html',
    heading: 'Most Discussed Games (30 Days)',
    intro: 'The games attracting the most community comments in the last month.',
    bodyHtml: gameTable(data.mostDiscussed, 'Discussion Score'),
    generatedAt
  }));

  await writePage('trending.html', pageTemplate({
    title: 'CCG Community Trending Games',
    description: 'Trending games in the CCG community based on recent ratings and comments.',
    canonicalPath: '/community/seo/trending.html',
    heading: 'Trending Games (7 Days)',
    intro: 'Weighted momentum from ratings and comments in the past week.',
    bodyHtml: gameTable(data.trending, 'Trending Score'),
    generatedAt
  }));

  await writePage('top-members.html', pageTemplate({
    title: 'CCG Community Top Members',
    description: 'Top community members by points from comments, ratings, and badges.',
    canonicalPath: '/community/seo/top-members.html',
    heading: 'Top Community Members (30 Days)',
    intro: 'Leaderboard based on comments, ratings, and badge milestones.',
    bodyHtml: membersTable(data.topMembers),
    generatedAt
  }));

  console.log(`Generated 4 community SEO pages in ${outDir} (${data.mode} data mode).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
