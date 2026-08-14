"use strict";

const fs = require("fs");
const path = require("path");

function readGameDescriptionEnrichments(repoRoot) {
  const filePath = path.join(repoRoot, "data", "game-description-enrichments.json");
  if (!fs.existsSync(filePath)) return {};

  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!payload || typeof payload !== "object") return {};
  if (payload.games && typeof payload.games === "object") return payload.games;
  return payload;
}

function mergeGameDescriptionEnrichments(games, enrichments) {
  const source = enrichments && typeof enrichments === "object" ? enrichments : {};
  return (Array.isArray(games) ? games : []).map((game) => {
    const slug = String(game?.slug || "").trim();
    const entry = source[slug];
    const description = String(entry?.description || "").trim();
    if (!description) return game;
    return {
      ...game,
      description,
      _ccgEnrichedDescription: true,
    };
  });
}

module.exports = {
  mergeGameDescriptionEnrichments,
  readGameDescriptionEnrichments,
};
