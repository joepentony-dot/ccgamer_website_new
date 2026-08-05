/* ============================================================
   CCG ZZAP!64 TITLE MATCHER
   ------------------------------------------------------------
   Shared, conservative matching for the Zzap!64 awards archive
   and individual game pages. It favours exact title/system
   matches and only uses fuzzy matching when one result is
   substantially stronger than every alternative.
============================================================ */

(function (root, factory) {
    "use strict";

    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.CCGZzap64Matcher = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const TITLE_ALIAS_GROUPS = [
        ["super pipeline", "super pipeline ii", "super pipeline 2"],
        ["gremlins", "gremlins the adventure"],
        ["rockfords riot", "boulder dash ii rockfords revenge", "boulder dash 2 rockfords revenge"],
        ["spy vs spy ii", "spy vs spy ii the island caper", "spy vs spy 2 the island caper"],
        ["graphic adventure creator", "gac"],
        ["shoot em up construction kit", "seuck"],
        ["international karate plus", "international karate +", "ik+", "ik plus"],
        ["federation of free traders", "foft"],
        ["the duel test drive ii", "test drive ii the duel", "test drive 2 the duel", "the duel"],
        ["cybernoid ii", "cybernoid ii the revenge", "cybernoid 2 the revenge"],
        ["last ninja 2", "last ninja ii"],
        ["impossible mission 2", "impossible mission ii"],
        ["summer games 2", "summer games ii"],
        ["pitstop 2", "pitstop ii"],
        ["beach head 2", "beach head ii"],
        ["who dares wins 2", "who dares wins ii"],
        ["f 16 combat pilot", "f16 combat pilot"],
        ["b 24 flight simulator", "b24 flight simulator"],
        ["r i s k", "risk"],
        ["a p b", "apb"],
        ["r type", "rtype"],
        ["pac mania", "pacmania"],
        ["led storm", "l e d storm"],
        ["m u l e", "mule"],
        ["ghosts n goblins", "ghosts and goblins", "ghosts 'n goblins"],
        ["north and south", "north south"],
        ["return of the mutant camels", "revenge of the mutant camels ii", "revenge of the mutant camels 2"],
        ["barbarian 2 the dungeon of drax", "barbarian ii the dungeon of drax"],
        ["cauldron 2 the pumpkin strikes back", "cauldron ii the pumpkin strikes back"],
        ["dan dare 2 mekons revenge", "dan dare ii mekons revenge", "dan dare ii mekons revenge"],
        ["double dragon 2 the revenge", "double dragon ii the revenge"],
        ["dragons lair 2 escape from singes castle", "dragons lair ii escape from singes castle"],
        ["fist 2 the legend continues", "fist ii the legend continues"],
        ["jack the nipper 2 in coconut capers", "jack the nipper ii in coconut capers"],
        ["ultima 4", "ultima iv", "ultima iv quest of the avatar"],
        ["bard's tale", "the bard's tale", "bards tale"],
        ["bard's tale 2", "the bard's tale ii", "bards tale ii", "bards tale 2"],
        ["new zealand story", "the new zealand story"],
        ["sentinel", "the sentinel"],
        ["last ninja", "the last ninja"],
        ["last ninja 2", "the last ninja 2", "the last ninja ii"],
        ["way of the exploding fist", "the way of the exploding fist"],
        ["arc of yesod", "the arc of yesod"],
        ["faery tale adventure", "the faery tale adventure"],
        ["pawn", "the pawn"],
        ["guild of thieves", "the guild of thieves"],
        ["fish", "fish!"],
        ["xenon 2", "xenon ii", "xenon 2 megablast"],
        ["speedball 2", "speedball ii", "speedball 2 brutal deluxe"],
        ["kick off 2", "kick off ii"],
        ["lotus esprit turbo challenge 2", "lotus esprit turbo challenge ii", "lotus 2"],
        ["lemmings 2", "lemmings ii", "lemmings 2 the tribes"],
        ["eye of the beholder 2", "eye of the beholder ii", "eye of the beholder ii the legend of darkmoon"],
        ["dune 2", "dune ii", "dune ii the battle for arrakis"],
        ["monkey island 2", "monkey island ii", "monkey island 2 lechucks revenge"],
        ["indiana jones and the last crusade adventure", "indiana jones and the last crusade the graphic adventure"],
        ["batman the movie", "batman the movie game"],
        ["aliens the computer game", "aliens"],
        ["chase h q", "chase hq"],
        ["operation wolf", "op wolf"],
        ["rainbow islands", "rainbow islands the story of bubble bobble 2"],
        ["bubble bobble", "bubble bobble featuring bubl and bobl"],
        ["nebulus", "tower toppler"],
        ["wizball", "wiz ball"],
        ["head over heels", "head over heels 2"],
        ["paradroid", "paradroid 90"],
        ["uridium", "uridium plus"],
        ["arkanoid revenge of doh", "arkanoid 2 revenge of doh", "arkanoid ii revenge of doh"],
        ["boulderdash", "boulder dash"],
        ["boulderdash 2", "boulder dash ii", "boulder dash 2"],
        ["boulderdash construction kit", "boulder dash construction kit"],
        ["football manager 2", "football manager ii"],
        ["international soccer", "international football"],
        ["microprose soccer", "microprose international soccer"],
        ["world class leaderboard", "world class leader board"],
        ["leaderboard", "leader board"],
        ["computer scrabble deluxe", "scrabble deluxe"],
        ["karateka", "karate ka"],
        ["little computer people", "little computer people discovery kit"],
        ["lords of midnight", "the lords of midnight"],
        ["doomdark's revenge", "doomdarks revenge"],
        ["mercenary", "mercenary escape from targ"],
        ["elite", "elite plus"],
        ["raid over moscow", "raid over moscow!"],
        ["bruce lee", "bruce lee returns"],
        ["thing on a spring", "thing on a spring!"],
        ["zorro", "zorro the game"],
        ["koronis rift", "koronis rift!"],
        ["theatre europe", "theatre europe!"],
        ["samurai warrior", "samurai warrior the battles of usagi yojimbo"],
        ["hunter's moon", "hunters moon"],
        ["hawkeye", "hawk eye"],
        ["power at sea", "power at sea!"],
        ["infiltrator 2", "infiltrator ii"],
        ["street sports basketball", "street sports basketball!"],
        ["california games", "california games!"],
        ["defender of the crown", "defender of the crown!"],
        ["rocket ranger", "rocket ranger!"],
        ["north and south", "north & south"],
        ["joan of arc", "joan of arc siege and the sword"],
        ["total eclipse", "total eclipse!"],
        ["ingrids back", "ingrid's back"],
        ["stunt car racer", "stunt car racer!"],
        ["battle chess", "battlechess"],
        ["sim city", "simcity"],
        ["populous", "populous!"],
        ["midwinter", "mid winter"],
        ["shadow of the beast", "shadow of the beast!"],
        ["x out", "x-out"],
        ["turrican 2", "turrican ii"],
        ["rick dangerous 2", "rick dangerous ii"],
        ["gods", "gods!"],
        ["another world", "out of this world"],
        ["flashback", "flashback the quest for identity"],
        ["cannon fodder", "cannon fodder!"],
        ["sensible soccer", "sensible world of soccer"],
        ["championship manager", "championship manager 93", "championship manager 93 94"],
        ["frontier elite 2", "frontier elite ii", "frontier elite 2"],
        ["civilization", "sid meiers civilization"],
        ["pirates", "sid meiers pirates"],
        ["railroad tycoon", "sid meiers railroad tycoon"]
    ];

    const ROMAN_WORDS = new Map([
        ["ii", "2"],
        ["iii", "3"],
        ["iv", "4"],
        ["v", "5"]
    ]);

    function normalizeText(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[’‘`]/g, "'")
            .replace(/&/g, " and ")
            .replace(/\+/g, " plus ")
            .replace(/\bpart\s+/g, " ")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function withoutArticle(value) {
        return String(value || "").replace(/^(the|a|an)\s+/, "");
    }

    function withArabicNumerals(value) {
        return String(value || "")
            .split(" ")
            .map((word) => ROMAN_WORDS.get(word) || word)
            .join(" ");
    }

    const aliasMap = (() => {
        const map = new Map();
        TITLE_ALIAS_GROUPS.forEach((group) => {
            const canonical = withArabicNumerals(withoutArticle(normalizeText(group[0])));
            group.forEach((title) => {
                const normalized = normalizeText(title);
                map.set(normalized, canonical);
                map.set(withoutArticle(normalized), canonical);
                map.set(withArabicNumerals(withoutArticle(normalized)), canonical);
            });
        });
        return map;
    })();

    function canonicalTitle(value) {
        const normalized = normalizeText(value);
        const noArticle = withoutArticle(normalized);
        const numbered = withArabicNumerals(noArticle);
        return aliasMap.get(normalized)
            || aliasMap.get(noArticle)
            || aliasMap.get(numbered)
            || numbered;
    }

    function systemKey(value) {
        const normalized = normalizeText(value);
        if (normalized.includes("amiga")) return "amiga";
        if (normalized === "c64" || normalized.includes("commodore 64")) return "c64";
        return normalized;
    }

    function compact(value) {
        return canonicalTitle(value).replace(/\s+/g, "");
    }

    function titleVariants(value) {
        const raw = String(value || "").trim();
        if (!raw) return [];

        const normalized = normalizeText(raw);
        const canonical = canonicalTitle(raw);
        const variants = new Set([
            canonical,
            withoutArticle(normalized),
            withArabicNumerals(withoutArticle(normalized)),
            compact(raw)
        ]);

        const colonParts = normalized.split(/\s+(?:the|a|an)\s+/);
        if (colonParts[0] && colonParts[0].length >= 5) variants.add(canonicalTitle(colonParts[0]));

        const words = canonical.split(" ");
        if (words.length >= 4) {
            const prefix = words.slice(0, Math.max(2, words.length - 2)).join(" ");
            if (prefix.length >= 8) variants.add(prefix);
        }

        return Array.from(variants).filter(Boolean);
    }

    function gameCandidates(game) {
        return [game?.title, game?.sorttitle, game?.name, game?.slug, game?.id]
            .filter(Boolean)
            .flatMap(titleVariants);
    }

    function buildGameIndex(games) {
        const byTitle = new Map();
        const list = Array.isArray(games) ? games : [];

        list.forEach((game) => {
            gameCandidates(game).forEach((key) => {
                const bucket = byTitle.get(key) || [];
                if (!bucket.includes(game)) bucket.push(game);
                byTitle.set(key, bucket);
            });
        });

        return { games: list, byTitle };
    }

    function tokenSet(value) {
        return new Set(canonicalTitle(value).split(" ").filter(Boolean));
    }

    function tokenScore(left, right) {
        const a = tokenSet(left);
        const b = tokenSet(right);
        if (!a.size || !b.size) return 0;
        let shared = 0;
        a.forEach((token) => { if (b.has(token)) shared += 1; });
        return shared / Math.max(a.size, b.size);
    }

    function levenshtein(left, right) {
        const a = compact(left);
        const b = compact(right);
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;

        const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
        for (let i = 1; i <= a.length; i += 1) {
            const current = [i];
            for (let j = 1; j <= b.length; j += 1) {
                current[j] = Math.min(
                    current[j - 1] + 1,
                    previous[j] + 1,
                    previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
                );
            }
            previous.splice(0, previous.length, ...current);
        }
        return previous[b.length];
    }

    function similarity(left, right) {
        const a = compact(left);
        const b = compact(right);
        const longest = Math.max(a.length, b.length);
        return longest ? 1 - (levenshtein(a, b) / longest) : 1;
    }

    function scoreGame(entry, game) {
        const requested = canonicalTitle(entry?.title);
        const requestedCompact = compact(requested);
        const requestedSystem = systemKey(entry?.system);
        const candidateSystem = systemKey(game?.system || game?.platform);
        const systemBonus = requestedSystem && candidateSystem === requestedSystem ? 24 : 0;
        const systemPenalty = requestedSystem && candidateSystem && candidateSystem !== requestedSystem ? -55 : 0;
        let best = -Infinity;

        gameCandidates(game).forEach((candidate) => {
            const candidateCanonical = canonicalTitle(candidate);
            const candidateCompact = compact(candidateCanonical);
            let score = 0;

            if (requested === candidateCanonical) score = 120;
            else if (requestedCompact === candidateCompact) score = 116;
            else if (
                requested.length >= 8
                && candidateCanonical.length >= 8
                && (requested.includes(candidateCanonical) || candidateCanonical.includes(requested))
            ) score = 94;
            else {
                const tokens = tokenScore(requested, candidateCanonical);
                const edit = similarity(requested, candidateCanonical);
                score = Math.round(tokens * 66 + edit * 34);
            }

            best = Math.max(best, score + systemBonus + systemPenalty);
        });

        return best;
    }

    function findGame(entry, indexOrGames) {
        const index = indexOrGames?.byTitle
            ? indexOrGames
            : buildGameIndex(indexOrGames);
        const requestedSystem = systemKey(entry?.system);
        const exactCandidates = new Set();

        titleVariants(entry?.title).forEach((key) => {
            (index.byTitle.get(key) || []).forEach((game) => exactCandidates.add(game));
        });

        if (exactCandidates.size) {
            const exactList = Array.from(exactCandidates);
            const systemMatch = exactList.find((game) => (
                systemKey(game?.system || game?.platform) === requestedSystem
            ));
            if (systemMatch) return systemMatch;
            if (exactList.length === 1) return exactList[0];
        }

        const ranked = index.games
            .map((game) => ({ game, score: scoreGame(entry, game) }))
            .filter((item) => item.score >= 92)
            .sort((a, b) => b.score - a.score || String(a.game?.title || "").localeCompare(String(b.game?.title || ""), "en-GB"));

        if (!ranked.length) return null;
        if (ranked[0].score < 108 && ranked[1] && ranked[0].score - ranked[1].score < 7) return null;
        return ranked[0].game;
    }

    function gameHref(game) {
        const value = String(game?.slug || game?.id || "").trim().replace(/^\/+|\/+$/g, "");
        return value ? `/games/${encodeURIComponent(value)}/` : "";
    }

    function sameGame(left, right) {
        if (!left || !right) return false;
        const leftSlug = String(left.slug || left.id || "").trim().toLowerCase();
        const rightSlug = String(right.slug || right.id || "").trim().toLowerCase();
        if (leftSlug && rightSlug && leftSlug === rightSlug) return true;
        return canonicalTitle(left.title || left.sorttitle || left.name) === canonicalTitle(right.title || right.sorttitle || right.name)
            && systemKey(left.system || left.platform) === systemKey(right.system || right.platform);
    }

    function findAwardsForGame(game, entries, indexOrGames) {
        if (!game || !Array.isArray(entries)) return [];
        const index = indexOrGames?.byTitle ? indexOrGames : buildGameIndex(indexOrGames || [game]);
        return entries.filter((entry) => sameGame(findGame(entry, index), game));
    }

    return Object.freeze({
        normalizeText,
        canonicalTitle,
        systemKey,
        titleVariants,
        buildGameIndex,
        findGame,
        findAwardsForGame,
        gameHref,
        sameGame,
        scoreGame
    });
});
