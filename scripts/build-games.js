const fs = require("fs");
const path = require("path");
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

const isLocalRun = !process.env.CI && !process.env.GITHUB_ACTIONS;
const forcePageBuild = process.env.CCG_BUILD_GAME_PAGES === "1";
const shouldBuildPages = isLocalRun || forcePageBuild;

if (shouldBuildPages) {
  const template = fs.readFileSync("templates/game-template.html", "utf8");

  const redirectTemplate = fs.readFileSync(
    "templates/game-redirect-template.html",
    "utf8"
  );

  const fillTemplate = (source, game) =>
    source
      .replaceAll("[title]", String(game.title ?? ""))
      .replaceAll("[slug]", String(game.slug ?? ""))
      .replaceAll("[year]", String(game.year ?? ""))
      .replaceAll("[publisher]", String(game.publisher ?? ""))
      .replaceAll("[thumbnail]", String(game.thumbnail ?? ""));

  games.forEach((game) => {
    const gameDir = path.join("games", game.slug);
    const gamePagePath = path.join(gameDir, "index.html");
    const gameRedirectPath = path.join("games", `${game.slug}.html`);

    fs.mkdirSync(gameDir, { recursive: true });
    fs.writeFileSync(gamePagePath, fillTemplate(template, game));
    fs.writeFileSync(gameRedirectPath, fillTemplate(redirectTemplate, game));
  });
}
