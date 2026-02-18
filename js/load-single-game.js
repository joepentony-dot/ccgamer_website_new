// SAFETY: prevent preload crash
function isPreloadedSingleGame() {
    return false;
}

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
let CCG_MODAL_KEY_HANDLER = null;
let CCG_MODAL_TOUCH_START = null;
let CCG_SCROLL_PROGRESS_READY = false;
let CCG_BACK_TO_TOP_READY = false;
let CCG_QUICK_ACTIONS_READY = false;
let CCG_RELATED_OBSERVER = null;
let CCG_FAVOURITES_INIT = false;
let CCG_FAVOURITES_LOADING = false;
const CCG_BOX3D_PATH_CACHE = new Map();
const CCG_BOX3D_SLUG_CACHE = new Map();
const CCG_RENDER_GATE = {
    container: null,
    locked: false,
};
const CCG_MOBILE_SCROLL_FIX = {
    initialized: false,
    lastAppliedMobile: null,
};

const CCG_DEBUG_SCROLL = {
    initialized: false,
};

function hasPrefilledSingleGameContent() {
    const container = document.querySelector(".ccg-page--single-game");
    if (!container) return false;
    if (container.getAttribute("data-ccg-prefilled") === "true") return true;
    const heroTitle = document.getElementById("gameHeroTitle");
    return !!(heroTitle && heroTitle.textContent.trim());
}

function lockSingleGameRender() {
    if (hasPrefilledSingleGameContent()) return;

    if (CCG_RENDER_GATE.locked) return;

    CCG_RENDER_GATE.container =
        document.querySelector(".ccg-page--single-game");

    if (CCG_RENDER_GATE.container) {
        CCG_RENDER_GATE.container.style.opacity = "0";
        CCG_RENDER_GATE.container.style.pointerEvents = "none";
    }

    document.body?.classList.remove("ccg-loading-single");
    document.body?.classList.add("ccg-single-ready");

    CCG_RENDER_GATE.locked = true;
}

function unlockSingleGameRender() {
    if (!CCG_RENDER_GATE.locked) return;

    if (CCG_RENDER_GATE.container) {
        CCG_RENDER_GATE.container.style.opacity = "";
        CCG_RENDER_GATE.container.style.pointerEvents = "";
        CCG_RENDER_GATE.container.removeAttribute("hidden");
    }

    document.body?.classList.remove("ccg-loading-single");
    document.body?.classList.add("ccg-single-ready");

    CCG_RENDER_GATE.locked = false;
}

function isSingleGameMobileViewport() {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
}

function normalizeMobileScrollContainer(element, options = {}) {
    if (!element || typeof window === "undefined") return;
    const allowHorizontal = options.allowHorizontal === true;
    const enforceRoot = options.enforceRoot === true;
    const style = window.getComputedStyle(element);

    if (enforceRoot) {
        element.style.height = "auto";
        element.style.minHeight = "100%";
        element.style.maxHeight = "none";
        element.style.overflowY = "auto";
        element.style.overflowX = "hidden";
        element.style.overscrollBehavior = "auto";
        element.style.touchAction = "pan-y";
        element.style.webkitOverflowScrolling = "touch";
        element.style.scrollBehavior = "auto";
        if (style.position === "fixed" || style.position === "sticky") {
            element.style.position = "static";
        }
        return;
    }

    element.style.height = "auto";
    element.style.minHeight = "0";
    element.style.maxHeight = "none";
    element.style.contain = "none";

    if (allowHorizontal) {
        element.style.overflowX = "auto";
        element.style.overflowY = "hidden";
        element.style.overscrollBehavior = "auto";
        element.style.touchAction = "pan-x pan-y";
    } else {
        element.style.overflow = "visible";
        element.style.overflowX = "visible";
        element.style.overflowY = "visible";
    }

    if (style.position === "fixed" || style.position === "sticky") {
        element.style.position = "static";
    }
    if (style.transform && style.transform !== "none") {
        element.style.transform = "none";
    }
}

function applyMobileSingleScrollFix() {
    if (!isSingleGameMobileViewport()) {
        CCG_MOBILE_SCROLL_FIX.lastAppliedMobile = false;
        return;
    }

    const targets = [
        { selector: "html[data-ccg-page=\"single-game\"]", enforceRoot: true },
        { selector: "html[data-ccg-page=\"single-game\"] body", enforceRoot: true },
        { selector: ".ccg-page--single-game" },
        { selector: ".ccg-page--single-game .ccg-main" },
        { selector: ".ccg-page--single-game main" },
        { selector: ".ccg-page--single-game .game-shell" },
        { selector: ".ccg-page--single-game .game-hero" },
        { selector: ".ccg-page--single-game .game-hero__inner" },
        { selector: ".ccg-page--single-game .game-hero__content" },
        { selector: ".ccg-page--single-game .game-section" },
        { selector: ".ccg-page--single-game .game-media" },
        { selector: ".ccg-page--single-game .game-media__grid" },
        { selector: ".ccg-page--single-game .game-description" },
        { selector: ".ccg-page--single-game .game-facts" },
        { selector: ".ccg-page--single-game .game-credits__list" },
        { selector: ".ccg-page--single-game .game-media__item--video" },
        { selector: ".ccg-page--single-game .game-media__item--downloads" },
        { selector: ".ccg-page--single-game .game-media__item--links" },
        { selector: ".ccg-page--single-game .game-screenshots" },
        { selector: ".ccg-page--single-game .game-screenshots__strip" },
        { selector: ".ccg-page--single-game .game-section--related" },
        { selector: ".ccg-page--single-game .related-carousel" },
        { selector: ".ccg-page--single-game .related-carousel__track" },
        { selector: ".ccg-page--single-game .related-carousel__viewport", allowHorizontal: true },
    ];

    targets.forEach((target) => {
        const elements = document.querySelectorAll(target.selector);
        elements.forEach((element) => {
            normalizeMobileScrollContainer(element, target);
        });
    });

    CCG_MOBILE_SCROLL_FIX.lastAppliedMobile = true;
}

function scheduleMobileSingleScrollFix() {
    if (!isSingleGameMobileViewport()) return;
    requestAnimationFrame(() => {
        applyMobileSingleScrollFix();
    });
}

function isSingleGamePage() {
    const pageFlag = document.documentElement?.getAttribute("data-ccg-page");
    return pageFlag === "single-game" || !!document.querySelector(".ccg-page--single-game");
}

function shouldDebugSingleGameScroll() {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("ccgDebugScroll") === "1";
}

function getElementScrollLabel(element) {
    if (!(element instanceof Element)) return String(element);
    const id = element.id ? `#${element.id}` : "";
    const classList = element.classList && element.classList.length
        ? `.${Array.from(element.classList).join(".")}`
        : "";
    return `${element.tagName.toLowerCase()}${id}${classList}`;
}

function logSingleGameScrollDiagnostics() {
    if (!isSingleGamePage() || !shouldDebugSingleGameScroll()) return;
    if (CCG_DEBUG_SCROLL.initialized) return;
    CCG_DEBUG_SCROLL.initialized = true;

    const scrollingElement = document.scrollingElement;
    const candidates = Array.from(document.querySelectorAll("*")).filter((element) => {
        const style = window.getComputedStyle(element);
        const overflowY = style.overflowY;
        if (overflowY !== "auto" && overflowY !== "scroll") return false;
        return element.scrollHeight > element.clientHeight;
    });

    console.groupCollapsed("[CCG DEBUG] Single-game scroll containers");
    console.log("document.scrollingElement:", getElementScrollLabel(scrollingElement));
    console.table(candidates.map((element) => {
        const style = window.getComputedStyle(element);
        return {
            element: getElementScrollLabel(element),
            position: style.position,
            height: style.height,
            maxHeight: style.maxHeight,
            overflowY: style.overflowY,
            overscrollBehavior: style.overscrollBehavior || style.overscrollBehaviorY,
            webkitOverflowScrolling: style.webkitOverflowScrolling || style.WebkitOverflowScrolling,
        };
    }));
    console.groupEnd();
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
    "smash_t_5": "smash_tv",
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
    if (!CCG_MOBILE_SCROLL_FIX.initialized) {
        CCG_MOBILE_SCROLL_FIX.initialized = true;
        applyMobileSingleScrollFix();
        window.addEventListener("resize", scheduleMobileSingleScrollFix, { passive: true });
        window.addEventListener("orientationchange", scheduleMobileSingleScrollFix, { passive: true });
    }

    const params = new URLSearchParams(window.location.search);
    // Regression note: slug routing was skipped for /games/<slug>/index.html because the
    // ".html" guard blocked slug parsing, leaving the render gate locked and the page blank.
    // We now normalize slug tokens from the pathname first, then query params, then legacy IDs.
    const safeDecode = (value) => {
        if (!value) return "";
        try {
            return decodeURIComponent(value);
        } catch (error) {
            console.warn("[CCG SINGLE] Failed to decode URL parameter.", error);
            return String(value);
        }
    };

    const rawGameId = (params.get("id") || "").toString().trim();
    const rawSlugParam = (params.get("slug") || "").toString().trim();
    let gameId = safeDecode(rawGameId).trim();
    const slugRoutingAllowed = isSlugRoutingAllowed();
    const slugParam = rawSlugParam ? safeDecode(rawSlugParam).trim() : "";
    const pathSlug = slugRoutingAllowed ? getSlugFromPath() : "";
    const candidateSlug = pathSlug || slugParam;
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
        applyMobileSingleScrollFix();
        requestAnimationFrame(() => {
            logSingleGameScrollDiagnostics();
        });
        finalizeRenderGate();
    };

    try {
        const { games, source } = await fetchGamesLibrary();
        CCG_SINGLE_ALL_GAMES = games;

        if (isDevMode()) {
            console.info("[CCG SINGLE] Loaded games library from", source);
        }

        if (typeof window !== "undefined" && typeof window.ccgRegisterGameSlugs === "function") {
            window.ccgRegisterGameSlugs(CCG_SINGLE_ALL_GAMES);
        }

        const idIndex = buildIdIndex(CCG_SINGLE_ALL_GAMES);
        const slugIndex = buildSlugIndex(CCG_SINGLE_ALL_GAMES);

        const resolveByToken = (token) => {
            if (!token) return null;
            const slugKey = normalizeSlugKey(token);
            const idKey = normalizeIdKey(token);
            return slugIndex.get(slugKey) || idIndex.get(idKey) || null;
        };

        const resolveLegacyId = (token) => {
            if (!token) return "";
            return LEGACY_COMPARE_MAP[normaliseCompareKey(token)] || "";
        };

        const queryToken = slugParam || gameId;
        const resolutionQueue = [candidateSlug, queryToken];

        for (const token of resolutionQueue) {
            if (resolvedGame) break;
            resolvedGame = resolveByToken(token);
            if (resolvedGame) {
                resolvedGameId = String(resolvedGame.id);
            }
        }

        if (!resolvedGame) {
            const legacyCandidate = resolveLegacyId(candidateSlug || queryToken);
            if (legacyCandidate) {
                resolvedGame = resolveByToken(legacyCandidate);
                if (resolvedGame) {
                    resolvedGameId = String(resolvedGame.id);
                }
            }
        }

        runSlugAudit(CCG_SINGLE_ALL_GAMES, slugIndex);

        if (!resolvedGame) {
            console.warn("[CCG SINGLE] Game not resolved.", {
                id: resolvedGameId,
                slug: candidateSlug
            });
            setRenderAction(() => renderGameNotFound(resolvedGameId, candidateSlug));
        } else {
            setRenderAction(() => renderGame(resolvedGame));
        }

    } catch (err) {
        console.warn("[CCG SINGLE] Failed to load games.json or resolve game.", err);
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
        const key = normalizeIdKey(game?.id);
        if (key && !index.has(key)) {
            index.set(key, game);
        }
    });
    return index;
}

function buildSlugIndex(games) {
    const index = new Map();
    games.forEach(game => {
        const key = normalizeSlugKey(game?.slug);
        if (key && !index.has(key)) {
            index.set(key, game);
        }

        if (key === "smash-t-5" || key === "smash-t-v") {
            index.set("smash-tv", game);
        }
    });
    return index;
}

function normalizeSlugKey(value) {
    if (!value) return "";
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/_+/g, "-")
        .replace(/\/+$/g, "");
}

function normalizeIdKey(value) {
    if (!value) return "";
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/-+/g, "_");
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

function resolveGamesDataFallbackUrls() {
    const urls = [];
    const pushUnique = (value) => {
        const candidate = String(value || "").trim();
        if (!candidate) return;
        if (!urls.includes(candidate)) urls.push(candidate);
    };

    pushUnique(resolveGamesDataUrl());
    pushUnique("/games/games.json");
    pushUnique("../games.json");
    pushUnique("games.json");
    pushUnique("https://www.cheekycommodoregamer.co.uk/games/games.json");

    if (typeof window !== "undefined") {
        const origin = window.location?.origin || "";
        if (origin) {
            pushUnique(new URL("/games/games.json", origin).toString());
        }
    }

    return urls;
}

async function fetchGamesLibrary() {
    const urls = resolveGamesDataFallbackUrls();
    let lastError = null;

    for (const url of urls) {
        try {
            const response = await fetch(url, { cache: "no-store" });
            if (!response.ok) {
                lastError = new Error(`games.json ${response.status} via ${url}`);
                continue;
            }

            const payload = await response.json();
            return {
                games: Array.isArray(payload) ? payload : [],
                source: url
            };
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("Unable to load games.json from known paths.");
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

function resolveLemonLinks(game) {
    const raw = game.lemon || game.lemonlink || game.lemonlinks;
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map(link => String(link || "").trim()).filter(Boolean);
    }
    const link = String(raw || "").trim();
    return link ? [link] : [];
}

function resolveCreditsEntries(game) {
    const credits = (game?.credits && typeof game.credits === "object") ? game.credits : null;

    const normaliseCreditValue = (value) => {
        if (!value) return "";
        if (Array.isArray(value)) {
            const cleaned = value.map(item => String(item || "").trim()).filter(Boolean);
            return cleaned.length ? cleaned.join(", ") : "";
        }
        return String(value || "").trim();
    };

    const normaliseCreditTokens = (value) => {
        if (!value) return [];
        const values = Array.isArray(value) ? value : [value];
        return values
            .map(item => String(item || "").trim())
            .filter(Boolean)
            .map(item => item.replace(/\s+/g, " ").toLowerCase());
    };

    const publisherTokens = normaliseCreditTokens(credits?.publisher);
    const developerTokens = normaliseCreditTokens(credits?.developer ?? game?.developer);

    const tokensMatch = (source, target) => {
        if (!source.length || !target.length) return false;
        if (source.length !== target.length) return false;
        const sourceSet = new Set(source);
        const targetSet = new Set(target);
        if (sourceSet.size !== targetSet.size) return false;
        return Array.from(sourceSet).every(token => targetSet.has(token));
    };

    const showPublisher = publisherTokens.length > 0;
    const showDeveloper = developerTokens.length > 0 && !tokensMatch(publisherTokens, developerTokens);

    const entries = [
        { label: "Publisher", value: showPublisher ? normaliseCreditValue(credits?.publisher) : "" },
        { label: "Developer", value: showDeveloper ? normaliseCreditValue(credits?.developer ?? game?.developer) : "" },
        { label: "Producer", value: normaliseCreditValue(credits?.producer) },
        { label: "Programmer", value: normaliseCreditValue(credits?.coder) },
        { label: "Graphics", value: normaliseCreditValue(credits?.graphics) },
        { label: "Music", value: normaliseCreditValue(credits?.musician) },
        { label: "Re-release", value: normaliseCreditValue(credits?.re_releaser) }
    ];

    return entries.filter(entry => entry.value);
}

function insertAfter(target, node) {
    if (!target) return;
    const parent = target.parentNode;
    if (!parent) return;
    if (parent.contains(target)) {
        parent.insertBefore(node, target.nextSibling);
    } else {
        parent.appendChild(node);
    }
}

function resolveGenres(game) {
    const raw = game?.genres || game?.genre || [];
    if (Array.isArray(raw)) return raw.map(item => String(item || "").trim()).filter(Boolean);
    if (typeof raw === "string") {
        return raw.split(",").map(item => item.trim()).filter(Boolean);
    }
    return [];
}

function resolveCollections(game) {
    const raw = game?.collections || game?.collection || [];
    if (Array.isArray(raw)) return raw.map(item => String(item || "").trim()).filter(Boolean);
    if (typeof raw === "string") {
        return raw.split(",").map(item => item.trim()).filter(Boolean);
    }
    return [];
}

function hasTopPickGenre(game) {
    return resolveGenres(game).some(genre => genre.toLowerCase() === "top picks");
}

function formatRatingValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "";
    if (Number.isInteger(numeric)) return `${numeric}/10`;
    return `${numeric.toFixed(1)}/10`;
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
    let slug = String(game?.slug ?? "").trim() || resolveGameSlug(game?.id);
    if (slug === "smash-t-5" || slug === "smash-t-v") slug = "smash-tv";
    if (!slug) return "";
    return resolveCanonicalGamePath(slug);
}

function resolveCanonicalGameTitle(game) {
    const title = String(game?.title || "").trim();
    const slug = String(game?.slug || "").trim();
    const id = String(game?.id || "").trim();
    if (title.toLowerCase() === "smash t.v." || slug === "smash-t-5" || slug === "smash-t-v" || id === "smash_t_5" || id === "smash_tv") {
        return "Smash TV";
    }
    return title || "Game";
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
    if (slug.startsWith("genres/") || slug.startsWith("collections/")) return "";
    return slug;
}

function resolveCanonicalGamePath(slug) {
    const root = (typeof window !== "undefined" && typeof window.ccgGetSiteRoot === "function")
        ? window.ccgGetSiteRoot()
        : "/";
    return `${root}games/${slug}/`;
}

function updatePrettyUrlAfterResolve(game) {
    if (!isSlugRoutingAllowed()) return;
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
    if (tail.endsWith(".html") && tail !== "game.html" && !tail.endsWith("/index.html")) return false;

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

    const preloaded = isPreloadedSingleGame();
    updatePrettyUrlAfterResolve(game);
    updateMeta(game);

    /* HERO */
    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);
    const heroBg = document.getElementById("gameHeroBG");
    const heroThumb = document.getElementById("gameHeroThumb");
    const heroTitle = document.getElementById("gameHeroTitle");
    if (!preloaded || !(heroTitle && heroTitle.textContent.trim())) {
        if (heroBg) heroBg.style.backgroundImage = `url('${thumb}')`;
        if (heroThumb) {
            heroThumb.src = thumb;
            heroThumb.alt = `${resolveCanonicalGameTitle(game)} cover art`;
        }
        if (heroTitle) heroTitle.textContent = resolveCanonicalGameTitle(game);
        renderHeroMeta(game);
    }
    renderGameRating(game);
    renderHeroBadges(game);
    void renderFavouriteAction(game);
    void renderHeroBox3d(game);

    /* DESCRIPTION */
    const descriptionSection = document.getElementById("game-description-section");
    const descriptionEl = document.getElementById("gameDescription");
    const descriptionFilled = descriptionEl && descriptionEl.textContent.trim();
    if (!preloaded || !descriptionFilled) {
        if (game.description && descriptionEl) {
            descriptionEl.innerHTML = game.description;
            if (descriptionSection) descriptionSection.hidden = false;
        } else if (descriptionSection) {
            descriptionSection.hidden = true;
        }
    }
    const hasOverview = !!(descriptionSection && !descriptionSection.hidden);

    renderCreditsPanel(game);
    renderVerdictPanel(game);
    moveSpotlightSection();

    const mediaPanel = ensureMediaPanel();

    /* VIDEO */
    const vid = resolveVideoId(game);
    const videoSection = document.getElementById("game-video-section");
    const videoEmbed = document.getElementById("game-video-embed");
    const videoActions = videoSection ? videoSection.querySelector(".game-video__actions") : null;
    const videoBtn = document.getElementById("gameVideoBtn");
    const hasVideo = !!vid;

    if (hasVideo) {
        if (videoEmbed) {
            videoEmbed.src = `https://www.youtube-nocookie.com/embed/${vid}`;
            videoEmbed.hidden = false;
        }
        if (videoBtn) {
            videoBtn.href = `https://www.youtube.com/watch?v=${vid}`;
            videoBtn.hidden = false;
        }
        if (videoActions) videoActions.hidden = false;
        toggleGameEmptyMessage(videoSection, "video", "");
    } else {
        if (videoEmbed) {
            videoEmbed.src = "";
            videoEmbed.hidden = true;
        }
        if (videoBtn) videoBtn.hidden = true;
        if (videoActions) videoActions.hidden = true;
        toggleGameEmptyMessage(videoSection, "video", "Gameplay coming soon…");
    }

    if (videoSection) videoSection.hidden = false;

    /* DOWNLOADS */
    const downloadsSection = document.querySelector(".game-downloads");
    const rawManual = resolveManualUrl(game);
    const manual = (typeof rawManual === "string" && rawManual.trim())
        ? normaliseManualUrl(rawManual)
        : "";
    const manualBtn = document.getElementById("gameManualBtn");
    const hasManual = !!manual;
    if (manualBtn) {
        ensureActionButtonIcon(manualBtn, "/resources/images/icons/pdf.png", "PDF");
        if (hasManual) {
            manualBtn.href = manual;
            manualBtn.target = "_blank";
            manualBtn.rel = "noopener";
            manualBtn.hidden = false;
            manualBtn.dataset.manualUrl = manual;
            manualBtn.setAttribute("aria-expanded", "false");
            wireManualModal(manualBtn);
        } else {
            manualBtn.hidden = true;
            manualBtn.dataset.manualUrl = "";
            manualBtn.setAttribute("aria-expanded", "false");
        }
    }

    const disk = resolveDiskUrl(game);
    const diskBtn = document.getElementById("gameDiskBtn");
    const hasDisk = !!disk;
    if (diskBtn) {
        ensureActionButtonIcon(diskBtn, "/resources/images/icons/download.PNG", "Download");
        if (hasDisk) {
            diskBtn.href = disk;
            diskBtn.target = "_blank";
            diskBtn.rel = "noopener";
            diskBtn.hidden = false;
        } else {
            diskBtn.hidden = true;
        }
    }

    if (downloadsSection) {
        downloadsSection.hidden = false;
        updateDownloadsFallback(downloadsSection, hasManual, hasDisk);
    }

    const lemonLinks = resolveLemonLinks(game);
    renderMediaLinksPanel(mediaPanel, lemonLinks, game);

    const lemonBtn = document.getElementById("gameLemonBtn");
    if (lemonBtn) {
        lemonBtn.hidden = true;
    }

    updateMediaPanelVisibility(mediaPanel);

    /* SCREENSHOTS */
    const shots = Array.isArray(game.screenshots) ? game.screenshots : [];
    if (shots.length) {
        const gallery = document.getElementById("gameScreenshotsStrip");
        if (!preloaded || (gallery && !gallery.children.length)) {
            gallery.innerHTML = "";
        }
        CCG_SCREENSHOTS = shots;
        if (!preloaded || (gallery && !gallery.children.length)) {
            shots.forEach((src, i) => {
                const img = document.createElement("img");
                img.src = src;
                img.alt = `${resolveCanonicalGameTitle(game)} screenshot ${i + 1}`;
                img.className = "game-screenshot-thumb";
                img.addEventListener("click", () => {
                    CCG_SCREENSHOT_INDEX = i;
                    openScreenshotModal(i);
                });
                gallery.appendChild(img);
            });
        }
        const screenshotsSection = document.querySelector(".game-screenshots");
        if (screenshotsSection) screenshotsSection.hidden = false;
    } else {
        const screenshotsSection = document.querySelector(".game-screenshots");
        if (screenshotsSection) screenshotsSection.hidden = true;
    }

    /* RELATED GAMES */
    renderRelatedGames(game);

    const screenshotsSection = document.querySelector(".game-screenshots");
    const relatedSection = document.querySelector(".game-section--related");
    const hasScreenshots = !!(screenshotsSection && !screenshotsSection.hidden);
    const hasRelated = !!(relatedSection && !relatedSection.hidden);
    const hasRating = !!(document.getElementById("gameHeroRating") && !document.getElementById("gameHeroRating").hidden);

    renderFactsPanel(game);
    buildGameToc({
        overview: descriptionSection,
        video: videoSection,
        downloads: downloadsSection,
        gallery: screenshotsSection,
        related: relatedSection
    });
    initSingleGameUX({
        hasVideo,
        hasManual,
        hasDisk,
        hasOverview,
        hasScreenshots,
        hasRelated,
        hasRating
    });

    if (typeof document !== "undefined" && document.body) {
        const slug = String(game?.slug || "").trim();
        if (slug) {
            document.body.setAttribute("data-game-slug", slug);
        }
        const gameId = String(game?.id || "").trim();
        if (gameId) {
            document.body.setAttribute("data-game-id", gameId);
        }
    }

    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ccg:game-loaded", {
            detail: {
                game: game || null,
                gameId: game?.id || null,
                gameSlug: game?.slug || null,
                title: game?.title || null
            }
        }));
    }
}

async function getFavouriteSupabaseClient() {
    if (!(window.ccgSupabase && typeof window.ccgSupabase.getClient === "function")) {
        return null;
    }
    try {
        return await window.ccgSupabase.getClient();
    } catch (error) {
        console.error("[CCG FAVOURITES] Supabase client unavailable", error);
        return null;
    }
}

let CCG_FAVOURITE_LOGIN_NOTICE_TIMER = null;

function showFavouriteLoginNotice() {
    let host = document.getElementById("ccg-toast-host");
    if (!host) {
        host = document.createElement("div");
        host.id = "ccg-toast-host";
        host.className = "ccg-toast-host";
        document.body.appendChild(host);
    }

    let toast = host.querySelector(".ccg-favourite-login-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "ccg-logo-bubble ccg-favourite-login-toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        toast.innerHTML = '<span class="ccg-logo-bubble__text"></span>';
        host.appendChild(toast);
    }

    const textEl = toast.querySelector(".ccg-logo-bubble__text");
    if (!textEl) return;

    textEl.textContent = "Log in to save games to your favourites";
    toast.classList.add("is-visible");

    if (CCG_FAVOURITE_LOGIN_NOTICE_TIMER) {
        clearTimeout(CCG_FAVOURITE_LOGIN_NOTICE_TIMER);
    }

    CCG_FAVOURITE_LOGIN_NOTICE_TIMER = setTimeout(() => {
        toast.classList.remove("is-visible");
        CCG_FAVOURITE_LOGIN_NOTICE_TIMER = null;
    }, 2200);
}

function resolveCurrentGameSlug(game) {
    const explicit = String(game?.slug || "").trim();
    if (explicit) return explicit;
    return normalizeSlugKey(game?.id) || normalizeSlugKey(getSlugFromPath()) || "";
}

function ensureFavouriteButton() {
    const row = document.querySelector(".game-hero__title-row");
    if (!row) return null;

    let button = row.querySelector("[data-ccg-favourite-btn]");
    if (button) return button;

    button = document.createElement("button");
    button.type = "button";
    button.className = "ccg-btn ccg-btn--share";
    button.setAttribute("data-ccg-favourite-btn", "true");
    button.innerHTML = '<span class="ccg-btn__icon" aria-hidden="true">⭐</span><span class="ccg-btn__label">Add to favourites</span>';
    row.appendChild(button);
    return button;
}

function setFavouriteButtonState(button, { isFavourite = false, disabled = false } = {}) {
    if (!button) return;
    const label = button.querySelector(".ccg-btn__label");
    button.disabled = disabled;
    button.setAttribute("aria-pressed", isFavourite ? "true" : "false");
    button.classList.toggle("is-active", isFavourite);
    if (label) {
        label.textContent = isFavourite ? "Remove from favourites" : "Add to favourites";
    }
}

async function fetchFavouriteState(supabase, profileId, gameSlug) {
    const { data, error } = await supabase
        .from("profile_favourites")
        .select("id")
        .eq("profile_id", profileId)
        .eq("game_slug", gameSlug)
        .maybeSingle();

    if (error) {
        console.error("[CCG FAVOURITES] Failed to read favourite state", error, { profileId, gameSlug });
        return false;
    }
    return Boolean(data?.id);
}

async function toggleFavouriteState({ supabase, profileId, gameSlug, isFavourite }) {
    if (isFavourite) {
        const { error } = await supabase
            .from("profile_favourites")
            .delete()
            .eq("profile_id", profileId)
            .eq("game_slug", gameSlug);
        if (error) {
            console.error("[CCG FAVOURITES] Failed to remove favourite", error, { profileId, gameSlug });
            return false;
        }
        return true;
    }

    const { error } = await supabase
        .from("profile_favourites")
        .insert({ profile_id: profileId, game_slug: gameSlug });

    if (error) {
        if (String(error.code || "") === "23505") {
            return true;
        }
        console.error("[CCG FAVOURITES] Failed to add favourite", error, { profileId, gameSlug });
        return false;
    }
    return true;
}

async function renderFavouriteAction(game) {
    const button = ensureFavouriteButton();
    if (!button) return;

    const gameSlug = resolveCurrentGameSlug(game);
    if (!gameSlug) {
        button.hidden = true;
        return;
    }
    button.hidden = false;
    button.dataset.gameSlug = gameSlug;

    const supabase = await getFavouriteSupabaseClient();
    if (!supabase) {
        setFavouriteButtonState(button, { isFavourite: false, disabled: false });
        return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
        console.error("[CCG FAVOURITES] Unable to resolve user", authError);
    }
    const user = authData?.user || null;

    if (!user) {
        setFavouriteButtonState(button, { isFavourite: false, disabled: false });
    } else {
        const isFavourite = await fetchFavouriteState(supabase, user.id, gameSlug);
        setFavouriteButtonState(button, { isFavourite, disabled: false });
    }

    if (CCG_FAVOURITES_INIT) return;

    // Foundation favourite action: private per-user toggle, no public counters yet.
    button.addEventListener("click", async () => {
        if (CCG_FAVOURITES_LOADING) return;

        const targetSlug = String(button.dataset.gameSlug || "").trim();
        if (!targetSlug) return;

        const client = await getFavouriteSupabaseClient();
        if (!client) return;

        const { data, error } = await client.auth.getUser();
        if (error) {
            console.error("[CCG FAVOURITES] Unable to resolve user before toggle", error);
            return;
        }

        const currentUser = data?.user || null;
        if (!currentUser) {
            showFavouriteLoginNotice();
            return;
        }

        CCG_FAVOURITES_LOADING = true;
        button.classList.add("is-busy");

        const currentlyFavourite = button.getAttribute("aria-pressed") === "true";
        const success = await toggleFavouriteState({
            supabase: client,
            profileId: currentUser.id,
            gameSlug: targetSlug,
            isFavourite: currentlyFavourite
        });

        if (success) {
            setFavouriteButtonState(button, { isFavourite: !currentlyFavourite, disabled: false });
        }

        button.classList.remove("is-busy");
        CCG_FAVOURITES_LOADING = false;
    });

    CCG_FAVOURITES_INIT = true;
}

function renderGameRating(game) {
    const ratingContainer = document.querySelector("[data-ccg-rating]");
    const heroRating = document.getElementById("gameHeroRating");
    const starsEl = document.getElementById("gameRatingStars");
    const statusEl = document.getElementById("gameRatingStatus");
    const reasonEl = document.getElementById("gameRatingReason");

    if (!ratingContainer || !starsEl || !statusEl || !reasonEl) return;

    const ratingData = typeof window.ccgResolveRatingValue === "function"
        ? window.ccgResolveRatingValue(game)
        : { value: Number(game?.ccg_rating), isRated: Number.isFinite(Number(game?.ccg_rating)) };

    if (typeof window.ccgBuildRatingStars === "function") {
        starsEl.innerHTML = window.ccgBuildRatingStars(ratingData);
    }

    if (ratingData.isRated) {
        ratingContainer.hidden = false;
        if (heroRating) heroRating.hidden = false;
        statusEl.hidden = true;
        ratingContainer.setAttribute("aria-label", `Cheeky Commodore Gamer Rating: ${ratingData.value}/10`);
    } else {
        ratingContainer.hidden = true;
        if (heroRating) heroRating.hidden = true;
    }

    const reason = String(game?.ccg_rating_reason || "").replace(/\s+/g, " ").trim();
    if (reason) {
        reasonEl.textContent = reason;
        reasonEl.hidden = false;
    } else {
        reasonEl.textContent = "";
        reasonEl.hidden = true;
    }
}

function renderHeroMeta(game) {
    const meta = document.querySelector(".game-hero__meta");
    const yearEl = document.getElementById("gameMetaYear");
    const systemEl = document.getElementById("gameMetaSystem");
    const developerEl = document.getElementById("gameMetaDeveloper");

    if (!meta || !yearEl || !systemEl || !developerEl) return;

    const year = String(game?.year || "").trim();
    const system = String(game?.system || "").trim();
    const developer = String(game?.publisher || game?.developer || "").trim();

    yearEl.textContent = year;
    yearEl.hidden = !year;
    systemEl.textContent = system;
    systemEl.hidden = !system;
    developerEl.textContent = developer;
    developerEl.hidden = !developer;

    const separators = meta.querySelectorAll(".game-meta__sep");
    const items = [yearEl, systemEl, developerEl];

    if (separators.length >= 2) {
        separators[0].hidden = !(items[0] && !items[0].hidden && items[1] && !items[1].hidden);
        separators[1].hidden = !(items[1] && !items[1].hidden && items[2] && !items[2].hidden);
    }

    meta.hidden = items.every(item => item.hidden);
}

function renderHeroBadges(game) {
    const heroContent = document.querySelector(".game-hero__content");
    if (!heroContent) return;

    let badgeWrap = heroContent.querySelector(".game-hero__badges");
    if (!badgeWrap) {
        badgeWrap = document.createElement("div");
        badgeWrap.className = "game-hero__badges";
        const title = heroContent.querySelector(".game-hero__title");
        const insertParent = title && title.parentNode ? title.parentNode : heroContent;
        if (title && insertParent && insertParent.contains(title)) {
            insertParent.insertBefore(badgeWrap, title.nextSibling);
        } else {
            heroContent.appendChild(badgeWrap);
        }
    }

    badgeWrap.innerHTML = "";

    const system = String(game?.system || "").trim();
    const year = String(game?.year || "").trim();
    const ratingData = typeof window.ccgResolveRatingValue === "function"
        ? window.ccgResolveRatingValue(game)
        : { value: Number(game?.ccg_rating), isRated: Number.isFinite(Number(game?.ccg_rating)) };
    const ratingLabel = ratingData.isRated ? formatRatingValue(ratingData.value) : "";
    const topPick = hasTopPickGenre(game);

    const addBadge = (text, className) => {
        if (!text) return;
        const badge = document.createElement("span");
        badge.className = `game-badge ${className || ""}`.trim();
        badge.textContent = text;
        badgeWrap.appendChild(badge);
    };

    addBadge(system, "game-badge--system");
    addBadge(year, "game-badge--year");
    addBadge(ratingLabel, "game-badge--rating");
    if (topPick) {
        addBadge("Top Picks", "game-badge--top");
    }

    badgeWrap.hidden = badgeWrap.children.length === 0;
}

function resolveBox3dSlug(game) {
    return normalizeSlugKey(game?.slug) || normalizeSlugKey(getSlugFromPath());
}

function resolveBox3dPath(slug) {
    const root = (typeof window !== "undefined" && typeof window.ccgGetSiteRoot === "function")
        ? window.ccgGetSiteRoot()
        : "/";
    const safeRoot = root.endsWith("/") ? root : `${root}/`;
    return `${safeRoot}resources/images/games/boxes-3d/${slug}.webp`;
}

async function checkBox3dExists(path) {
    if (CCG_BOX3D_PATH_CACHE.has(path)) {
        return CCG_BOX3D_PATH_CACHE.get(path);
    }
    try {
        const response = await fetch(path, { method: "HEAD", cache: "force-cache" });
        const exists = response.ok;
        CCG_BOX3D_PATH_CACHE.set(path, exists);
        return exists;
    } catch (error) {
        CCG_BOX3D_PATH_CACHE.set(path, false);
        return false;
    }
}

function resolveBox3dCandidateSlugs(slug) {
    const normalized = normalizeSlugKey(slug);
    if (!normalized) return [];
    const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    const upper = normalized.toUpperCase();
    const candidates = [normalized, capitalized, upper];
    return [...new Set(candidates.filter(Boolean))];
}

async function resolveBox3dAssetPath(slug) {
    if (!slug) return null;
    if (CCG_BOX3D_SLUG_CACHE.has(slug)) {
        return CCG_BOX3D_SLUG_CACHE.get(slug);
    }
    const candidates = resolveBox3dCandidateSlugs(slug);
    for (const candidate of candidates) {
        const path = resolveBox3dPath(candidate);
        const exists = await checkBox3dExists(path);
        if (exists) {
            CCG_BOX3D_SLUG_CACHE.set(slug, path);
            return path;
        }
    }
    CCG_BOX3D_SLUG_CACHE.set(slug, null);
    return null;
}

function clearHeroBox3d(hero) {
    if (!hero) return;
    const existing = hero.querySelector(".game-hero__box3d");
    if (existing) {
        const img = existing.querySelector("img");
        if (img) {
            img.removeAttribute("src");
            img.removeAttribute("alt");
        }
        existing.hidden = true;
    }
    hero.classList.remove("game-hero--has-box3d");
    delete hero.dataset.box3dSlug;
}

async function renderHeroBox3d(game) {
    const hero = document.querySelector(".game-hero");
    if (!hero) return;
    const heroInner = hero.querySelector(".game-hero__inner");
    if (!heroInner) return;

    const slug = resolveBox3dSlug(game);
    if (!slug) {
        clearHeroBox3d(hero);
        return;
    }

    hero.dataset.box3dSlug = slug;
    const path = await resolveBox3dAssetPath(slug);
    if (hero.dataset.box3dSlug !== slug) return;

    if (!path) {
        clearHeroBox3d(hero);
        return;
    }

    let box = hero.querySelector(".game-hero__box3d");
    let img = box ? box.querySelector("img") : null;
    if (!box) {
        box = document.createElement("div");
        box.className = "game-hero__box3d";
        img = document.createElement("img");
        img.className = "game-hero__box3d-img";
        img.loading = "lazy";
        img.decoding = "async";
        img.width = 600;
        img.height = 900;
        img.sizes = "(max-width: 900px) 55vw, (max-width: 1200px) 22vw, 220px";
        box.appendChild(img);
        heroInner.appendChild(box);
    }
    if (img) {
        img.src = path;
        img.alt = `${game?.title || "Game"} 3D box art`;
    }
    box.hidden = false;
    hero.classList.add("game-hero--has-box3d");
}

function ensureMediaPanel() {
    const main = document.querySelector(".ccg-main--single-game");
    const videoSection = document.getElementById("game-video-section");
    const downloadsSection = document.querySelector(".game-downloads");

    if (!main || !videoSection || !downloadsSection) return null;

    let mediaSection = document.getElementById("gameMediaSection");
    if (!mediaSection) {
        mediaSection = document.createElement("section");
        mediaSection.id = "gameMediaSection";
        mediaSection.className = "game-section game-media";
        mediaSection.hidden = true;
        mediaSection.innerHTML = `
            <p class="game-section__kicker">Media Vault</p>
            <h2 class="game-section__title">Media &amp; Resources</h2>
            <div class="game-media__grid"></div>
        `;

        const mediaAnchor = document.querySelector("[data-game-media-anchor]");
        const insertTarget = mediaAnchor || main;
        const insertParent = insertTarget ? insertTarget.parentNode : null;
        if (insertTarget && insertParent && insertParent.contains(insertTarget)) {
            insertParent.insertBefore(mediaSection, insertTarget.nextSibling);
        } else if (main) {
            main.appendChild(mediaSection);
        }
    }

    const grid = mediaSection.querySelector(".game-media__grid");
    if (grid) {
        if (!grid.contains(videoSection)) {
            grid.appendChild(videoSection);
        }
        if (!grid.contains(downloadsSection)) {
            grid.appendChild(downloadsSection);
        }
    }

    videoSection.classList.add("game-media__item", "game-media__item--video");
    downloadsSection.classList.add("game-media__item", "game-media__item--downloads");

    let linksPanel = mediaSection.querySelector(".game-media__links");
    if (!linksPanel) {
        linksPanel = document.createElement("div");
        linksPanel.className = "game-section game-media__item game-media__item--links game-media__links";
        linksPanel.innerHTML = `
            <p class="game-section__kicker">More Information</p>
            <h3 class="game-section__title">Further Reading</h3>
            <div class="game-media__links-list"></div>
        `;
        if (grid) {
            grid.appendChild(linksPanel);
        }
    }

    return {
        section: mediaSection,
        linksPanel
    };
}

function renderMediaLinksPanel(mediaPanel, links, game) {
    if (!mediaPanel || !mediaPanel.linksPanel) return;
    const list = mediaPanel.linksPanel.querySelector(".game-media__links-list");
    if (!list) return;

    list.innerHTML = "";
    const uniqueLinks = Array.from(new Set(links || []));

    if (!uniqueLinks.length) {
        mediaPanel.linksPanel.hidden = true;
        return;
    }

    const system = String(game?.system || "").trim().toUpperCase();
    const baseLabel = system === "AMIGA" ? "LEMON AMIGA" : "LEMON 64";

    uniqueLinks.forEach((link, index) => {
        const anchor = document.createElement("a");
        anchor.className = "game-pill";
        anchor.href = link;
        anchor.target = "_blank";
        anchor.rel = "noopener";
        anchor.textContent = uniqueLinks.length > 1
            ? `${baseLabel} LINK ${index + 1}`
            : baseLabel;
        list.appendChild(anchor);
    });

    mediaPanel.linksPanel.hidden = false;
}

function updateMediaPanelVisibility(mediaPanel) {
    if (!mediaPanel || !mediaPanel.section) return;
    const videoSection = document.getElementById("game-video-section");
    const downloadsSection = document.querySelector(".game-downloads");
    const linksPanel = mediaPanel.linksPanel;

    const hasAnySection = !!(videoSection || downloadsSection || linksPanel);
    if (!hasAnySection) return;

    if (videoSection) videoSection.hidden = false;
    if (downloadsSection) downloadsSection.hidden = false;
    mediaPanel.section.hidden = false;
}

function renderCreditsPanel(game) {
    const entries = resolveCreditsEntries(game);
    const heroContent = document.querySelector(".game-hero__content");
    if (!heroContent) return;

    const legacySection = document.getElementById("gameCreditsSection");
    if (legacySection) legacySection.remove();

    let inlineCredits = heroContent.querySelector(".ccg-behind-pixels-inline");
    if (!inlineCredits) {
        inlineCredits = document.createElement("div");
        inlineCredits.className = "ccg-behind-pixels-inline";
        inlineCredits.hidden = true;
        inlineCredits.innerHTML = `
            <p class="ccg-behind-pixels-inline__title">Behind the Pixels</p>
            <dl class="ccg-behind-pixels-inline__list"></dl>
        `;
    }

    const list = inlineCredits.querySelector(".ccg-behind-pixels-inline__list");
    if (!list) return;

    list.innerHTML = "";

    if (!entries.length) {
        inlineCredits.hidden = true;
    } else {
        entries.forEach(entry => {
            const term = document.createElement("dt");
            term.textContent = entry.label;
            const detail = document.createElement("dd");
            detail.textContent = entry.value;
            list.appendChild(term);
            list.appendChild(detail);
        });

        inlineCredits.hidden = false;
    }

    if (!heroContent.contains(inlineCredits)) {
        heroContent.appendChild(inlineCredits);
    }

    const anchor = heroContent.querySelector(".game-hero__rating") || heroContent.querySelector(".game-hero__meta");
    if (anchor) {
        insertAfter(anchor, inlineCredits);
    }
}

function renderVerdictPanel(game) {
    const ratingData = typeof window.ccgResolveRatingValue === "function"
        ? window.ccgResolveRatingValue(game)
        : { value: Number(game?.ccg_rating), isRated: Number.isFinite(Number(game?.ccg_rating)) };

    let verdictSection = document.getElementById("gameVerdictSection");
    if (!verdictSection) {
        verdictSection = document.createElement("section");
        verdictSection.id = "gameVerdictSection";
        verdictSection.className = "game-section game-verdict";
        verdictSection.hidden = true;
        verdictSection.innerHTML = `
            <p class="game-section__kicker">CCG Verdict</p>
            <div class="game-verdict__body">
                <div class="game-verdict__score" aria-label="Cheeky Commodore Gamer rating"></div>
                <p class="game-verdict__reason"></p>
            </div>
        `;
    }

    if (!ratingData.isRated) {
        verdictSection.hidden = true;
        return;
    }

    const scoreEl = verdictSection.querySelector(".game-verdict__score");
    const reasonEl = verdictSection.querySelector(".game-verdict__reason");
    if (scoreEl) scoreEl.textContent = formatRatingValue(ratingData.value);

    const reason = String(game?.ccg_rating_reason || "").replace(/\s+/g, " ").trim();
    if (reasonEl) {
        reasonEl.textContent = reason;
        reasonEl.hidden = !reason;
    }

    verdictSection.hidden = false;

    const heroContent = document.querySelector(".game-hero__content");
    if (heroContent && !heroContent.contains(verdictSection)) {
        const creditsBlock = heroContent.querySelector(".ccg-behind-pixels-inline");
        if (creditsBlock) {
            insertAfter(creditsBlock, verdictSection);
        } else {
            heroContent.appendChild(verdictSection);
        }
    }
}

function moveSpotlightSection() {
    const heroContent = document.querySelector(".game-hero__content");
    const descriptionSection = document.getElementById("game-description-section");
    if (!heroContent || !descriptionSection) return;

    if (!heroContent.contains(descriptionSection)) {
        heroContent.appendChild(descriptionSection);
    }
}

function toggleGameEmptyMessage(section, key, message) {
    if (!section) return;
    const existing = section.querySelector(`[data-game-empty="${key}"]`);
    if (!message) {
        if (existing) existing.hidden = true;
        return;
    }
    const box = existing || (() => {
        const el = document.createElement("div");
        el.className = "game-empty";
        el.dataset.gameEmpty = key;
        section.appendChild(el);
        return el;
    })();
    box.textContent = message;
    box.hidden = false;
}

function updateDownloadsFallback(section, hasManual, hasDisk) {
    if (!section) return;
    if (hasManual && hasDisk) {
        toggleGameEmptyMessage(section, "downloads", "");
        return;
    }
    const messages = [];
    if (!hasManual) messages.push("Manual being archived…");
    if (!hasDisk) messages.push("Download link coming soon…");
    toggleGameEmptyMessage(section, "downloads", messages.join(" "));
}

function ensureActionButtonIcon(button, iconSrc, iconAlt) {
    if (!button || !iconSrc) return;
    if (button.dataset.ccgIconReady === "true") return;

    const labelText = button.textContent.trim();
    button.textContent = "";

    const icon = document.createElement("span");
    icon.className = "ccg-btn__icon";
    icon.setAttribute("aria-hidden", "true");

    const iconImage = document.createElement("img");
    iconImage.src = iconSrc;
    iconImage.alt = iconAlt;
    iconImage.loading = "lazy";
    icon.appendChild(iconImage);

    const label = document.createElement("span");
    label.className = "ccg-btn__label";
    label.textContent = labelText;

    button.appendChild(icon);
    button.appendChild(label);
    button.dataset.ccgIconReady = "true";
}

function ensureManualModalAtDocumentRoot(modal) {
    if (!modal || !document.body) return false;
    if (modal.parentElement === document.body) return true;
    document.body.appendChild(modal);
    return modal.parentElement === document.body;
}

function closeManualModal() {
    const modal = document.getElementById("manualModal");
    const button = document.getElementById("gameManualBtn");
    const frame = document.getElementById("gameManualEmbed");
    if (!modal) return;

    modal.classList.remove("open", "active");
    modal.setAttribute("aria-hidden", "true");
    if (frame) frame.src = "";
    if (button) button.setAttribute("aria-expanded", "false");
}

function wireManualModal(button) {
    if (!button) return;

    const modal = document.getElementById("manualModal");
    const frame = document.getElementById("gameManualEmbed");
    const closeButton = document.getElementById("manualModalClose");
    if (!modal || !frame || !closeButton) return;

    ensureManualModalAtDocumentRoot(modal);

    if (modal.dataset.manualCloseBound !== "true") {
        closeButton.addEventListener("click", closeManualModal);
        modal.addEventListener("click", (event) => {
            if (event.target === modal) closeManualModal();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && modal.classList.contains("open")) {
                closeManualModal();
            }
        });
        modal.dataset.manualCloseBound = "true";
    }

    if (button.dataset.manualBound !== "true") {
        button.addEventListener("click", (event) => {
            const manualUrl = String(button.dataset.manualUrl || button.getAttribute("href") || "").trim();
            event.preventDefault();
            ensureManualModalAtDocumentRoot(modal);
            frame.src = manualUrl;

            modal.classList.add("open", "active");
            modal.setAttribute("aria-hidden", "false");
            button.setAttribute("aria-expanded", "true");
        });
        button.dataset.manualBound = "true";
    }
}

function formatFactValue(value) {
    if (!value) return "";
    if (Array.isArray(value)) {
        return value.map(item => String(item || "").trim()).filter(Boolean).join(", ");
    }
    if (typeof value === "number") return String(value);
    return String(value || "").trim();
}

function resolveCreditValue(game, key) {
    const credits = (game?.credits && typeof game.credits === "object") ? game.credits : null;
    return formatFactValue(credits?.[key] || game?.[key]);
}

function renderFactsPanel(game) {
    const factsPanel = document.querySelector("[data-game-facts]");
    const grid = document.querySelector("[data-game-facts-grid]");
    if (!factsPanel || !grid) return;

    grid.innerHTML = "";

    const system = formatFactValue(game?.system);
    const year = formatFactValue(game?.year);
    const developer = resolveCreditValue(game, "developer");
    let publisher = resolveCreditValue(game, "publisher");
    if (developer && publisher && normaliseCompareKey(developer) === normaliseCompareKey(publisher)) {
        publisher = "";
    }
    const genres = formatFactValue(resolveGenres(game));
    const collections = formatFactValue(resolveCollections(game));
    const players = formatFactValue(game?.players || game?.player);

    const facts = [
        { label: "System", value: system },
        { label: "Year", value: year },
        { label: "Developer", value: developer },
        { label: "Publisher", value: publisher },
        { label: "Genre", value: genres },
        { label: "Collection", value: collections },
        { label: "Players", value: players }
    ].filter(item => item.value);

    facts.forEach(item => {
        const wrapper = document.createElement("div");
        wrapper.className = "game-facts__item";
        const label = document.createElement("span");
        label.className = "game-facts__label";
        label.textContent = item.label;
        const value = document.createElement("span");
        value.className = "game-facts__value";
        value.textContent = item.value;
        wrapper.appendChild(label);
        wrapper.appendChild(value);
        grid.appendChild(wrapper);
    });

    factsPanel.hidden = facts.length === 0;
}


function ensureSectionId(section, id) {
    if (!section) return "";
    if (!section.id) {
        section.id = id;
    }
    return section.id;
}

function smoothScrollTo(target) {
    if (!target) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const offset = 90;
    const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior: prefersReduced ? "auto" : "smooth" });
}

function buildGameToc(sections) {
    const toc = document.querySelector("[data-game-toc]");
    if (!toc) return;

    toc.innerHTML = "";
    toc.setAttribute("aria-label", "Game sections");

    const entries = [
        { key: "overview", label: "Overview", element: sections.overview, id: "game-description-section" },
        { key: "video", label: "Video", element: sections.video, id: "game-video-section" },
        { key: "downloads", label: "Downloads", element: sections.downloads, id: "game-downloads-section" },
        { key: "gallery", label: "Gallery", element: sections.gallery, id: "game-screenshots-section" },
        { key: "related", label: "Related", element: sections.related, id: "game-related-section" }
    ];

    let count = 0;
    entries.forEach(entry => {
        if (!entry.element || entry.element.hidden) return;
        ensureSectionId(entry.element, entry.id);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "game-toc__btn";
        btn.textContent = entry.label;
        btn.setAttribute("aria-label", `Jump to ${entry.label}`);
        btn.addEventListener("click", () => smoothScrollTo(entry.element));
        toc.appendChild(btn);
        count += 1;
    });

    toc.hidden = count === 0;
}

function initSingleGameUX(state) {
    initScrollProgress();
    initBackToTop();
    initScreenshotModalEnhancements();
    initQuickActions(state);
}

function initScrollProgress() {
    if (CCG_SCROLL_PROGRESS_READY) return;
    const progress = document.querySelector("[data-ccg-scroll-progress] span");
    if (!progress) return;
    CCG_SCROLL_PROGRESS_READY = true;

    const update = () => {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = docHeight > 0 ? window.scrollY / docHeight : 0;
        progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
    };

    let ticking = false;
    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            update();
            ticking = false;
        });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
}

function initBackToTop() {
    if (CCG_BACK_TO_TOP_READY) return;
    const button = document.querySelector("[data-ccg-back-to-top]");
    const wrap = document.querySelector("[data-ccg-back-to-top-wrap]");
    if (!button && !wrap) return;
    CCG_BACK_TO_TOP_READY = true;

    if (wrap) {
        wrap.hidden = false;
    } else if (button) {
        button.hidden = false;
    }

    button?.addEventListener("click", () => {
        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    });

    const updateVisibility = () => {
        const scrollBottom = window.scrollY + window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;
        const show = scrollBottom >= docHeight - 80;
        if (wrap) {
            wrap.classList.toggle("is-visible", show);
        } else if (button) {
            button.classList.toggle("is-visible", show);
        }
    };

    let ticking = false;
    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            updateVisibility();
            ticking = false;
        });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateVisibility();
}

function initQuickActions(state) {
    const quickActions = document.querySelector("[data-game-quick-actions]");
    if (!quickActions) return;

    const actionState = {
        video: !!state?.hasVideo,
        share: true,
        subscribe: true,
        support: true
    };

    quickActions.querySelectorAll("button[data-action]").forEach(btn => {
        const key = btn.dataset.action;
        const enabled = !!actionState[key];
        btn.disabled = !enabled;
        btn.classList.toggle("is-disabled", !enabled);
    });

    const hasAny = Object.values(actionState).some(Boolean);
    quickActions.dataset.available = hasAny ? "true" : "false";

    if (!CCG_QUICK_ACTIONS_READY) {
        quickActions.addEventListener("click", e => {
            const target = e.target.closest("button[data-action]");
            if (!target || target.disabled) return;
            const action = target.dataset.action;
            handleQuickAction(action);
        });
        CCG_QUICK_ACTIONS_READY = true;
    }

    const hero = document.querySelector(".game-hero");
    if (hero) {
        setupQuickActionsObserver(hero, quickActions);
    }

    setupQuickActionsFooterGuard(quickActions);
}

function setupQuickActionsObserver(hero, quickActions) {
    if (!hero || !quickActions) return;
    const shouldShow = () => quickActions.dataset.available === "true";

    if ("IntersectionObserver" in window) {
        if (quickActions.dataset.observed === "true") return;
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!shouldShow()) {
                    quickActions.hidden = true;
                    return;
                }
                quickActions.hidden = entry.isIntersecting;
            });
        }, { rootMargin: "0px 0px -20% 0px", threshold: 0.1 });
        observer.observe(hero);
        quickActions.dataset.observed = "true";
    } else {
        const onScroll = () => {
            if (!shouldShow()) {
                quickActions.hidden = true;
                return;
            }
            const heroBottom = hero.getBoundingClientRect().bottom;
            quickActions.hidden = heroBottom > 0;
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    }
}

function setupQuickActionsFooterGuard(quickActions) {
    if (!quickActions || quickActions.dataset.footerGuard === "true") return;
    const footer = document.querySelector(".ccg-footer");
    if (!footer) return;

    let ticking = false;
    const updateLift = () => {
        const footerRect = footer.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const overlap = viewportHeight - footerRect.top;
        const lift = overlap > 0 ? overlap + 12 : 0;
        quickActions.style.setProperty("--ccg-quick-actions-lift", `${lift}px`);
    };

    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            updateLift();
            ticking = false;
        });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateLift();
    quickActions.dataset.footerGuard = "true";
}

function handleQuickAction(action) {
    const videoSection = document.getElementById("game-video-section");
    const screenshotsSection = document.querySelector(".game-screenshots");
    const relatedSection = document.querySelector(".game-section--related");
    const ratingSection = document.getElementById("gameHeroRating");
    const shareBtn = document.querySelector("[data-ccg-share-btn]");
    const subscribeUrl = "https://www.youtube.com/@CheekyCommodoreGamer";
    const supportUrl = "https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL";

    switch (action) {
        case "video":
            smoothScrollTo(videoSection);
            break;
        case "share":
            if (shareBtn) {
                shareBtn.click();
            } else {
                smoothScrollTo(document.querySelector(".ccg-share"));
            }
            break;
        case "subscribe":
            window.open(subscribeUrl, "_blank", "noopener");
            break;
        case "support":
            window.open(supportUrl, "_blank", "noopener");
            break;
        default:
            smoothScrollTo(screenshotsSection || relatedSection || ratingSection);
            break;
    }
}

function initScreenshotModalEnhancements() {
    const modal = document.getElementById("ccgModal");
    if (!modal || modal.dataset.enhanced === "true") return;

    modal.addEventListener("touchstart", e => {
        if (!modal.classList.contains("open")) return;
        if (!e.touches || !e.touches.length) return;
        const touch = e.touches[0];
        CCG_MODAL_TOUCH_START = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });

    modal.addEventListener("touchend", e => {
        if (!modal.classList.contains("open")) return;
        if (!CCG_MODAL_TOUCH_START || !e.changedTouches || !e.changedTouches.length) return;
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - CCG_MODAL_TOUCH_START.x;
        const deltaY = touch.clientY - CCG_MODAL_TOUCH_START.y;
        CCG_MODAL_TOUCH_START = null;
        if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;
        if (deltaX > 0) {
            showPrevScreenshot();
        } else {
            showNextScreenshot();
        }
    }, { passive: true });

    modal.dataset.enhanced = "true";
}

/* ============================================================
   META
============================================================ */

function resolveSeoPublisher(game) {
    const publisher = resolveCreditValue(game, "publisher");
    if (publisher) return publisher;

    const developer = resolveCreditValue(game, "developer") || String(game?.developer || "").trim();
    return developer;
}

function buildSeoDescription(game, fallbackTitle) {
    const baseTitle = fallbackTitle || "This game";
    const year = String(game?.year || "").trim();
    const publisher = resolveSeoPublisher(game);

    const introParts = [];
    if (year) introParts.push(`${baseTitle} (${year})`);
    else introParts.push(baseTitle);
    if (publisher) introParts.push(`from ${publisher}`);

    const strippedDescription = String(game?.description || "")
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const hook = strippedDescription
        ? strippedDescription.slice(0, 95)
        : "retro gameplay, screenshots, reviews and Commodore history.";

    const description = `${introParts.join(" ")} — ${hook}`;
    return description.slice(0, 160);
}

function updateMeta(game) {
    const gameTitle = resolveCanonicalGameTitle(game);
    const platform = String(game?.system || "Commodore 64").trim();
    const title = `${gameTitle} – ${platform} | Review, Screens & History`;
    document.title = title;

    const desc = buildSeoDescription(game, gameTitle);

    const metaDesc = document.querySelector("meta[name='description']");
    if (metaDesc) metaDesc.setAttribute("content", desc);

    const canonicalPath = resolvePrettyGameUrl(game);
    const canonicalUrl = canonicalPath
        ? new URL(canonicalPath, "https://www.cheekycommodoregamer.co.uk").toString()
        : "https://www.cheekycommodoregamer.co.uk/games/";

    const imagePath = String(game?.thumbnail || "").trim();
    const imageUrl = imagePath
        ? new URL(imagePath.replace(/^\/+/, ""), "https://www.cheekycommodoregamer.co.uk/").toString()
        : "";

    const canonicalLink = document.getElementById("game-canonical");
    if (canonicalLink) canonicalLink.setAttribute("href", canonicalUrl);

    const ogTitle = document.getElementById("game-og-title");
    if (ogTitle) ogTitle.setAttribute("content", title);

    const ogDesc = document.getElementById("game-og-description");
    if (ogDesc) ogDesc.setAttribute("content", desc);

    const ogUrl = document.getElementById("game-og-url");
    if (ogUrl) ogUrl.setAttribute("content", canonicalUrl);

    const ogImage = document.getElementById("game-og-image");
    if (ogImage && imageUrl) ogImage.setAttribute("content", imageUrl);

    const twitterTitle = document.getElementById("game-twitter-title");
    if (twitterTitle) twitterTitle.setAttribute("content", title);

    const twitterDesc = document.getElementById("game-twitter-description");
    if (twitterDesc) twitterDesc.setAttribute("content", desc);

    const twitterImage = document.getElementById("game-twitter-image");
    if (twitterImage && imageUrl) twitterImage.setAttribute("content", imageUrl);

    const jsonLd = document.getElementById("game-jsonld");
    if (jsonLd) {
        const publisher = resolveSeoPublisher(game);
        const schema = {
            "@context": "https://schema.org",
            "@type": "VideoGame",
            "name": gameTitle,
            "url": canonicalUrl,
            "description": desc,
            "author": {
                "@type": "Organization",
                "name": "Cheeky Commodore Gamer"
            }
        };

        if (game.year) schema.datePublished = String(game.year);
        if (platform) schema.gamePlatform = platform;
        if (publisher) schema.publisher = { "@type": "Organization", "name": publisher };
        if (imageUrl) schema.image = imageUrl;

        jsonLd.textContent = JSON.stringify(schema);
    }
}

function normaliseTokenValue(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function normaliseTokenList(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.map(item => normaliseTokenValue(item)).filter(Boolean);
    }
    return String(value || "")
        .split(",")
        .map(item => normaliseTokenValue(item))
        .filter(Boolean);
}

function resolvePublisherCandidates(game) {
    const credits = (game?.credits && typeof game.credits === "object") ? game.credits : null;
    const candidates = [
        credits?.publisher,
        game?.publisher
    ];

    const combined = candidates.reduce((acc, value) => {
        normaliseTokenList(value).forEach(item => acc.add(item));
        return acc;
    }, new Set());

    return Array.from(combined);
}

function resolveDeveloperCandidates(game) {
    const credits = (game?.credits && typeof game.credits === "object") ? game.credits : null;
    const candidates = [
        credits?.developer,
        game?.developer
    ];

    const combined = candidates.reduce((acc, value) => {
        normaliseTokenList(value).forEach(item => acc.add(item));
        return acc;
    }, new Set());

    return Array.from(combined);
}

function resolveCollectionCandidates(game) {
    return resolveCollections(game).map(item => normaliseTokenValue(item)).filter(Boolean);
}

function resolveGenreCandidates(game) {
    return resolveGenres(game).map(item => normaliseTokenValue(item)).filter(Boolean);
}

function hasTokenMatch(source, target) {
    if (!source.length || !target.length) return false;
    const targetSet = new Set(target);
    return source.some(value => targetSet.has(value));
}

function resolvePrimaryGenre(game) {
    const genres = resolveGenres(game)
        .map(genre => String(genre || "").trim())
        .filter(Boolean);
    if (!genres.length) return "";
    const primary = genres.find(genre => genre.toLowerCase() !== "top picks") || genres[0];
    return String(primary || "").trim().toLowerCase();
}

function resolveYearValue(game) {
    const year = Number(String(game?.year || "").trim());
    return Number.isFinite(year) ? year : null;
}

function resolveRatingValue(game) {
    const ratingData = typeof window.ccgResolveRatingValue === "function"
        ? window.ccgResolveRatingValue(game?.ccg_rating)
        : { value: Number(game?.ccg_rating), isRated: Number.isFinite(Number(game?.ccg_rating)) };
    return ratingData?.isRated ? ratingData.value : null;
}

function compareCandidatesByScore(a, b) {
    const scoreDiff = getPopularityScore(b) - getPopularityScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    const titleA = String(a?.title || "").toLowerCase();
    const titleB = String(b?.title || "").toLowerCase();
    return titleA.localeCompare(titleB);
}

function getPopularityScore(game) {
    const rating = resolveRatingValue(game);
    const year = resolveYearValue(game);
    const topPickBoost = hasTopPickGenre(game) ? 1 : 0;
    return (topPickBoost * 1000) + (rating ?? 0) * 10 + (year ?? 0) / 10;
}

function buildSuggestedGames(game, limit = 10) {
    const candidates = [];
    const seen = new Set();

    CCG_SINGLE_ALL_GAMES.forEach((candidate) => {
        if (!candidate || candidate.id === game?.id) return;
        if (seen.has(candidate.id)) return;
        seen.add(candidate.id);
        candidates.push(candidate);
    });

    const primaryGenre = resolvePrimaryGenre(game);
    const currentYear = resolveYearValue(game);
    const currentRating = resolveRatingValue(game);

    const suggestions = [];
    const used = new Set();

    const addMatches = (filter) => {
        if (suggestions.length >= limit) return;
        candidates
            .filter(filter)
            .sort(compareCandidatesByScore)
            .forEach((candidate) => {
                if (suggestions.length >= limit) return;
                if (used.has(candidate.id)) return;
                used.add(candidate.id);
                suggestions.push(candidate);
            });
    };

    if (primaryGenre) {
        addMatches(candidate => resolvePrimaryGenre(candidate) === primaryGenre);
    }

    if (currentYear !== null) {
        addMatches((candidate) => {
            const year = resolveYearValue(candidate);
            return year !== null && Math.abs(year - currentYear) <= 3;
        });
    }

    if (currentRating !== null) {
        addMatches((candidate) => {
            const rating = resolveRatingValue(candidate);
            return rating !== null && Math.abs(rating - currentRating) <= 1;
        });
    }

    addMatches(() => true);

    return suggestions.slice(0, limit);
}

/* ============================================================
   RELATED GAMES (SG-E5)
============================================================ */

function buildRelatedMatches(game, limit = 12) {
    const candidates = CCG_SINGLE_ALL_GAMES.filter(candidate => candidate && candidate.id !== game?.id);
    const used = new Set();
    const matches = [];

    const currentPublisher = normaliseTokenValue(resolveCreditValue(game, "publisher"));
    const currentGenre = resolvePrimaryGenre(game);

    const addGroup = (reason, filter) => {
        if (matches.length >= limit) return;
        candidates
            .filter(candidate => !used.has(candidate.id) && filter(candidate))
            .sort(compareCandidatesByScore)
            .forEach(candidate => {
                if (matches.length >= limit) return;
                used.add(candidate.id);
                matches.push({
                    game: candidate,
                    reason
                });
            });
    };

    if (currentPublisher) {
        addGroup("publisher", candidate => normaliseTokenValue(resolveCreditValue(candidate, "publisher")) === currentPublisher);
    }

    if (matches.length < limit && currentGenre) {
        addGroup("genre", candidate => resolvePrimaryGenre(candidate) === currentGenre);
    }

    return {
        items: matches.slice(0, limit),
        publisher: resolveCreditValue(game, "publisher"),
        genre: resolvePrimaryGenre(game)
    };
}

function resolveRelatedCopy(game, result) {
    const publisher = resolveCreditValue(game, "publisher");
    const genreLabel = result.genre
        ? result.genre.replace(/\b\w/g, char => char.toUpperCase())
        : "";
    const hasGenreMatches = Array.isArray(result?.items)
        && result.items.some(item => item?.reason === "genre");
    const genreQualifier = hasGenreMatches && genreLabel
        ? ` — or other ${genreLabel} titles`
        : "";

    return {
        kicker: "RELATED BY PUBLISHER + GENRE",
        title: publisher
            ? `More from ${publisher} & Similar Titles${genreQualifier}`
            : `More from this Publisher & Similar Titles${genreQualifier}`
    };
}

function renderRelatedCardMeta(relGame, reason, currentPublisher) {
    const meta = document.createElement("div");
    meta.className = "related-card__meta";

    const genre = resolvePrimaryGenre(relGame);
    if (genre) {
        const genreTag = document.createElement("span");
        genreTag.className = "related-card__tag";
        genreTag.textContent = genre.replace(/\b\w/g, char => char.toUpperCase());
        meta.appendChild(genreTag);
    }

    const platform = String(relGame?.system || "C64").trim();
    const year = resolveYearValue(relGame);
    if (platform || year) {
        const platformTag = document.createElement("span");
        platformTag.className = "related-card__tag";
        platformTag.textContent = [platform, year].filter(Boolean).join(" • ");
        meta.appendChild(platformTag);
    }

    const publisher = resolveCreditValue(relGame, "publisher");
    if (publisher && normaliseTokenValue(publisher) === normaliseTokenValue(currentPublisher)) {
        const publisherTag = document.createElement("span");
        publisherTag.className = "related-card__tag";
        publisherTag.textContent = publisher;
        meta.appendChild(publisherTag);
    }

    const reasonTag = document.createElement("span");
    reasonTag.className = "related-card__tag related-card__tag--reason";
    reasonTag.textContent = reason === "publisher" ? "Same Publisher" : "Same Genre";
    reasonTag.title = reason === "publisher"
        ? "Matched by exact publisher"
        : "Matched by genre fallback";
    meta.appendChild(reasonTag);

    return meta;
}

function resolveRelatedStep(scrollEl) {
    const firstCard = scrollEl.querySelector(".related-card");
    if (!firstCard) return Math.max(220, scrollEl.clientWidth * 0.8);
    const styles = window.getComputedStyle(scrollEl);
    const gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;
    return Math.round(firstCard.getBoundingClientRect().width + gap);
}

function alignScrollToCard(scrollEl, direction) {
    const step = resolveRelatedStep(scrollEl);
    const maxScroll = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
    const next = Math.max(0, Math.min(maxScroll, Math.round((scrollEl.scrollLeft + (direction * step)) / step) * step));
    scrollEl.scrollTo({ left: next, behavior: "smooth" });
}

function getRelatedCarouselParts() {
    const track = document.getElementById("relatedGamesTrack");
    const carousel = track ? track.closest(".related-carousel") : null;
    const prevBtn = carousel ? carousel.querySelector(".related-carousel__nav--prev") : null;
    const nextBtn = carousel ? carousel.querySelector(".related-carousel__nav--next") : null;
    const viewport = carousel ? carousel.querySelector(".related-carousel__viewport") : null;
    return { track, carousel, prevBtn, nextBtn, viewport };
}

function updateRelatedButtons(scrollEl, prevBtn, nextBtn) {
    const maxScroll = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
    const atStart = scrollEl.scrollLeft <= 2;
    const atEnd = scrollEl.scrollLeft >= maxScroll - 2;

    prevBtn.disabled = atStart;
    nextBtn.disabled = atEnd;
    prevBtn.setAttribute("aria-disabled", String(atStart));
    nextBtn.setAttribute("aria-disabled", String(atEnd));
}

function bindRelatedCarousel() {
    const { track, prevBtn, nextBtn, viewport } = getRelatedCarouselParts();
    const scrollEl = viewport || track;
    if (!track || !scrollEl || !prevBtn || !nextBtn) return;
    if (track.dataset.carouselBound === "true") return;
    track.dataset.carouselBound = "true";

    const refresh = () => requestAnimationFrame(() => updateRelatedButtons(scrollEl, prevBtn, nextBtn));

    prevBtn.addEventListener("click", event => {
        event.preventDefault();
        alignScrollToCard(scrollEl, -1);
    });

    nextBtn.addEventListener("click", event => {
        event.preventDefault();
        alignScrollToCard(scrollEl, 1);
    });

    [prevBtn, nextBtn].forEach(button => {
        button.addEventListener("touchstart", event => {
            event.stopPropagation();
        }, { passive: true });
        button.addEventListener("dragstart", event => event.preventDefault());
    });

    scrollEl.addEventListener("scroll", refresh, { passive: true });
    window.addEventListener("resize", refresh);
}

function observeRelatedSection(section) {
    if (!section) return;
    if (!("IntersectionObserver" in window)) {
        initRelatedCarousel();
        return;
    }

    if (!CCG_RELATED_OBSERVER) {
        CCG_RELATED_OBSERVER = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                initRelatedCarousel();
                CCG_RELATED_OBSERVER.unobserve(entry.target);
            });
        }, { threshold: 0.2 });
    }

    CCG_RELATED_OBSERVER.observe(section);
}

function renderRelatedGames(game) {
    const container = document.getElementById("relatedGamesTrack");
    const section = document.querySelector(".game-section--related");
    const kicker = document.getElementById("relatedGamesKicker");
    const titleEl = document.getElementById("relatedGamesTitle");

    if (!container || !section) return;
    if (container.dataset.relatedFor === String(game?.id || "")) return;

    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const desiredCount = isDesktop ? 10 : 12;
    const result = buildRelatedMatches(game, desiredCount);
    const items = result.items;

    if (!items.length) {
        section.hidden = true;
        container.innerHTML = "";
        return;
    }

    container.innerHTML = "";

    const copy = resolveRelatedCopy(game, result);
    if (kicker) kicker.textContent = copy.kicker;
    if (titleEl) titleEl.textContent = copy.title;

    items.forEach(item => {
        const rel = item.game;
        const card = document.createElement("a");
        card.className = "related-card";
        card.href = resolvePrettyGameUrl(rel);
        card.setAttribute("aria-label", `View ${rel.title || "game"}`);

        const img = document.createElement("img");
        img.src = resolveGameThumb(rel.thumbnail || rel.thumb || rel.cover);
        img.alt = rel.title || "Game";
        img.loading = "lazy";
        img.decoding = "async";

        const title = document.createElement("span");
        title.className = "related-card__title";
        title.textContent = rel.title || "Unknown";

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(renderRelatedCardMeta(rel, item.reason, result.publisher));
        container.appendChild(card);
    });

    container.dataset.relatedFor = String(game?.id || "");
    section.hidden = false;
    bindRelatedCarousel();
    initRelatedCarousel();
    observeRelatedSection(section);
}

function initRelatedCarousel() {
    const { track, prevBtn, nextBtn, viewport } = getRelatedCarouselParts();
    const scrollEl = viewport || track;

    if (!track || !scrollEl || !prevBtn || !nextBtn) return;
    scrollEl.style.overflowX = "auto";
    scrollEl.style.overflowY = "hidden";
    scrollEl.style.scrollBehavior = "smooth";
    scrollEl.style.touchAction = "pan-x";
    scrollEl.style.webkitOverflowScrolling = "touch";

    const refreshButtons = () => requestAnimationFrame(() => updateRelatedButtons(scrollEl, prevBtn, nextBtn));

    track.querySelectorAll("img").forEach(img => {
        if (img.complete) return;
        img.addEventListener("load", refreshButtons, { once: true });
        img.addEventListener("error", refreshButtons, { once: true });
    });

    updateRelatedButtons(scrollEl, prevBtn, nextBtn);
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

    CCG_SCREENSHOT_INDEX = index;
    frame.src = src;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    attachModalKeyboardControls();
    updateModalCounter();
}

function closeScreenshotModal() {
    const modal = document.getElementById("ccgModal");
    const frame = document.getElementById("ccgModalFrame");
    const counter = document.querySelector("[data-ccg-modal-counter]");

    if (!modal || !frame) return;

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    frame.src = "";
    if (counter) counter.hidden = true;
    detachModalKeyboardControls();
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

function updateModalCounter() {
    const counter = document.querySelector("[data-ccg-modal-counter]");
    if (!counter || !CCG_SCREENSHOTS.length) return;
    counter.textContent = `${CCG_SCREENSHOT_INDEX + 1} / ${CCG_SCREENSHOTS.length}`;
    counter.hidden = false;
}

function attachModalKeyboardControls() {
    if (CCG_MODAL_KEY_HANDLER) return;
    CCG_MODAL_KEY_HANDLER = (event) => {
        // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
        // Prevents quiz/hotkey logic from blocking form typing
        const tag = event.target?.tagName?.toLowerCase();
        const isEditable = tag === "input" || tag === "textarea" || event.target?.isContentEditable === true;
        if (isEditable) return;

        if (event.key === "Escape") {
            closeScreenshotModal();
            return;
        }
        if (event.key === "ArrowRight") {
            showNextScreenshot();
        }
        if (event.key === "ArrowLeft") {
            showPrevScreenshot();
        }
    };
    document.addEventListener("keydown", CCG_MODAL_KEY_HANDLER);
}

function detachModalKeyboardControls() {
    if (!CCG_MODAL_KEY_HANDLER) return;
    document.removeEventListener("keydown", CCG_MODAL_KEY_HANDLER);
    CCG_MODAL_KEY_HANDLER = null;
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
        section.hidden = false;
        section.style.display = "block";
        const idEl = document.getElementById("notFoundId");
        if (idEl) {
            const fallback = slug || gameId || "Unknown";
            idEl.textContent = fallback;
        }
    } else {
        console.warn("[CCG SINGLE] Game not found panel is missing.");
    }
}

/* ============================================================
   EVENT LISTENERS
============================================================ */

document.querySelector("#ccgModal .ccg-modal-close")
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
