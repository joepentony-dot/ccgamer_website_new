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
let CCG_GAME_RESOLVED = false;
let CCG_SINGLE_RENDERED = false;
let resolved = false;
const CCG_RENDER_GATE = {
    container: null,
    locked: false,
};

function lockSingleGameRender() {
    if (CCG_RENDER_GATE.locked) return;
    CCG_RENDER_GATE.container = document.querySelector(".ccg-page--single-game");
    if (CCG_RENDER_GATE.container) {
        CCG_RENDER_GATE.container.hidden = true;
        CCG_RENDER_GATE.container.setAttribute("data-ccg-render-gate", "pending");
    }
    if (document.body) {
        document.body.classList.add("ccg-loading-single");
        document.body.classList.remove("ccg-single-ready");
    }
    CCG_RENDER_GATE.locked = true;
}

function unlockSingleGameRender() {
    if (!CCG_RENDER_GATE.locked) return;
    if (CCG_RENDER_GATE.container) {
        CCG_RENDER_GATE.container.hidden = false;
        CCG_RENDER_GATE.container.removeAttribute("data-ccg-render-gate");
    }
    if (document.body) {
        document.body.classList.remove("ccg-loading-single");
        document.body.classList.add("ccg-single-ready");
    }
    CCG_RENDER_GATE.locked = false;
}

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

const LEGACY_COMPARE_MAP = buildLegacyCompareMap(LEGACY_SLUG_MAP);

/* ============================================================
   INIT
============================================================ */

lockSingleGameRender();

document.addEventListener("DOMContentLoaded", async () => {
    lockSingleGameRender();

    ensureDirectNavLinks();

    const params = new URLSearchParams(window.location.search);
    let gameId = decodeURIComponent(
        (params.get("id") || "").toString().trim()
    );
    const slugRoutingAllowed = isSlugRoutingAllowed();
    const rawSlugParam = slugRoutingAllowed ? params.get("slug") : "";
    const slugParam = rawSlugParam ? decodeURIComponent(rawSlugParam.toString()).trim() : "";
    const pathSlug = slugRoutingAllowed ? getSlugFromPath() : "";
    const candidateSlug = slugParam || pathSlug;
    let resolvedGame = null;
    let resolvedGameId = gameId;
    let renderAction = null;

    const setRenderAction = (action) => {
        if (renderAction) return;
        renderAction = action;
    };

    const finalizeRenderGate = () => {
        requestAnimationFrame(() => {
            unlockSingleGameRender();
        });
    };

    const finalizeRenderOnce = () => {
        if (CCG_SINGLE_RENDERED) return;
        CCG_SINGLE_RENDERED = true;
        resolved = true;
        CCG_GAME_RESOLVED = true;
        if (renderAction) {
            renderAction();
        }
        finalizeRenderGate();
    };

    try {
        const response = await fetch(resolveGamesDataUrl(), { cache: "no-store" });
        if (!response.ok) throw new Error(`games.json ${response.status}`);

        const games = await response.json();
        CCG_SINGLE_ALL_GAMES = Array.isArray(games) ? games : [];

        if (typeof window !== "undefined" && typeof window.ccgRegisterGameSlugs === "function") {
            window.ccgRegisterGameSlugs(CCG_SINGLE_ALL_GAMES);
        }

        const idIndex = buildIdIndex(CCG_SINGLE_ALL_GAMES);
        const slugIndex = buildSlugIndex(CCG_SINGLE_ALL_GAMES);

        if (candidateSlug && slugRoutingAllowed) {
            resolvedGame = slugIndex.get(candidateSlug) || null;
            if (!resolvedGame) {
                // Legacy slug fallback (SEO preservation)
                const legacyId = LEGACY_COMPARE_MAP[normaliseCompareKey(candidateSlug)];
                if (legacyId) {
                    resolvedGame = idIndex.get(legacyId) || null;
                }
            }
            if (resolvedGame) {
                resolvedGameId = String(resolvedGame.id);
            }
        }

        if (!resolvedGame && resolvedGameId) {
            resolvedGame = idIndex.get(resolvedGameId) || null;
        }

        runSlugAudit(CCG_SINGLE_ALL_GAMES, slugIndex);

        if (!resolvedGame) {
            setRenderAction(() => renderGameNotFound(resolvedGameId, candidateSlug));
        } else {
            setRenderAction(() => renderGame(resolvedGame));
        }

    } catch (err) {
        setRenderAction(() => renderGameNotFound(resolvedGameId, candidateSlug));
    }

    finalizeRenderOnce();
});

/* ============================================================
   RESOLVERS (LOCKED)
============================================================ */

function normaliseCompareKey(input) {
    if (!input) return "";
    let key = String(input).toLowerCase();
    key = key.replace(/[^a-z0-9]/g, "");
    key = key.replace(/iii/g, "3").replace(/iv/g, "4").replace(/ii/g, "2");
    return key;
}

function buildIdIndex(games) {
    const index = new Map();
    games.forEach(game => {
        const key = String(game?.id ?? "").trim();
        if (key && !index.has(key)) {
            index.set(key, game);
        }
    });
    return index;
}

function buildSlugIndex(games) {
    const index = new Map();
    games.forEach(game => {
        const key = String(game?.slug ?? "").trim();
        if (key && !index.has(key)) {
            index.set(key, game);
        }
    });
    return index;
}

function buildLegacyCompareMap(legacyMap) {
    const compareMap = {};
    Object.entries(legacyMap).forEach(([slug, id]) => {
        const key = normaliseCompareKey(slug);
        if (key) compareMap[key] = id;
    });
    return compareMap;
}

function runSlugAudit(games, slugIndex) {
    const missing = [];
    const duplicates = [];
    const counts = new Map();

    games.forEach(game => {
        const slug = String(game?.slug ?? "").trim();
        if (!slug) {
            missing.push(game?.id ?? "unknown");
            return;
        }
        counts.set(slug, (counts.get(slug) || 0) + 1);
    });

    counts.forEach((count, slug) => {
        if (count > 1) duplicates.push(slug);
    });

    if (!isDevMode()) return;

    if (missing.length || duplicates.length) {
        console.warn("[CCG SLUG AUDIT]", {
            totalChecked: games.length,
            missing,
            duplicates
        });
    }
}

function isDevMode() {
    const host = window.location.hostname || "";
    return host === "localhost"
        || host === "127.0.0.1"
        || host.endsWith(".local")
        || (window.location.pathname || "").includes("/ccgamer_website_new/");
}

function resolveGamesDataUrl() {
    const root = (typeof window !== "undefined" && typeof window.ccgGetSiteRoot === "function")
        ? window.ccgGetSiteRoot()
        : "/";
    return `${root}games/games.json`;
}

function resolveSingleGameThumbBasePath() {
    let pathname = window.location.pathname || "";
    const repoMarker = "/ccgamer_website_new/";
    if (pathname.includes(repoMarker)) {
        pathname = pathname.slice(pathname.indexOf(repoMarker) + repoMarker.length);
    }

    const isTrailingSlashPath = pathname.endsWith("/") || pathname.endsWith("index.html");
    pathname = pathname.replace(/^\/+|\/+$/g, "");
    const segments = pathname ? pathname.split("/") : [];
    const isPrettyGamePath = segments[0] === "games"
        && segments.length >= 2
        && !segments[1].includes(".html");
    const isDirectoryPath = isTrailingSlashPath || isPrettyGamePath;
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

function resolveGameIdFromSlug(slug) {
    if (!slug) return "";
    return String(slug).trim().toLowerCase().replace(/-+/g, "-").replace(/-/g, "_");
}

function resolveGameSlug(gameId) {
    if (typeof window !== "undefined" && typeof window.ccgGameSlugFromId === "function") {
        return window.ccgGameSlugFromId(gameId);
    }
    return "";
}

function resolvePrettyGameUrl(game) {
    const slug = String(game?.slug ?? "").trim() || resolveGameSlug(game?.id);
    if (!slug) return "";
    return resolveCanonicalGamePath(slug);
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
    slug = slug.replace(/\/+$/g, "");
    if (slug === "game") return "";
    return slug;
}

function resolveCanonicalGamePath(slug) {
    const root = (typeof window !== "undefined" && typeof window.ccgGetSiteRoot === "function")
        ? window.ccgGetSiteRoot()
        : "/";
    return `${root}games/${slug}/`;
}

function updatePrettyUrlAfterResolve(game) {
    const pretty = resolvePrettyGameUrl(game);
    if (!pretty) return;

    const url = new URL(pretty, window.location.origin);
    if (window.location.pathname !== url.pathname) {
        window.history.replaceState({}, "", url.pathname);
    }
}

function getNormalizedPathname() {
    let pathname = window.location.pathname || "";
    const repoMarker = "/ccgamer_website_new/";
    if (pathname.includes(repoMarker)) {
        pathname = pathname.slice(pathname.indexOf(repoMarker) + repoMarker.length - 1);
    }
    return pathname;
}

function isSlugRoutingAllowed() {
    const pathname = getNormalizedPathname().toLowerCase();
    if (!pathname.startsWith("/games/")) return false;

    const tail = pathname.replace(/^\/+/, "").slice("games/".length);
    if (!tail) return false;

    if (tail.startsWith("genres") || tail.startsWith("collections")) return false;
    if (tail.endsWith(".html") && tail !== "game.html") return false;

    return true;
}

function ensureDirectNavLinks() {
    const header = document.querySelector("[data-ccg-header]");
    if (!header) return;
    const siteRoot = (typeof window !== "undefined" && typeof window.ccgGetSiteRoot === "function")
        ? window.ccgGetSiteRoot()
        : "/";
    const rootPrefix = siteRoot.endsWith("/") ? siteRoot : `${siteRoot}/`;

    header.querySelectorAll("a[href]").forEach(link => {
        const href = link.getAttribute("href") || "";
        if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) {
            return;
        }
        if (href.startsWith("/")) return;
        const cleaned = href.replace(/^(\.\/|(\.\.\/)+)/, "");
        if (!cleaned) return;
        link.setAttribute("href", `${rootPrefix}${cleaned}`);
    });
}

/* ============================================================
   RENDER GAME
============================================================ */

function renderGame(game) {

    updatePrettyUrlAfterResolve(game);
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
    const rawManual = resolveManualUrl(game);
    const manual = (typeof rawManual === "string" && rawManual.trim())
        ? normaliseManualUrl(rawManual)
        : "";
    if (manual) {
        const btn = document.getElementById("gameManualBtn");
        btn.href = manual;
        btn.target = "_blank";
        btn.rel = "noopener";
        btn.hidden = false;
        downloadsSection.hidden = false;

        const manualModal = document.getElementById("manualModal");
        const manualFrame = document.getElementById("gameManualEmbed");
        const manualClose = document.getElementById("manualModalClose");

        if (manualModal && manualFrame && manualClose) {
            btn.addEventListener("click", e => {
                // Open inline for PDFs/Drive; fall back to normal links
                if (!manual.includes(".pdf") && !manual.includes("drive.google.com")) return;
                e.preventDefault();

                manualFrame.src = manual;
                manualModal.classList.add("open");
                manualModal.setAttribute("aria-hidden", "false");
            });

            manualClose.addEventListener("click", () => {
                manualModal.classList.remove("open");
                manualModal.setAttribute("aria-hidden", "true");
                manualFrame.src = "";
            });

            manualModal.addEventListener("click", e => {
                if (e.target !== manualModal) return;
                manualModal.classList.remove("open");
                manualModal.setAttribute("aria-hidden", "true");
                manualFrame.src = "";
            });
        }
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
    }

    /* SCREENSHOTS */
    const shots = Array.isArray(game.screenshots) ? game.screenshots : [];
    if (shots.length) {
        const gallery = document.getElementById("gameScreenshotsStrip");
        gallery.innerHTML = "";
        CCG_SCREENSHOTS = shots;
        shots.forEach((src, i) => {
            const img = document.createElement("img");
            img.src = src;
            img.alt = `${game.title || "Game"} screenshot ${i + 1}`;
            img.addEventListener("click", () => {
                CCG_SCREENSHOT_INDEX = i;
                openScreenshotModal(i);
            });
            gallery.appendChild(img);
        });
        const screenshotsSection = document.querySelector(".game-screenshots");
        if (screenshotsSection) screenshotsSection.hidden = false;
    }

    /* RELATED GAMES */
    renderRelatedGames(game);
}

/* ============================================================
   META
============================================================ */

function updateMeta(game) {
    const title = `${game.title || "Game"} | Cheeky Commodore Gamer`;
    document.title = title;

    const desc = game.description
        ? game.description.replace(/<[^>]*>/g, "").slice(0, 160)
        : `Play ${game.title || "this"} classic Commodore 64 game online.`;

    const metaDesc = document.querySelector("meta[name='description']");
    if (metaDesc) metaDesc.setAttribute("content", desc);

    const canonicalPath = resolvePrettyGameUrl(game);
    const canonicalUrl = canonicalPath
        ? new URL(canonicalPath, window.location.origin).toString()
        : window.location.href;

    const canonicalLink = document.getElementById("game-canonical");
    if (canonicalLink) canonicalLink.setAttribute("href", canonicalUrl);

    const ogTitle = document.getElementById("game-og-title");
    if (ogTitle) ogTitle.setAttribute("content", title);

    const ogDesc = document.getElementById("game-og-description");
    if (ogDesc) ogDesc.setAttribute("content", desc);

    const ogUrl = document.getElementById("game-og-url");
    if (ogUrl) ogUrl.setAttribute("content", canonicalUrl);

    const twitterTitle = document.getElementById("game-twitter-title");
    if (twitterTitle) twitterTitle.setAttribute("content", title);

    const twitterDesc = document.getElementById("game-twitter-description");
    if (twitterDesc) twitterDesc.setAttribute("content", desc);
}

/* ============================================================
   RELATED GAMES (SG-E5)
============================================================ */

function renderRelatedGames(game) {
    const container = document.getElementById("relatedGamesTrack");
    const section = document.querySelector(".game-section--related");

    if (!container || !section) return;

    const developer = game.developer;
    if (!developer) return;

    const related = CCG_SINGLE_ALL_GAMES.filter(g =>
        g.id !== game.id && g.developer === developer
    );

    if (!related.length) return;

    container.innerHTML = "";

    related.forEach(rel => {
        const card = document.createElement("a");
        card.className = "related-card";
        card.href = resolvePrettyGameUrl(rel);

        const img = document.createElement("img");
        img.src = resolveGameThumb(rel.thumbnail || rel.thumb || rel.cover);
        img.alt = rel.title || "Game";

        const title = document.createElement("span");
        title.textContent = rel.title || "Unknown";

        card.appendChild(img);
        card.appendChild(title);
        container.appendChild(card);
    });

    section.hidden = false;
    initRelatedCarousel();
}

function initRelatedCarousel() {
    const track = document.getElementById("relatedGamesTrack");
    const prevBtn = document.querySelector(".related-carousel__nav--prev");
    const nextBtn = document.querySelector(".related-carousel__nav--next");

    if (!track || !prevBtn || !nextBtn) return;
    if (track.dataset.carouselReady === "true") return;
    track.dataset.carouselReady = "true";

    const getScrollStep = () => {
        const card = track.querySelector(".related-card");
        if (!card) return track.clientWidth || 0;
        const gapValue = parseFloat(window.getComputedStyle(track).gap || "0");
        const cardWidth = card.getBoundingClientRect().width || 0;
        return cardWidth + (Number.isNaN(gapValue) ? 0 : gapValue);
    };

    const updateButtons = () => {
        const maxScroll = track.scrollWidth - track.clientWidth;
        const atStart = track.scrollLeft <= 1;
        const atEnd = track.scrollLeft >= maxScroll - 1;

        prevBtn.disabled = atStart;
        nextBtn.disabled = atEnd;
        prevBtn.setAttribute("aria-disabled", String(atStart));
        nextBtn.setAttribute("aria-disabled", String(atEnd));
    };

    const handleScroll = (direction) => {
        const step = getScrollStep();
        if (!step) return;
        track.scrollBy({ left: direction * step, behavior: "smooth" });
    };

    prevBtn.addEventListener("click", () => handleScroll(-1));
    nextBtn.addEventListener("click", () => handleScroll(1));
    track.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);

    updateButtons();
}

/* ============================================================
   SCREENSHOT MODAL (SG-E3+)
============================================================ */

function openScreenshotModal(index) {
    const modal = document.getElementById("ccgModal");
    const frame = document.getElementById("ccgModalFrame");

    if (!modal || !frame) return;

    const src = CCG_SCREENSHOTS[index];
    if (!src) return;

    frame.src = src;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
}

function closeScreenshotModal() {
    const modal = document.getElementById("ccgModal");
    const frame = document.getElementById("ccgModalFrame");

    if (!modal || !frame) return;

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    frame.src = "";
}

function showNextScreenshot() {
    if (!CCG_SCREENSHOTS.length) return;
    CCG_SCREENSHOT_INDEX = (CCG_SCREENSHOT_INDEX + 1) % CCG_SCREENSHOTS.length;
    openScreenshotModal(CCG_SCREENSHOT_INDEX);
}

function showPrevScreenshot() {
    if (!CCG_SCREENSHOTS.length) return;
    CCG_SCREENSHOT_INDEX =
        (CCG_SCREENSHOT_INDEX - 1 + CCG_SCREENSHOTS.length) % CCG_SCREENSHOTS.length;
    openScreenshotModal(CCG_SCREENSHOT_INDEX);
}

/* ============================================================
   NOT FOUND
============================================================ */

function renderGameNotFound(gameId, slug) {
    if (!resolved) return;
    const hero = document.querySelector(".game-hero");
    if (hero) hero.style.display = "none";

    const section = document.getElementById("gameNotFound");
    if (section) {
        section.style.display = "block";
        const idEl = document.getElementById("notFoundId");
        if (idEl) {
            const fallback = slug || gameId || "Unknown";
            idEl.textContent = fallback;
        }
    }
}

/* ============================================================
   EVENT LISTENERS
============================================================ */

document.querySelector(".ccg-modal-close")
    ?.addEventListener("click", closeScreenshotModal);

document.querySelector(".ccg-modal-nav--next")
    ?.addEventListener("click", showNextScreenshot);

document.querySelector(".ccg-modal-nav--prev")
    ?.addEventListener("click", showPrevScreenshot);

// Close modal on background click
const screenshotModal = document.getElementById("ccgModal");
if (screenshotModal) {
    screenshotModal.addEventListener("click", e => {
        if (e.target === screenshotModal) closeScreenshotModal();
    });
}
