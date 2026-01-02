/* ============================================================
   CCG LOAD SINGLE GAME — OMEGA STABLE + SG-E4.2
   ------------------------------------------------------------
   • Correct games.json path (LOCKED)
   • URL-safe ID decoding
   • FULL renderGame restored
   • Related-games smart fallback
   • SG-E2: Downloads panel
   • SG-E3: Modal viewer
   • SG-E4.1: Screenshot modal navigation (NEXT / PREV)
   • SG-E4.2: On-screen modal arrows
   • SG-E5: Related Games carousel behaviour
============================================================ */

let CCG_SINGLE_ALL_GAMES = [];
let CCG_SCREENSHOTS = [];
let CCG_SCREENSHOT_INDEX = 0;

// Legacy slug fallback (SEO preservation)
const LEGACY_SLUG_MAP = {
    "10-out": "x-out",
    "5-the-computer-game": "v:_the_computer_game",
    "alcazar_the_forgotten_fortress": "alcazar:_the_forgotten_fortress",
    "aliens_the_computer_game": "aliens:_the_computer_game",
    "apollo_18_mission_to_the_moon": "apollo_18:_mission_to_the_moon",
    "archon_the_light_and_the_dark": "archon:_the_light_and_the_dark",
    "barbarian-2-the-dungeon-of-drax": "barbarian_ii:_the_dungeon_of_drax",
    "barbarian_ii_the_dungeon_of_drax": "barbarian_ii:_the_dungeon_of_drax",
    "barbarian_the_ultimate_warrior": "barbarian:_the_ultimate_warrior",
    "batman_the_caped_crusader": "batman:_the_caped_crusader",
    "batman_the_movie": "batman:_the_movie",
    "bc-2-grogs-revenge": "b.c._ii:_grog's_revenge",
    "bc_bill": "b.c._bill",
    "bc_ii_grogs_revenge": "b.c._ii:_grog's_revenge",
    "bcs_quest_for_tires": "b.c.'s_quest_for_tires",
    "beach-head-2": "beach-head_ii",
    "beach_head": "beach-head",
    "beach_head_ii": "beach-head_ii",
    "blood_n_guts": "blood_'n_guts",
    "bozos_night_out": "bozo's_night_out",
    "bullys_sporting_darts": "bully's_sporting_darts",
    "cauldron-2-the-pumpkin-strikes-back": "cauldron_ii:_the_pumpkin_strikes_back",
    "cauldron_ii_the_pumpkin_strikes_back": "cauldron_ii:_the_pumpkin_strikes_back",
    "caveman_ugh_lympics": "caveman_ugh-lympics",
    "chase_hq": "chase_h.q.",
    "cops_n_robbers": "cops_'n'_robbers",
    "creatures-ii-torture-trouble": "creatures_2:_torture_trouble",
    "creatures_2_torture_trouble": "creatures_2:_torture_trouble",
    "d_generation": "d/generation",
    "daley_thompsons_decathlon": "daley_thompson's_decathlon",
    "dan-dare-2-mekons-revenge": "dan_dare_ii:_mekon's_revenge",
    "dan_dare_ii_mekons_revenge": "dan_dare_ii:_mekon's_revenge",
    "dan_dare_pilot_of_the_future": "dan_dare:_pilot_of_the_future",
    "davy_king_of_the_wild_frontier": "davy:_king_of_the_wild_frontier",
    "double-dragon-2-the-revenge": "double_dragon_ii:_the_revenge",
    "double_dragon_ii_the_revenge": "double_dragon_ii:_the_revenge",
    "dragons-lair-2-escape-from-singes-castle": "dragon's_lair_ii_:_escape_from_singe's_castle",
    "dragons_lair": "dragon's_lair",
    "dragons_lair_ii_escape_from_singes_castle": "dragon's_lair_ii_:_escape_from_singe's_castle",
    "ducktales_the_quest_for_gold": "ducktales:_the_quest_for_gold",
    "dune-2-the-battle-for-arrakis": "dune_ii:_the_battle_for_arrakis",
    "dune_ii_the_battle_for_arrakis": "dune_ii:_the_battle_for_arrakis",
    "eve-of-the-beholder-2-the-legend-of-darkmoon": "eve_of_the_beholder_ii:_the_legend_of_darkmoon",
    "eve_of_the_beholder_ii_the_legend_of_darkmoon": "eve_of_the_beholder_ii:_the_legend_of_darkmoon",
    "everyones_a_wally": "everyone's_a_wally",
    "face_off": "face_off!",
    "fiendish_freddys_big_top_o_fun": "fiendish_freddy's_big_top_o'_fun",
    "fist-2-the-legend-continues": "fist_ii:_the_legend_continues",
    "fist_ii_the_legend_continues": "fist_ii:_the_legend_continues",
    "flashback_the_quest_for_identity": "flashback:_the_quest_for_identity",
    "flimbos_quest": "flimbo's_quest",
    "gary_linekers_superstar_soccer": "gary_lineker's_superstar_soccer",
    "ghosts_n_goblins": "ghosts_'n_goblins",
    "gribblys_day_out": "gribbly's_day_out",
    "he_man_and_the_masters_of_the_universe_the_ilearth_stone": "he-man_and_the_masters_of_the_universe:_the_ilearth_stone",
    "he_man_and_the_masters_of_the_universe_the_movie": "he-man_and_the_masters_of_the_universe:_the_movie",
    "henrys_house": "henry's_house",
    "herberts_dummy_run": "herbert's_dummy_run",
    "ik_amiga": "ik+_amiga",
    "ik_c64": "ik+_c64",
    "indiana_jones_and_the_last_crusade_adventure": "indiana_jones_and_the_last_crusade_(adventure)",
    "indiana_jones_and_the_last_crusade_the_action_game": "indiana_jones_and_the_last_crusade:_the_action_game",
    "into_the_eagles_nest": "into_the_eagle's_nest",
    "invade_a_load": "invade-a-load",
    "ivan_ironman_stewarts_super_off_road": "ivan_'ironman'_stewart's_super_off_road",
    "jack-the-nipper-2-in-coconut-capers": "jack_the_nipper_ii:_in_coconut_capers",
    "jack_the_nipper_ii_in_coconut_capers": "jack_the_nipper_ii:_in_coconut_capers",
    "james_pond_underwater_agent": "james_pond:_underwater_agent",
    "jimmy_whites_whirlwind_snooker": "jimmy_white's_whirlwind_snooker",
    "kane-kane-ii": "kane_&_kane_2",
    "kane_kane_2": "kane_&_kane_2",
    "kings_bounty": "king's_bounty",
    "kung_fu_master": "kung-fu_master",
    "last-ninja-ii-back-with-a-vengeance": "last_ninja_2:_back_with_a_vengeance",
    "last_ninja_2_back_with_a_vengeance": "last_ninja_2:_back_with_a_vengeance",
    "marias_christmas_box": "maria's_christmas_box",
    "montezumas_revenge": "montezuma's_revenge",
    "moonstone_a_hard_days_knight": "moonstone:_a_hard_days_knight",
    "mountie_micks_death_ride": "mountie_mick's_death_ride",
    "myth_history_in_the_making": "myth:_history_in_the_making",
    "nightbreed_the_action_game": "nightbreed:_the_action_game",
    "north_south": "north_&_south",
    "pit_fighter": "pit-fighter",
    "pitfall-2-lost-caverns": "pitfall_ii:_lost_caverns",
    "pitfall_ii_lost_caverns": "pitfall_ii:_lost_caverns",
    "project-10": "project-x",
    "project_x": "project-x",
    "push_over": "push-over",
    "rambo-first-blood-part-2": "rambo:_first_blood_part_ii",
    "rambo_first_blood_part_ii": "rambo:_first_blood_part_ii",
    "rescue_on_fractalus": "rescue_on_fractalus!",
    "rockn_wrestle": "rock'n_wrestle",
    "saboteur-2-avenging-angel": "saboteur_ii:_avenging_angel",
    "saboteur_ii_avenging_angel": "saboteur_ii:_avenging_angel",
    "samurai_warrior_the_battles_of_usagi_yojimbo": "samurai_warrior:_the_battles_of_usagi_yojimbo",
    "santas_xmas_caper": "santa's_xmas_caper",
    "seek_destroy": "seek_&_destroy",
    "shao_lins_road": "shao-lin's_road",
    "shoot_out": "shoot-out",
    "sid_meiers_pirates": "sid_meier's_pirates!",
    "skull_crossbones": "skull_&_crossbones",
    "smash_tv": "smash_t.v.",
    "spartacus_the_swordslayer": "spartacus:_the_swordslayer",
    "speedball-ii-brutal-deluxe": "speedball_2:_brutal_deluxe",
    "speedball_2_brutal_deluxe": "speedball_2:_brutal_deluxe",
    "spy-vs-spy-2-the-island-caper": "spy_vs_spy_ii:_the_island_caper",
    "spy-vs-spy-3-arctic-antics": "spy_vs_spy_iii:_arctic_antics",
    "spy_vs_spy_ii_the_island_caper": "spy_vs_spy_ii:_the_island_caper",
    "spy_vs_spy_iii_arctic_antics": "spy_vs_spy_iii:_arctic_antics",
    "star_wars_droids": "star_wars:_droids",
    "strip_poker_a_sizzling_game_of_chance": "strip_poker:_a_sizzling_game_of_chance",
    "target_renegade": "target:_renegade",
    "teenage_mutant_hero_turtles_the_coin_op": "teenage_mutant_hero_turtles:_the_coin-op",
    "terminator-ii-judgment-day": "terminator_2:_judgment_day",
    "terminator_2_judgment_day": "terminator_2:_judgment_day",
    "the_castles_of_dr_creep": "the_castles_of_dr._creep",
    "the_dolphins_rune": "the_dolphin's_rune",
    "the_train_escape_to_normandy": "the_train:_escape_to_normandy",
    "track_field": "track_&_field",
    "turrican-2-the-final-fight": "turrican_ii:_the_final_fight",
    "turrican_ii_the_final_fight": "turrican_ii:_the_final_fight",
    "ultima-1-the-first-age-of-darkness": "ultima_i:_the_first_age_of_darkness",
    "ultima_i_the_first_age_of_darkness": "ultima_i:_the_first_age_of_darkness",
    "upn_down": "up'n_down",
    "v_the_computer_game": "v:_the_computer_game",
    "x_out": "x-out",
    "yie_ar_kung_fu": "yie_ar_kung-fu"
};

/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const params = new URLSearchParams(window.location.search);
    let gameId = decodeURIComponent(
        (params.get("id") || "").toString().trim()
    );
    const rawSlugParam = params.get("slug");
    const slugParam = rawSlugParam ? decodeURIComponent(rawSlugParam.toString()).trim() : "";
    const slugForMatch = slugParam ? slugParam.toLowerCase() : "";

    try {
        const response = await fetch("games.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`games.json ${response.status}`);

        const games = await response.json();
        CCG_SINGLE_ALL_GAMES = Array.isArray(games) ? games : [];

        let game = null;

        if (gameId) {
            game = CCG_SINGLE_ALL_GAMES.find(
                g => String(g.id) === gameId
            );
        }

        if (!game && slugForMatch) {
            game = CCG_SINGLE_ALL_GAMES.find(
                g => resolveGameSlug(g.id) === slugForMatch
            );
            if (game) gameId = String(game.id);
        }

        if (!game && slugForMatch) {
            // Legacy slug fallback (SEO preservation)
            const legacyId = LEGACY_SLUG_MAP[slugForMatch];
            if (legacyId) {
                game = CCG_SINGLE_ALL_GAMES.find(
                    g => String(g.id) === legacyId
                );
            }
            if (game) gameId = String(game.id);
        }

        if (!game && slugForMatch) {
            const resolvedId = resolveGameIdFromSlug(slugForMatch);
            if (resolvedId) {
                game = CCG_SINGLE_ALL_GAMES.find(
                    g => String(g.id) === resolvedId
                );
            }
            if (game) gameId = String(game.id);
        }

        if (!game) {
            renderGameNotFound(gameId, slugParam);
            return;
        }

        syncPrettyUrl(game.id);
        renderGame(game);

    } catch (err) {
        renderGameNotFound(gameId, slugParam);
    }
});

/* ============================================================
   RESOLVERS (LOCKED)
============================================================ */

function resolveSingleGameThumbBasePath() {
    let pathname = window.location.pathname || "";
    const repoMarker = "/ccgamer_website_new/";
    if (pathname.includes(repoMarker)) {
        pathname = pathname.slice(pathname.indexOf(repoMarker) + repoMarker.length);
    }

    const isDirectoryPath = pathname.endsWith("/") || pathname.endsWith("index.html");
    pathname = pathname.replace(/^\/+|\/+$/g, "");
    const segments = pathname ? pathname.split("/") : [];
    const depth = Math.max(segments.length - (isDirectoryPath ? 0 : 1), 0);
    const prefix = "../".repeat(depth || 1);

    return `${prefix}resources/images/thumbnails/all/`;
}

function resolveGameThumb(raw) {
    const basePath = resolveSingleGameThumbBasePath();
    let filename = "1942.jpg";

    if (raw) {
        filename = String(raw).trim().replace(/^\/+/, "");
        filename = filename.replace("resources/images/thumbnails/all/", "")
            .replace("resources/images/thumbnails/", "")
            .replace("resources/images/", "");
    }

    return `${basePath}${filename}`;
}

function resolveVideoId(game) {
    return (
        game.videoid ||
        game.video ||
        game.youtube ||
        ""
    ).toString().trim();
}

function resolvePrimaryLink(value) {
    if (Array.isArray(value) && value.length) {
        return value.find(Boolean) || "";
    }
    if (typeof value === "string") return value.trim();
    return "";
}

function resolveManualUrl(game) {
    return resolvePrimaryLink(game.pdf || game.manual || game.manuals);
}

function normaliseManualUrl(url) {
    if (!url) return "";
    const trimmed = String(url).trim();

    const driveMatch = trimmed.match(/https?:\/\/drive\.google\.com\/file\/d\/([^/]+)\//i);
    if (driveMatch && driveMatch[1]) {
        // Preview-friendly embed that works without extra clicks
        return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }

    return trimmed;
}

function resolveDiskUrl(game) {
    return resolvePrimaryLink(game.disk || game.tape || game.download);
}

function resolveLemonUrl(game) {
    return resolvePrimaryLink(game.lemon || game.lemonlink || game.lemonlinks);
}

function resolveGameSlug(gameId) {
    if (typeof window !== "undefined" && typeof window.ccgGameSlugFromId === "function") {
        return window.ccgGameSlugFromId(gameId);
    }

    if (!gameId) return "";
    let slug = String(gameId).trim().toLowerCase();
    slug = slug.replace(/[_\s]+/g, "-");
    slug = slug.replace(/[:/]+/g, "-");
    slug = slug.replace(/[^a-z0-9-]/g, "");
    slug = slug.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
    return slug;
}

function resolveGameIdFromSlug(slug) {
    if (!slug) return "";
    return String(slug).trim().toLowerCase().replace(/-+/g, "-").replace(/-/g, "_");
}

function resolvePrettyGameUrl(gameId) {
    if (typeof window !== "undefined" && typeof window.ccgBuildGameUrl === "function") {
        return window.ccgBuildGameUrl(gameId);
    }

    const slug = resolveGameSlug(gameId);
    if (!slug) return "";
    return `${slug}/`;
}

function getSlugFromPath() {
    let pathname = window.location.pathname || "";
    const repoMarker = "/ccgamer_website_new/";
    if (pathname.includes(repoMarker)) {
        pathname = pathname.slice(pathname.indexOf(repoMarker) + repoMarker.length);
    }
    pathname = pathname.replace(/^\/+|\/+$/g, "");
    if (!pathname.startsWith("games/")) return "";

    let slug = pathname.slice("games/".length);
    slug = slug.replace(/index\.html$/i, "").replace(/\.html$/i, "");
    return slug.replace(/\/+$/g, "");
}

function syncPrettyUrl(gameId) {
    const pretty = resolvePrettyGameUrl(gameId);
    if (!pretty) return;

    const url = new URL(pretty, window.location.origin);
    if (window.location.pathname !== url.pathname) {
        window.history.replaceState({}, "", url.pathname);
    }
}

/* ============================================================
   RENDER GAME
============================================================ */

function renderGame(game) {

    updateMeta(game);

    /* HERO */
    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);
    document.getElementById("gameHeroBG").style.backgroundImage = `url('${thumb}')`;
    document.getElementById("gameHeroThumb").src = thumb;
    document.getElementById("gameHeroThumb").alt = `${game.title || "Game"} cover art`;
    document.getElementById("gameHeroTitle").textContent = game.title || "Unknown";
    document.getElementById("gameMetaYear").textContent = game.year || "—";
    document.getElementById("gameMetaSystem").textContent = game.system || "—";
    document.getElementById("gameMetaDeveloper").textContent =
        game.publisher || game.developer || "—";

    /* DESCRIPTION */
    if (game.description) {
        document.getElementById("gameDescription").innerHTML = game.description;
        document.getElementById("game-description-section").hidden = false;
    }

    /* VIDEO */
    const vid = resolveVideoId(game);
    if (vid) {
        document.getElementById("game-video-embed").src =
            `https://www.youtube.com/embed/${vid}`;
        document.getElementById("game-video-section").hidden = false;

        const btn = document.getElementById("gameVideoBtn");
        btn.href = `https://www.youtube.com/watch?v=${vid}`;
        btn.hidden = false;
    }

    /* DOWNLOADS */
    const downloadsSection = document.querySelector(".game-downloads");
    const manual = normaliseManualUrl(resolveManualUrl(game));
    if (manual) {
        const btn = document.getElementById("gameManualBtn");
        btn.href = manual;
        btn.target = "_blank";
        btn.rel = "noopener";
        btn.hidden = false;
        downloadsSection.hidden = false;

        btn.addEventListener("click", e => {
            // Open inline for PDFs/Drive; fall back to normal links
            if (!manual.includes(".pdf") && !manual.includes("drive.google.com")) return;
            e.preventDefault();
            openDocumentModal(manual);
        });
    }

    const disk = resolveDiskUrl(game);
    if (disk) {
        const btn = document.getElementById("gameDiskBtn");
        btn.href = disk;
        btn.target = "_blank";
        btn.rel = "noopener";
        btn.hidden = false;
        downloadsSection.hidden = false;
    }

    const lemon = resolveLemonUrl(game);
    if (lemon) {
        const btn = document.getElementById("gameLemonBtn");
        btn.href = lemon;
        btn.target = "_blank";
        btn.rel = "noopener";
        btn.hidden = false;
        downloadsSection.hidden = false;
    }

    /* SCREENSHOTS */
    if (Array.isArray(game.screenshots) && game.screenshots.length) {
        renderScreenshots(game.screenshots);
    }

    renderRelatedGames(game, CCG_SINGLE_ALL_GAMES);
}

function updateMeta(game) {
    const title = game.title || "Game";
    const metaTitleText = `${title} | Cheeky Commodore Gamer`;
    document.title = metaTitleText;

    const metaTitle = document.getElementById("game-meta-title");
    if (metaTitle) metaTitle.textContent = metaTitleText;

    const desc = (game.description || "").replace(/<[^>]*>?/gm, "").slice(0, 160);
    const metaDesc = document.getElementById("game-meta-description");
    const metaDescriptionText =
        desc || `${title} on Commodore — screenshots, manual, downloads and video.`;

    if (metaDesc) metaDesc.setAttribute("content", metaDescriptionText);

    const canonicalUrl = buildCanonicalUrl(game.id);
    ensureCanonicalLink(canonicalUrl);

    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);
    const imageUrl = new URL(thumb, window.location.href).toString();

    const ogTitle = document.getElementById("game-og-title");
    if (ogTitle) ogTitle.setAttribute("content", metaTitleText);
    const ogDesc = document.getElementById("game-og-description");
    if (ogDesc) ogDesc.setAttribute("content", metaDescriptionText);
    const ogImage = document.getElementById("game-og-image");
    if (ogImage) ogImage.setAttribute("content", imageUrl);
    const ogUrl = document.getElementById("game-og-url");
    if (ogUrl) ogUrl.setAttribute("content", canonicalUrl);

    const twitterTitle = document.getElementById("game-twitter-title");
    if (twitterTitle) twitterTitle.setAttribute("content", metaTitleText);
    const twitterDesc = document.getElementById("game-twitter-description");
    if (twitterDesc) twitterDesc.setAttribute("content", metaDescriptionText);
    const twitterImage = document.getElementById("game-twitter-image");
    if (twitterImage) twitterImage.setAttribute("content", imageUrl);

    const jsonLd = document.getElementById("game-jsonld");
    if (jsonLd) {
        const jsonLdData = {
            "@context": "https://schema.org",
            "@type": "VideoGame",
            "name": title,
            "description": metaDescriptionText,
            "url": canonicalUrl,
            "image": imageUrl,
            "gamePlatform": game.system || "Commodore",
            "genre": Array.isArray(game.genres) ? game.genres : undefined,
            "datePublished": game.year ? String(game.year) : undefined,
            "publisher": game.publisher || game.developer || undefined
        };

        Object.keys(jsonLdData).forEach(key => {
            if (jsonLdData[key] === undefined) delete jsonLdData[key];
        });

        jsonLd.textContent = JSON.stringify(jsonLdData);
    }
}

function buildCanonicalUrl(gameId) {
    const slug = resolveGameSlug(gameId);
    if (!slug) {
        return "https://www.cheekycommodoregamer.co.uk/games/";
    }

    return `https://www.cheekycommodoregamer.co.uk/games/${slug}/`;
}

function buildCanonicalUrlFromSlug(slug) {
    const clean = String(slug || "").trim().toLowerCase().replace(/-+/g, "-");
    if (!clean) {
        return "https://www.cheekycommodoregamer.co.uk/games/";
    }

    return `https://www.cheekycommodoregamer.co.uk/games/${clean}/`;
}

function ensureCanonicalLink(canonicalUrl) {
    if (!canonicalUrl) return;

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
    }

    canonical.setAttribute("href", canonicalUrl);
}

function renderGameNotFound(gameId, gameSlug) {
    document.title = "Game not found | Cheeky Commodore Gamer";

    const heroTitle = document.getElementById("gameHeroTitle");
    if (heroTitle) heroTitle.textContent = "Game not found";

    const heroThumb = document.getElementById("gameHeroThumb");
    if (heroThumb) {
        heroThumb.src = resolveGameThumb();
        heroThumb.alt = "Game not found";
    }

    const heroBg = document.getElementById("gameHeroBG");
    if (heroBg) heroBg.style.backgroundImage = `url('${resolveGameThumb()}')`;

    const metaYear = document.getElementById("gameMetaYear");
    if (metaYear) metaYear.textContent = "—";
    const metaSystem = document.getElementById("gameMetaSystem");
    if (metaSystem) metaSystem.textContent = "—";
    const metaDeveloper = document.getElementById("gameMetaDeveloper");
    if (metaDeveloper) metaDeveloper.textContent = "—";

    const description = document.getElementById("gameDescription");
    if (description) {
        const queryInfo = [gameId ? `id=${gameId}` : "", gameSlug ? `slug=${gameSlug}` : ""]
            .filter(Boolean)
            .join(" · ");
        description.textContent = queryInfo
            ? `Sorry, we couldn't find that game (${queryInfo}).`
            : "Sorry, we couldn't find that game.";
    }

    const descriptionSection = document.getElementById("game-description-section");
    if (descriptionSection) descriptionSection.hidden = false;

    const videoSection = document.getElementById("game-video-section");
    if (videoSection) videoSection.hidden = true;

    const downloadsSection = document.querySelector(".game-downloads");
    if (downloadsSection) downloadsSection.hidden = true;

    const screenshotsSection = document.querySelector(".game-screenshots");
    if (screenshotsSection) screenshotsSection.hidden = true;

    const relatedSection = document.querySelector(".game-section--related");
    if (relatedSection) relatedSection.hidden = true;

    const canonicalUrl = gameId
        ? buildCanonicalUrl(gameId)
        : buildCanonicalUrlFromSlug(gameSlug);
    ensureCanonicalLink(canonicalUrl);
}

/* ============================================================
   SCREENSHOTS + MODAL NAVIGATION (SG-E4.1)
============================================================ */

function renderScreenshots(screenshots) {

    const section = document.querySelector(".game-screenshots");
    const strip = document.getElementById("gameScreenshotsStrip");
    if (!section || !strip) return;

    CCG_SCREENSHOTS = screenshots.slice();
    strip.innerHTML = "";

    screenshots.forEach((src, index) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = `Screenshot ${index + 1}`;
        img.loading = "lazy";
        img.className = "game-screenshot-thumb";

        img.addEventListener("click", () => {
            openScreenshotModal(index);
        });

        strip.appendChild(img);
    });

    section.hidden = false;
}

/* ============================================================
   MODAL CONTROL
============================================================ */

const modal = document.getElementById("ccgModal");
const modalFrame = document.getElementById("ccgModalFrame");
const modalClose = document.querySelector(".ccg-modal-close");
const modalNext = document.querySelector(".ccg-modal-nav--next");
const modalPrev = document.querySelector(".ccg-modal-nav--prev");
let modalMode = "gallery"; // "gallery" | "doc"

function openScreenshotModal(index) {
    CCG_SCREENSHOT_INDEX = index;
    modalMode = "gallery";
    modal.classList.remove("ccg-modal--doc");
    modalFrame.src = CCG_SCREENSHOTS[index];
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
}

function openDocumentModal(src) {
    modalMode = "doc";
    modal.classList.add("ccg-modal--doc");
    modalFrame.src = src;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("ccg-modal--doc");
    modalMode = "gallery";
    modalFrame.src = "";
}

function nextScreenshot() {
    if (!CCG_SCREENSHOTS.length) return;

    CCG_SCREENSHOT_INDEX =
        (CCG_SCREENSHOT_INDEX + 1) % CCG_SCREENSHOTS.length;

    modalFrame.src = CCG_SCREENSHOTS[CCG_SCREENSHOT_INDEX];
}

function prevScreenshot() {
    if (!CCG_SCREENSHOTS.length) return;

    CCG_SCREENSHOT_INDEX =
        (CCG_SCREENSHOT_INDEX - 1 + CCG_SCREENSHOTS.length) % CCG_SCREENSHOTS.length;

    modalFrame.src = CCG_SCREENSHOTS[CCG_SCREENSHOT_INDEX];
}

/* ============================================================
   EVENTS
============================================================ */

modalClose.addEventListener("click", closeModal);

modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
});

if (modalNext) modalNext.addEventListener("click", () => {
    if (modalMode === "doc") return;
    nextScreenshot();
});
if (modalPrev) modalPrev.addEventListener("click", () => {
    if (modalMode === "doc") return;
    prevScreenshot();
});

document.addEventListener("keydown", e => {
    if (!modal.classList.contains("active")) return;

    if (e.key === "Escape") closeModal();
    if (modalMode !== "doc") {
        if (e.key === "ArrowRight") nextScreenshot();
        if (e.key === "ArrowLeft") prevScreenshot();
    }
});

/* ============================================================
   RELATED GAMES
============================================================ */

function renderRelatedGames(game, allGames) {

    const section = document.querySelector(".game-section--related");
    const track = document.getElementById("relatedGamesTrack");
    const titleEl = document.getElementById("relatedGamesTitle");
    const kickerEl = document.getElementById("relatedGamesKicker");

    if (!section || !track || !titleEl || !kickerEl) return;

    let related = [];
    let sourceLabel = "Publisher";

    if (game.publisher) {
        related = allGames.filter(g =>
            g.publisher === game.publisher &&
            String(g.id) !== String(game.id)
        );
    }

    if (!related.length && game.developer) {
        related = allGames.filter(g =>
            g.developer === game.developer &&
            String(g.id) !== String(game.id)
        );
        sourceLabel = "Developer";
    }

    related = related.slice(0, 10);

    if (!related.length) {
        section.hidden = true;
        return;
    }

    titleEl.textContent = "More From The Same Publisher";
    kickerEl.textContent = "Related Games";

    track.innerHTML = related.map(g => {
        const thumb = resolveGameThumb(g.thumbnail || g.thumb || g.cover);
        return `
            <a href="${resolvePrettyGameUrl(g.id) || `game.html?id=${encodeURIComponent(g.id)}`}" class="ccg-game-card">
                <div class="ccg-game-card__thumb ccg-game-card__thumb--related">
                    <img src="${thumb}" alt="${g.title}">
                </div>
                <div class="ccg-game-card__body">
                    <h3 class="ccg-game-card__title">${g.title}</h3>
                    <div class="ccg-game-card__meta">
                        ${(g.year || "")} · ${(g.system || "")}
                    </div>
                </div>
            </a>
        `;
    }).join("");

    section.hidden = false;
    initRelatedCarousel();
}

/* ============================================================
   RELATED GAMES CAROUSEL BEHAVIOUR (SG-E5)
============================================================ */

function initRelatedCarousel() {

    const track = document.querySelector(".related-carousel__track");
    const viewport = document.querySelector(".related-carousel__viewport");
    const prevBtn = document.querySelector(".related-carousel__nav--prev");
    const nextBtn = document.querySelector(".related-carousel__nav--next");

    if (!track || !viewport || !prevBtn || !nextBtn) return;

    const scrollAmount = () => viewport.clientWidth * 0.9;

    const scrollBy = delta => {
        track.scrollBy({
            left: delta,
            behavior: "smooth"
        });
    };

    prevBtn.addEventListener("click", () => scrollBy(-scrollAmount()));
    nextBtn.addEventListener("click", () => scrollBy(scrollAmount()));
}
