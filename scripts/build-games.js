const fs = require("fs");
const games = require("../games/games.json");

const indexData = games.map((game) => ({
  slug: game.slug,
  title: game.title,
  year: game.year,
  thumbnail: game.thumbnail,
}));

fs.writeFileSync("games/games-index.json", JSON.stringify(indexData, null, 2));

const searchData = games.map((game) => ({
  title: game.title,
  slug: game.slug,
}));

fs.writeFileSync("games/games-search.json", JSON.stringify(searchData, null, 2));

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

games.forEach((game) => {
  sitemap += `\n <url>\n   <loc>https://www.cheekycommodoregamer.co.uk/games/${game.slug}/</loc>\n   <changefreq>monthly</changefreq>\n   <priority>0.8</priority>\n </url>`;
});

sitemap += `\n</urlset>`;

fs.writeFileSync("sitemap-games.xml", sitemap);
