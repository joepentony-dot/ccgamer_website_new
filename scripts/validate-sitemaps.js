const fs = require('fs');

function validateSitemap() {
  const xml = fs.readFileSync('sitemap.xml', 'utf8');

  if (!xml.includes('<sitemapindex')) {
    throw new Error('❌ sitemap.xml MUST be sitemapindex');
  }

  if (xml.includes('<urlset')) {
    throw new Error('❌ sitemap.xml MUST NOT contain urlset');
  }

  if (!xml.includes('sitemap-pages.xml') || !xml.includes('sitemap-games.xml')) {
    throw new Error('❌ sitemap.xml missing required child sitemaps');
  }

  console.log('✅ sitemap.xml structure valid');
}

validateSitemap();
