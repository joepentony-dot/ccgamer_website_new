(function () {
  "use strict";

  const mountId = "homeCommunityLatestCard";
  const lostSizzlerUrl = "/arcade/c64-dungeon-carnage/";

  function text(value) {
    return String(value == null ? "" : value);
  }

  function ensureLostSizzlerCtaStyle() {
    if (document.querySelector('link[data-ccg-home-lost-sizzler-cta="true"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/resources/css/home-lost-sizzler-cta.css?v=20260823b";
    link.dataset.ccgHomeLostSizzlerCta = "true";
    document.head.appendChild(link);
  }

  function installLostSizzlerHeroLogo() {
    const target = document.querySelector(".home-hero__beta-cta");
    if (!target) return;
    target.href = lostSizzlerUrl;
    target.setAttribute("aria-label", "Beta test C64 Dungeon Carnage, the new Cheeky Commodore Gamer browser game");
    const targetName = target.querySelector("span");
    if (targetName) targetName.textContent = "C64 DUNGEON CARNAGE";

    const leaderboard = document.querySelector(".home-hero__leaderboard-cta");
    if (leaderboard) {
      leaderboard.href = lostSizzlerUrl + "#weekly-vault";
      leaderboard.setAttribute("aria-label", "View the C64 Dungeon Carnage weekly challenge leaderboard");
    }

    if (document.querySelector(".home-hero__sizzler-mark")) return;
    ensureLostSizzlerCtaStyle();

    // Recognition mark only. Keeping the yellow CTA as the sole interactive
    // launch target prevents the decorative logo from ever owning pointer,
    // wheel or touch-scroll input over the home hero.
    const mark = document.createElement("span");
    mark.className = "home-hero__sizzler-mark";
    mark.setAttribute("aria-hidden", "true");

    const image = document.createElement("img");
    image.src = "/arcade/c64-dungeon-carnage/assets/lost-sizzler.webp";
    image.alt = "";
    image.width = 240;
    image.height = 132;
    image.loading = "eager";
    image.decoding = "async";
    image.draggable = false;

    mark.appendChild(image);
    target.parentElement.insertBefore(mark, target);
  }

  function gameUrl(gameKey) {
    const slug = text(gameKey).trim().toLowerCase().replace(/_/g, "-");
    return slug ? "/games/" + encodeURIComponent(slug) + "/" : "/games/";
  }

  async function loadGameTitles() {
    try {
      const response = await fetch("/games/games.json", { cache: "force-cache" });
      if (!response.ok) return new Map();
      const payload = await response.json();
      const games = Array.isArray(payload) ? payload : (Array.isArray(payload.games) ? payload.games : []);
      const map = new Map();
      games.forEach((game) => {
        const key = text(game.slug || game.id || game.game_slug || game.game_key).trim().toLowerCase().replace(/_/g, "-");
        const title = text(game.title || game.name).trim();
        if (key && title) map.set(key, title);
      });
      return map;
    } catch (_error) {
      return new Map();
    }
  }

  function safeGameKey(value) {
    const slug = text(value).trim().toLowerCase().replace(/_/g, "-");
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : "";
  }

  function ratingSummary(row) {
    if (!row || row.rating_count == null || row.average_rating == null) return null;
    const count = Number(row.rating_count), average = Number(row.average_rating);
    if (!Number.isSafeInteger(count) || count < 0 || !Number.isFinite(average)) return null;
    if (count === 0) return { count: 0, average: null };
    if (average < 1 || average > 10) return null;
    return { count, average };
  }

  function selectedGame() {
    const pick = document.querySelector('.ccg-archive-pulse [data-ccg-archive-pulse="game-of-the-day"]');
    const match = pick?.getAttribute("href")?.match(/^\/games\/([a-z0-9-]+)\/$/);
    const key = safeGameKey(match?.[1]);
    const title = text(pick?.querySelector(".ccg-archive-pulse__name")?.textContent).trim();
    return key && title ? { key, title } : null;
  }

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = content;
    return node;
  }

  function renderCommunity(mount, pick, score, reviewState, row, titles) {
    const copy = element("div", "home-community-latest__copy", "");
    copy.append(element("strong", "", "Rate the games you remember"));
    copy.append(element("p", "home-community-latest__review", "Your scores out of 10 help other Commodore gamers discover their next favourite."));
    if (pick) {
      const feature = element("div", "home-community-rating-pick", "");
      feature.append(element("span", "home-community-rating-pick__title", pick.title));
      const status = score
        ? score.count ? score.average.toFixed(1) + "/10 · " + score.count + (score.count === 1 ? " community vote" : " community votes") : "Not rated yet"
        : "Community score unavailable";
      feature.append(element("span", "home-community-rating-pick__score", status));
      const rate = element("a", "ccg-community-btn", "Rate this game");
      rate.href = gameUrl(pick.key) + "#ccg-community-game-title";
      feature.append(rate);
      copy.append(feature);
    }
    const browse = element("a", "home-community-latest__game", "Find a game to rate →");
    browse.href = "/games/";
    copy.append(browse);

    const recent = element("div", "home-community-review-summary", "");
    recent.append(element("strong", "", "Latest community review"));
    if (reviewState === "ready" && row) {
      const key = safeGameKey(row.game_key);
      const title = titles.get(key) || key.replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
      const game = element("a", "home-community-latest__game", title);
      game.href = gameUrl(key) + "#ccg-community-game-title";
      const body = text(row.body).trim();
      recent.append(game, element("p", "home-community-latest__review", body ? "“" + (body.length > 140 ? body.slice(0, 137) + "…" : body) + "”" : "Read the latest member review."));
    } else {
      recent.append(element("p", "home-community-latest__review", reviewState === "empty" ? "No public reviews yet. Share your first verdict." : "Reviews are temporarily unavailable."));
    }
    copy.append(recent);
    mount.replaceChildren(copy);
  }

  async function init() {
    installLostSizzlerHeroLogo();
    const mount = document.getElementById(mountId);
    if (!mount) return;
    const pick = selectedGame();
    let score = null, row = null, reviewState = "unavailable", titles = new Map();
    try {
      if (!window.ccgSupabase) throw Error("Community client unavailable");
      const supabase = await window.ccgSupabase.getClient();
      const [scoreResult, reviewResult] = await Promise.allSettled([
        pick ? supabase.rpc("ccg_game_rating_summary", { p_game_key: pick.key }) : Promise.resolve(null),
        supabase.from("comments").select("game_key,body,created_at").eq("deleted", false).not("game_key", "is", null).order("created_at", { ascending: false }).limit(1)
      ]);
      if (scoreResult.status === "fulfilled" && scoreResult.value && !scoreResult.value.error) {
        const data = scoreResult.value.data;
        score = ratingSummary(Array.isArray(data) ? data[0] : data);
      }
      if (reviewResult.status === "fulfilled" && !reviewResult.value.error && Array.isArray(reviewResult.value.data)) {
        row = reviewResult.value.data[0] || null;
        reviewState = row && safeGameKey(row.game_key) ? "ready" : row ? "unavailable" : "empty";
        if (reviewState === "ready") titles = await loadGameTitles();
      }
    } catch (error) {
      console.warn("[CCG HOME COMMUNITY] Read unavailable", error);
    }
    renderCommunity(mount, pick, score, reviewState, row, titles);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
