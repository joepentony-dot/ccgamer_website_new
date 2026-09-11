import collectionArchive from "./collectionArchive.js";

const entries = collectionArchive.retroSpecials.entries.filter((entry) =>
  entry.url.startsWith("/retro-specials/zzap64-")
);

if (!entries.length) {
  throw new Error("[ccg-eleventy] Zzap!64 hub has no source-backed Retro Specials entries.");
}

const duplicateUrls = entries
  .map((entry) => entry.url)
  .filter((url, index, urls) => urls.indexOf(url) !== index);

if (duplicateUrls.length) {
  throw new Error(`[ccg-eleventy] Zzap!64 hub contains duplicate URLs: ${[...new Set(duplicateUrls)].join(", ")}`);
}

export default {
  name: "Zzap!64",
  description: "A lightweight index of the existing Cheeky Commodore Gamer Zzap!64 award and review features, keeping the established Retro Specials URLs as the canonical detail routes.",
  entries
};
