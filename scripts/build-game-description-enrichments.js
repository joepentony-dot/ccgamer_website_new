#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");
const videoMetadataPath = path.join(repoRoot, "data", "video-metadata.json");
const outputPath = path.join(repoRoot, "data", "game-description-enrichments.json");

const MIN_WORDS = 90;
const TARGET_WORDS = 135;
const MAX_WORDS = 165;

const overrides = {
  "the-activision-decathlon": {
    description: "The Activision Decathlon is the 1984 Commodore 64 conversion of Activision's athletics game, based on David Crane's original design. Up to four players can contest all ten events in sequence or practise them individually: the 100 metres, long jump, shot put, high jump, 400 metres, 110-metre hurdles, discus, pole vault, javelin and 1500 metres. Running events demand fast, steady joystick movement, while jumps and throws add a precisely timed fire-button press to set the angle or release point. Each performance earns points according to its time, height or distance, and the highest combined score wins the decathlon. The C64 edition retains the multiplayer rivalry and demanding physical controls that made the game famous, while adding colourful presentation, animated athletes and crowd effects suited to Commodore hardware.",
    sources: [
      "https://www.mobygames.com/game/11537/the-activision-decathlon/",
      "https://en.wikipedia.org/wiki/The_Activision_Decathlon",
      "https://atariage.com/manual_html_page.php?SoftwareID=967",
      "https://www.youtube.com/watch?v=zKdXbca2b8o"
    ]
  },
  "the-happiest-days-of-your-life": {
    description: "The Happiest Days of Your Life is a 1986 Commodore 64 school adventure published by Firebird. Schoolboy G. McFat has been accused of stealing the headmaster's wallet, so he must search the school for both the missing wallet and photographic evidence that identifies the real culprit. Play combines flick-screen platform movement with object-based puzzles as McFat explores classrooms, corridors and staff areas, avoids hazards and works out where each collected item should be used. The deliberately unruly school setting gives the game a comic British character, but progress depends on careful mapping and experimentation rather than simple arcade action. It is a single-player title designed around exploration, memory and puzzle solving, with the central mystery providing a goal beyond merely reaching the next screen.",
    sources: [
      "https://www.mobygames.com/game/37580/the-happiest-days-of-your-life/",
      "https://commodoreformatarchive.com/one-of-the-unhappiest-gaming-experiences-of-your-c64-life/"
    ]
  },
  "insects-in-space": {
    description: "Insects in Space is a 1989 Commodore 64 side-scrolling shooter published by Hewson and created by Sensible Software, with Chris Yates credited for the design and programming. Its structure recalls Defender: the player patrols a horizontally scrolling landscape while hostile insects descend to capture the babies scattered below. Abducted survivors must be rescued before the insects carry them away and transform them, so watching the radar and deciding when to attack or recover a captive is as important as firing accurately. The playfield wraps around and supports rapid changes of direction, creating a continuous defence mission rather than a fixed procession of stages. A simultaneous two-player option lets both pilots share the rescue effort, adding coordination to a game already built around speed, prioritisation and constant movement.",
    sources: [
      "https://www.mobygames.com/game/56082/insects-in-space/"
    ]
  },
  "mr-weems-and-the-she-vampires": {
    description: "The Astonishing Adventures of Mr. Weems and the She Vampires is a 1987 Commodore 64 action game published by Piranha. Viewed from above, it sends Mr. Weems through six maze-like levels filled with vampires, monsters, locked routes and hazards. His garlic gun provides the main defence, while keys open doors and garlic pills grant temporary protection. Each stage also hides part of the equipment needed for the final confrontation: a stake, mallet, mega-garlic, mirror and crucifix. Collecting those objects and surviving long enough to reach the Great She Vampire gives the arcade action a persistent objective. The design is often compared with Gauntlet, but its horror-comedy theme, limited resources and emphasis on assembling a vampire-hunting kit give the game its own identity.",
    sources: [
      "https://en.wikipedia.org/wiki/The_Astonishing_Adventures_of_Mr._Weems_and_the_She_Vampires"
    ]
  }
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function wordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .replace(/(\d)\.\s+(?=\d)/g, "$1.")
    .trim()
    .replace(/^[-–—•|>\s]+/, "")
    .replace(/\bproper\b/gi, "strong")
    .replace(/\bheavy lifting\b/gi, "main work")
    .replace(/\bchaos\b/gi, "mayhem")
    .replace(/\bclearly\b/gi, "plainly")
    .replace(/\bclean and readable\b/gi, "easy to follow")
    .replace(/\bhow immediate it feels\b/gi, "its direct response")
    .replace(/\bone of those games\b/gi, "a game")
    .replace(/\bwhat makes it work\b/gi, "its appeal")
    .replace(/\bthe setup\b/gi, "the premise")
    .replace(/\bfever dream\b/gi, "surreal spectacle");
}

function isEditorialParagraph(paragraph) {
  const text = paragraph.toLowerCase();
  if (!text || /https?:\/\/|www\./i.test(text)) return false;
  if (/^(playlists?|support|support & connect|connect|website|patreon|join|twitter|facebook|discord|full game info|subscribe|related videos?)\b/i.test(text)) return false;
  if (/^#/.test(text) || /#[a-z0-9_]+/i.test(text)) return false;
  if (/\b(let me know|comment below|did you play|what do you think|have you played|do you remember)\b/i.test(text)) return false;
  if (wordCount(text) < 7) return false;
  return /[.!?][”"']?$/.test(text);
}

function sentenceList(value) {
  const matches = String(value || "").match(/[^.!?]+[.!?]+[”"']?/g);
  return (matches || [value]).map(normalizeText).filter(Boolean);
}

function extractEditorialDescription(rawDescription) {
  const paragraphs = String(rawDescription || "")
    .split(/\n\s*\n+/)
    .map(normalizeText)
    .filter(isEditorialParagraph);
  const sentences = paragraphs.flatMap(sentenceList);
  const chosen = [];
  let words = 0;

  for (const sentence of sentences) {
    const count = wordCount(sentence);
    if (!count) continue;
    if (words >= TARGET_WORDS) break;
    if (words + count > MAX_WORDS && words >= MIN_WORDS) break;
    if (words + count > MAX_WORDS) continue;
    chosen.push(sentence);
    words += count;
  }

  return normalizeText(chosen.join(" "));
}

function validateDescription(slug, description) {
  const words = wordCount(description);
  const errors = [];
  if (words < MIN_WORDS) errors.push(`${words} words (minimum ${MIN_WORDS})`);
  if (words > MAX_WORDS) errors.push(`${words} words (maximum ${MAX_WORDS})`);
  if (/https?:\/\/|www\.|#[a-z0-9_]+/i.test(description)) errors.push("contains a URL or hashtag");
  if (!/[.!?][”"']?$/.test(description)) errors.push("does not end at a sentence boundary");
  if (errors.length) throw new Error(`${slug}: ${errors.join(", ")}`);
}

function main() {
  const games = readJson(gamesPath);
  const videoPayload = readJson(videoMetadataPath);
  const videos = videoPayload?.videos || {};
  const enrichments = {};

  for (const game of games) {
    const slug = String(game?.slug || "").trim();
    const videoId = String(game?.videoid || game?.videoId || "").trim();
    const override = overrides[slug];
    const metadata = videoId ? videos[videoId] : null;
    const description = normalizeText(
      override?.description || extractEditorialDescription(metadata?.description || "")
    );

    validateDescription(slug, description);
    enrichments[slug] = {
      description,
      sources: override?.sources || [`https://www.youtube.com/watch?v=${videoId}`]
    };
  }

  const output = {
    version: 1,
    policy: "Concise archive descriptions distilled from verified CCG video metadata, with targeted reference research where local metadata was unavailable or required correction.",
    games: enrichments
  };
  const content = `${JSON.stringify(output, null, 2)}\n`;
  const previous = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (previous !== content) fs.writeFileSync(outputPath, content, "utf8");

  const counts = Object.values(enrichments).reduce((summary, entry) => {
    const words = wordCount(entry.description);
    const bucket = words < 110 ? "90-109" : words < 130 ? "110-129" : "130-165";
    summary[bucket] += 1;
    return summary;
  }, { "90-109": 0, "110-129": 0, "130-165": 0 });
  console.log(`[game-description-enrichments] Games enriched: ${Object.keys(enrichments).length}`);
  console.log(`[game-description-enrichments] Word-count bands: ${JSON.stringify(counts)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[game-description-enrichments] ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  extractEditorialDescription,
  normalizeText,
  validateDescription,
  wordCount,
};
