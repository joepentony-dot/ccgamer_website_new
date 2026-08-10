#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const target = path.resolve(__dirname, "generate-zzap64-review-links.js");
let source = fs.readFileSync(target, "utf8");

function replaceOnce(before, after, label) {
  if (!source.includes(before)) {
    if (source.includes(after)) return;
    throw new Error(`Could not find generator section for ${label}`);
  }
  source = source.replace(before, after);
}

replaceOnce(
  'const REQUEST_DELAY_MS = 160;\nconst FETCH_TIMEOUT_MS = 15000;\nconst MAX_LIVE_CANDIDATES = 6;',
  'const REQUEST_DELAY_MS = 900;\nconst FETCH_TIMEOUT_MS = 15000;\nconst MAX_LIVE_CANDIDATES = 8;\nconst LEMON_SEARCH_ALIASES = Object.freeze({\n  "Graphic Adventure Creator": ["GAC"],\n  "Shoot \'Em Up Construction Kit": ["SEUCK", "Shoot Em Up Construction Kit"],\n  "R.I.S.K.": ["Risk"],\n  "B-24 Flight Simulator": ["B24 Flight Simulator"],\n  "Kikstart II": ["Kikstart 2"],\n  "World Class Leaderboard": ["World Class Leader Board"],\n  "APB": ["A.P.B."],\n  "F-16 Combat Pilot": ["F16 Combat Pilot"],\n  "Computer Scrabble Deluxe": ["Scrabble Deluxe"],\n  "The Sentinel": ["Sentinel"],\n  "Batman: The Movie": ["Batman The Movie", "Batman"],\n  "R-Type": ["R Type"],\n  "Rambo": ["Rambo: First Blood Part II", "Rambo First Blood Part 2"],\n  "Ultima IV": ["Ultima 4"],\n  "Doomdark\'s Revenge": ["Doomdarks Revenge"],\n  "Hunter\'s Moon": ["Hunters Moon"]\n});',
  "rate limit and aliases"
);

replaceOnce(
  '  const variants = [raw, noArticle, punctuationLight, canonical, beforeColon];',
  '  const variants = [raw, noArticle, punctuationLight, canonical, beforeColon, ...(LEMON_SEARCH_ALIASES[raw] || [])];',
  "search aliases"
);

fs.writeFileSync(target, source, "utf8");
console.log("Prepared slower Zzap link enrichment with additional Lemon search aliases.");
