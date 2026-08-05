const { ensureFeaturePages } = require('./ensure-feature-sitemap-pages.js');

ensureFeaturePages();
require('../tools/seo/generate-sitemap.js');
