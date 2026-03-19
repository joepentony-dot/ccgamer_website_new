const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://www.cheekycommodoregamer.co.uk';

// Load your actual game index (this is the correct source)
const games = require('../games/games-index.json');

const staticPages = [
  '',
  '/games/',
  '/games/genres/',
  '/games/collections/',
  '/music/',
  '/music/amiga-demo-music/',
  '/retro-events/',
  '/retro-specials/'
];

function generateSitemap() {
  let urls = [];

  // Static pages
  staticPages.forEach(page => {
    urls.push(`
  <url>
    <loc>${SITE_URL}${page}</loc>
    <changefreq>weekly</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>`);
  });

  // Game pages (THIS IS THE IMPORTANT FIX)
  games.forEach(game => {
    const loc = `${SITE_URL}/games/${game.slug}/`;

    let imageTag = '';

    // ✅ Use REAL thumbnail from your data
    if (game.thumbnail) {
      imageTag = `
    <image:image>
      <image:loc>${SITE_URL}/${game.thumbnail}</image:loc>
      <image:title>${escapeXml(game.title)}</image:title>
    </image:image>`;
    }

    urls.push(`
  <url>
    <loc>${loc}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>${imageTag}
  </url>`);
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset 
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(__dirname, '../sitemap.xml'), sitemap);

  console.log(`✅ Sitemap generated with ${games.length} games`);
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

generateSitemap();