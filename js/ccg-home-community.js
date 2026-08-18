(function () {
  "use strict";

  const mountId = "homeCommunityLatestCard";

  function text(value) {
    return String(value == null ? "" : value);
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

  function renderEmpty(mount) {
    mount.replaceChildren();
    const copy = document.createElement("div");
    copy.className = "home-community-latest__copy";
    const title = document.createElement("strong");
    title.textContent = "Be the first to leave a community review";
    const note = document.createElement("p");
    note.className = "home-community-latest__review";
    note.textContent = "Open any game page, sign in and share your verdict out of 10.";
    const link = document.createElement("a");
    link.className = "home-community-latest__game";
    link.href = "/games/";
    link.textContent = "Choose a game →";
    copy.append(title, note, link);
    mount.append(copy);
  }

  function renderLatest(mount, row, titles) {
    const key = text(row.game_key).trim().toLowerCase().replace(/_/g, "-");
    const title = titles.get(key) || key.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Community game";
    const body = text(row.body).trim();

    mount.replaceChildren();
    const copy = document.createElement("div");
    copy.className = "home-community-latest__copy";

    const game = document.createElement("a");
    game.className = "home-community-latest__game";
    game.href = gameUrl(key);
    game.textContent = title + " received the latest review";

    const review = document.createElement("p");
    review.className = "home-community-latest__review";
    review.textContent = body ? "“" + (body.length > 180 ? body.slice(0, 177) + "…" : body) + "”" : "A new member verdict has been posted.";

    const meta = document.createElement("span");
    meta.className = "home-community-latest__meta";
    const date = row.created_at ? new Date(row.created_at) : null;
    meta.textContent = date && !Number.isNaN(date.valueOf())
      ? "Posted " + new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date)
      : "Latest community activity";

    copy.append(game, review, meta);

    const action = document.createElement("a");
    action.className = "ccg-community-btn";
    action.href = gameUrl(key) + "#ccg-community-game-title";
    action.textContent = "Read the verdict";

    mount.append(copy, action);
  }

  async function init() {
    const mount = document.getElementById(mountId);
    if (!mount || !window.ccgSupabase) return;

    try {
      const [supabase, titles] = await Promise.all([
        window.ccgSupabase.getClient(),
        loadGameTitles()
      ]);
      const { data, error } = await supabase
        .from("comments")
        .select("game_key,body,created_at")
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!data || !data.length) {
        renderEmpty(mount);
        return;
      }
      renderLatest(mount, data[0], titles);
    } catch (error) {
      console.error("[CCG HOME COMMUNITY] Could not load latest review", error);
      renderEmpty(mount);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
