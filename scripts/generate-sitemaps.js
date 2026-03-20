const fs = require('fs');

function generateSitemapIndex() {
  const today = new Date().toISOString().split('T')[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <sitemap>
    <loc>https://www.cheekycommodoregamer.co.uk/sitemap-pages.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>

  <sitemap>
    <loc>https://www.cheekycommodoregamer.co.uk/sitemap-games.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>

</sitemapindex>`;
}

function writeRootSitemap() {
  const xml = generateSitemapIndex();

  if (xml.includes('<urlset')) {
    throw new Error('❌ BLOCKED: sitemap.xml cannot contain <urlset>');
  }

  fs.writeFileSync('sitemap.xml', xml);
}

writeRootSitemap();
