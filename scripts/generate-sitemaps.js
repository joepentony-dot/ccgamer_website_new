const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://www.cheekycommodoregamer.co.uk';
const OUTPUT_PATH = path.join(__dirname, '../sitemap.xml');

function generateSitemapIndex() {
  const currentDate = new Date().toISOString().slice(0, 10);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <sitemap>
    <loc>${SITE_URL}/sitemap-pages.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>

  <sitemap>
    <loc>${SITE_URL}/sitemap-games.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>

</sitemapindex>`;

  fs.writeFileSync(OUTPUT_PATH, sitemap);

  console.log('✅ sitemap.xml generated as sitemap index');
}

generateSitemapIndex();
