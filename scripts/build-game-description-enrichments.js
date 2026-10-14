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
const SOURCE_MIN_WORDS = 40;
const TARGET_WORDS = 135;
const MAX_WORDS = 165;

const overrides = {
  "stifflip-and-co": {
    "description": "️ Stifflip & Co (1987) – Commodore 64 / C64 Released in 1987 by Palace Software, Stifflip & Co is a wonderfully British icon-driven graphic adventure for the Commodore 64, developed by Binary Vision and packed with cricket, stiff upper lips, ridiculous names and a plot that takes saving the Empire rather seriously. You control four different characters — Viscount Sebastian Stifflip, Professor Braindeath, Colonel R. G. Bargie and Miss Palmyra Primbottom — as they attempt to stop the dastardly Count Chameleon. Count Chameleon's latest invention is the Rubbertronic Ray, a device capable of altering the properties of rubber. Naturally, his grand plan involves using it against cricket balls, potentially destroying the game and apparently bringing the British Empire down with it. You couldn't accuse Stifflip & Co of lacking ambition. Rather than controlling just one hero, you can switch between all four members of the group, with different characters and abilities needed to solve the game's puzzles.",
    "sources": [
      "https://www.youtube.com/watch?v=zqqIctCq73o"
    ]
  },
  "donkey-kong": {
    "description": "️ Donkey Kong (1983 / 1986) – Commodore 64 Arcade Platforming Legend Donkey Kong is one of the most iconic arcade games of all time, and on the Commodore 64 it arrived in two very different forms. The first port, released in 1983 by Atarisoft, aimed to replicate the arcade original as closely as possible, delivering familiar layouts, bold colours, and a faithful sense of challenge that many players still regard as the most authentic C64 version. In 1986, Ocean Software released their own take on Donkey Kong, featuring more detailed graphics and enhanced sound. While visually more polished, this version takes a few liberties with the arcade feel, making it a fascinating comparison for long-time fans of the game. You control Jumpman as he climbs girders, ladders, and elevators to rescue Lady from the clutches of Donkey Kong.",
    "sources": [
      "https://www.youtube.com/watch?v=n11taRLnacg"
    ]
  },
  "red-heat": {
    description: "Red Heat is a 1989 Commodore 64 beat-'em-up by Special FX and Ocean Software, starring Soviet officer Ivan Danko in four film-inspired stages. The game aims to translate the film’s hard-edged tone to the Commodore 64, placing story and presentation firmly at the forefront. You control Soviet police officer Ivan Danko as he pursues drug lord Viktor Rostavili, moving through a series of stages inspired by key moments from the movie. Progression is linear, with each section focused on clearing enemies using punches, kicks, and occasional weapons. Visually, Red Heat was impressive for its time, featuring large character sprites and smooth animation that gave the game a cinematic feel. Jonathan Dunn’s soundtrack adds atmosphere and weight to the action, reinforcing the gritty setting even as it repeats during longer play sessions.",
    sources: [
      "https://www.youtube.com/watch?v=adtijYvhxCs"
    ]
  },
  "robocop": {
    description: "RoboCop is Ocean Software's Commodore 64 action adaptation of the 1987 film, with a 1989 US release following its 1988 UK debut. Developed under license from Orion Pictures, the home computer versions were produced by Ocean in collaboration with Data East, aiming to bring the film’s gritty atmosphere to 8-bit hardware. You step into the metal boots of RoboCop, patrolling the crime-ridden streets of Detroit across seven scrolling levels. Gameplay blends beat ’em up combat with run-and-gun shooting, as RoboCop uses punches and his Auto-9 pistol to clear enemies. Bonus shooting galleries add variety, rewarding accuracy and timing between the main stages. On the Commodore 64, RoboCop delivers moody visuals and a strong sense of atmosphere that reflects the film’s tone. Jonathan Dunn’s powerful soundtrack is a standout feature, driving the action and becoming one of the most recognisable C64 game themes of the era.",
    sources: [
      "https://www.youtube.com/watch?v=pm3UGikm-2s"
    ]
  },
  "the-chaos-engine": {
    description: "️ The Chaos Engine (1993) – Commodore Amiga Steampunk Run-and-Gun Classic Released in 1993 by The Bitmap Brothers, The Chaos Engine is a top-down run-and-gun action game set in a twisted steampunk version of Victorian Britain. A sentient machine has warped time and space, turning the population into hostile creatures, and a team of hired mercenaries is sent in to shut it down. You choose two characters from a roster of six, each with distinct weapons and abilities, and fight your way through four worlds made up of dense, enemy-filled levels. Progress requires careful movement, managing choke points, activating nodes, and uncovering hidden routes while enemies flood the screen from every direction. Gold collected during missions can be spent on upgrades, adding a strategic layer to the relentless action. Played solo or cooperatively, the game rewards coordination, positioning, and smart character choices as difficulty steadily ramps up.",
    sources: [
      "https://www.youtube.com/watch?v=vyTeLuzjRmQ"
    ]
  },
  "bismark": {
    description: "️ Bismark (1983) – Commodore 64 Naval Strategy Hunt for a Legendary Battleship Released in 1983 by Argus Press Software Ltd and developed by P. Rawling, Bismark is a strategic naval warfare game that challenges you to outthink rather than outgun the enemy. Also known as Strategy II, it places careful planning and intelligence gathering at the heart of the experience. You command a fleet of twelve Allied ships tasked with locating and sinking the German battleship Bismarck before time runs out. The action unfolds on a 20×15 grid representing the North Atlantic, where every movement must be considered as you patrol sea lanes, avoid threats, and close in on your target. Rather than fast-paced action, Bismark focuses on tactical decision-making and resource management. You must interpret limited information, position ships effectively, and anticipate the Bismarck’s movements, creating constant tension as the clock ticks down.",
    sources: [
      "https://www.youtube.com/watch?v=dF2yBbNOH6Q"
    ]
  },
  "bounder": {
    description: "️ Bounder (1986) – Commodore 64 Action Puzzle Isometric Platform Challenge Released in 1986 by Gremlin Graphics for the Commodore 64, Bounder is an inventive action-puzzle game that puts you in control of a constantly bouncing tennis ball navigating a series of suspended platforms high above dangerous voids. The game spans 174 screens across 10 increasingly demanding levels, each built from hexagonal tiles filled with hazards, enemies, and obstacles. You must carefully time each bounce and landing while guiding the ball towards the exit on every screen. Precision and forward planning are essential for survival. Scattered throughout the stages are special tiles that introduce strategic variety, including arrows that propel the ball forward, teleporters that remove sections of the level, and mystery tiles that can either reward or punish you. Completing each stage unlocks a bonus screen, offering extra points and risk-based scoring opportunities.",
    sources: [
      "https://www.youtube.com/watch?v=pNczSYUJ4l0"
    ]
  },
  "double-dragon-2-the-revenge": {
    description: "️ Double Dragon II: The Revenge (1989) – Commodore 64 Arcade Beat ’Em Up Martial Arts Classic Released in 1989 by Technōs Japan and ported to the Commodore 64 by Binary Design, Double Dragon II: The Revenge continues the story of Billy and Jimmy Lee as they set out to avenge the death of Marian. Building on the success of the original, the sequel delivers faster combat, tougher enemies, and more varied stage design. The C64 version preserves the core arcade experience, featuring side-scrolling brawling action, cooperative two-player gameplay, and a wide range of martial arts techniques. You can punch, kick, jump, and use weapons to fight your way through gangs of enemies and imposing boss characters. Each stage introduces new environments and enemy types, gradually increasing the challenge. While occasional slowdown can occur during intense scenes, the smooth scrolling and colourful graphics help maintain the game’s fast-paced momentum.",
    sources: [
      "https://www.youtube.com/watch?v=lOkqLlPq3gA"
    ]
  },
  "the-immortal": {
    description: "The Immortal is a 1990 Amiga isometric action-adventure developed by Sandcastle and published by Electronic Arts. You control an ageing wizard searching for his missing mentor, Mordamir, through eight levels of a dangerous dungeon. Each floor combines exploration, deadly traps, hostile creatures and puzzles that demand close attention to the environment. Collected objects can be used to overcome obstacles, while friendly characters may offer information or trade items. Combat involves reading an opponent's impending attack and choosing when to strike or evade. Some hazards require unusual solutions, including riding a magical carpet past flames or travelling underground on a barrel. Mistakes can be fatal, and learning the layout and timing of encounters is central to progressing deeper into the labyrinth.",
    sources: [
      "https://www.mobygames.com/game/2532/the-immortal/",
      "https://gamefaqs.gamespot.com/amiga/951872-the-immortal"
    ]
  },
  "santas-xmas-caper": {
    description: "Santa's Xmas Caper is a 1992 Amiga scrolling platform game published by Zeppelin Games, in which Santa must recover lost presents. After his sleigh overturns, the gifts are scattered around Lapland and every present in an area must be collected before he can advance. Santa runs and jumps through snowy stages while avoiding enemies and hazardous objects. He can fire snowballs to freeze opponents temporarily, creating a chance to get past them, while certain pickups help or hinder his progress. Jelly can increase his jumping ability, but contact with dangerous items or enemies can cost a life. A counter shows how many gifts remain in the current area, alongside the score and lives display. The emphasis is on collecting presents and negotiating platforms rather than flying a sleigh in a shooter.",
    sources: [
      "https://www.lemonamiga.com/doc/santas-xmas-caper/1397",
      "https://www.lemonamiga.com/game/santas-xmas-caper"
    ]
  },
  "shadow-of-the-beast": {
    description: "Shadow Of The Beast is a 1990 Commodore 64 scrolling platform game published by Ocean, following warrior Aarbron on a dangerous quest. The game mixes movement through hostile landscapes with combat against enemies, hazards and obstacles. Aarbron can punch nearby foes and must time jumps across gaps and platforms, because a long fall can be fatal. Some sections require using exits to move between areas, while finding objects and understanding the layout helps you progress. The adventure shifts between outdoor scenery and more confined locations, with threats positioned to punish careless movement. Its fantasy setting and demanding action grew out of the original Psygnosis game, but this description concerns the Commodore 64 conversion rather than the original computer version. Survival depends on carefully judging the next hazard and choosing a route.",
    sources: [
      "https://www.lemon64.com/doc/shadow-of-the-beast/530",
      "https://www.lemon64.com/game/shadow-of-the-beast"
    ]
  },
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
    .replace(/\bchaos\b(?!\s+Engine\b)/gi, "mayhem")
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

function descriptionErrors(description, minimumWords = MIN_WORDS) {
  const words = wordCount(description);
  const errors = [];
  if (words < minimumWords) errors.push(`${words} words (minimum ${minimumWords})`);
  if (words > MAX_WORDS) errors.push(`${words} words (maximum ${MAX_WORDS})`);
  if (/https?:\/\/|www\.|#[a-z0-9_]+/i.test(description)) errors.push("contains a URL or hashtag");
  if (!/[.!?][”"']?$/.test(description)) errors.push("does not end at a sentence boundary");
  return errors;
}

function validateDescription(slug, description, minimumWords = MIN_WORDS) {
  const errors = descriptionErrors(description, minimumWords);
  if (errors.length) throw new Error(`${slug}: ${errors.join(", ")}`);
}

function selectDescription(game, metadata, override) {
  const slug = String(game?.slug || "").trim();
  if (override?.description) {
    const description = normalizeText(override.description);
    validateDescription(slug, description, MIN_WORDS);
    return { description, sourceKind: "override" };
  }

  const youtubeDescription = normalizeText(extractEditorialDescription(metadata?.description || ""));
  if (!descriptionErrors(youtubeDescription, MIN_WORDS).length) {
    return { description: youtubeDescription, sourceKind: "youtube" };
  }

  const sourceDescription = normalizeText(game?.description || "");
  if (!descriptionErrors(sourceDescription, SOURCE_MIN_WORDS).length) {
    return { description: sourceDescription, sourceKind: "games-json" };
  }

  const youtubeErrors = descriptionErrors(youtubeDescription, MIN_WORDS).join(", ") || "not usable";
  const sourceErrors = descriptionErrors(sourceDescription, SOURCE_MIN_WORDS).join(", ") || "not usable";
  throw new Error(
    `${slug}: no usable archive description. Verified YouTube description: ${youtubeErrors}. ` +
    `games.json description: ${sourceErrors}. Add at least ${SOURCE_MIN_WORDS} words of finished source copy or restore verified YouTube metadata.`
  );
}

function main() {
  const games = readJson(gamesPath);
  const videoPayload = readJson(videoMetadataPath);
  const videos = videoPayload?.videos || {};
  const enrichments = {};
  const sourceCounts = { override: 0, youtube: 0, "games-json": 0 };

  for (const game of games) {
    const slug = String(game?.slug || "").trim();
    const videoId = String(game?.videoid || game?.videoId || "").trim();
    const override = overrides[slug];
    const metadata = videoId ? videos[videoId] : null;
    const selected = selectDescription(game, metadata, override);
    sourceCounts[selected.sourceKind] += 1;

    enrichments[slug] = {
      description: selected.description,
      sources: override?.sources || (selected.sourceKind === "youtube" && videoId
        ? [`https://www.youtube.com/watch?v=${videoId}`]
        : [])
    };
  }

  const output = {
    version: 2,
    policy: "Archive descriptions prefer verified CCG YouTube metadata, with curated overrides and a guarded games.json fallback so an unavailable video cannot strand an otherwise complete source record.",
    games: enrichments
  };
  const content = `${JSON.stringify(output, null, 2)}\n`;
  const previous = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (previous !== content) fs.writeFileSync(outputPath, content, "utf8");

  const counts = Object.values(enrichments).reduce((summary, entry) => {
    const words = wordCount(entry.description);
    const bucket = words < 90 ? "40-89" : words < 110 ? "90-109" : words < 130 ? "110-129" : "130-165";
    summary[bucket] += 1;
    return summary;
  }, { "40-89": 0, "90-109": 0, "110-129": 0, "130-165": 0 });
  console.log(`[game-description-enrichments] Games enriched: ${Object.keys(enrichments).length}`);
  console.log(`[game-description-enrichments] Description sources: ${JSON.stringify(sourceCounts)}`);
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
  curatedGameOverrides: overrides,
  descriptionErrors,
  extractEditorialDescription,
  normalizeText,
  selectDescription,
  validateDescription,
  wordCount,
};
