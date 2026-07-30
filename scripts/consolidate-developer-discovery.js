const fs = require('fs');

const gamesIndexPath = 'games/index.html';
const developerHubPath = 'games/developers/index.html';
const developerWorkflowPath = '.github/workflows/developer-archives.yml';
const staticPagesPath = 'tools/seo/static-pages.json';
const sitemapPaths = ['sitemap.xml', 'sitemap-pages.xml'];

const oldBlock = `                <div class="games-hero__stats" data-games-developers-shortcut="true">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/developers/">Browse by Developer</a>
                    <a class="ccg-btn ccg-btn--secondary" href="/games/publishers/">Browse by Publisher</a>
                    <span>Explore games through the developer credits already recorded in the CCG archive.</span>
                </div>`;

const newBlock = `                <div class="games-hero__stats" data-games-publishers-shortcut="true">
                    <a class="ccg-btn ccg-btn--secondary" href="/games/publishers/">Browse by Publisher</a>
                    <span>Explore games through the publisher credits recorded in the CCG archive.</span>
                </div>`;

const gamesIndex = fs.readFileSync(gamesIndexPath, 'utf8');
if (!gamesIndex.includes(oldBlock)) {
  throw new Error('Expected Browse by Developer block was not found in games/index.html');
}
fs.writeFileSync(gamesIndexPath, gamesIndex.replace(oldBlock, newBlock));

for (const path of [developerHubPath, developerWorkflowPath]) {
  if (fs.existsSync(path)) fs.unlinkSync(path);
}

if (fs.existsSync(staticPagesPath)) {
  const pages = JSON.parse(fs.readFileSync(staticPagesPath, 'utf8'));
  const filtered = pages.filter(page => page !== 'games/developers/index.html');
  fs.writeFileSync(staticPagesPath, `${JSON.stringify(filtered, null, 2)}\n`);
}

for (const sitemapPath of sitemapPaths) {
  if (!fs.existsSync(sitemapPath)) continue;
  let xml = fs.readFileSync(sitemapPath, 'utf8');
  xml = xml.replace(/\s*<url>\s*<loc>https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/developers\/<\/loc>[\s\S]*?<\/url>/g, '');
  fs.writeFileSync(sitemapPath, xml);
}

console.log('Developer hub removed and Browse Games discovery consolidated under publishers.');
