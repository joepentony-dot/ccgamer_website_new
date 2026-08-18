(function () {
  "use strict";

  function value(input) {
    return String(input == null ? "" : input);
  }

  function normaliseKey(input) {
    return value(input).trim().toLowerCase().replace(/_/g, "-");
  }

  function gameUrl(key) {
    const slug = normaliseKey(key);
    return slug ? "/games/" + encodeURIComponent(slug) + "/#ccg-community-game-title" : "/games/";
  }

  async function loadTitles() {
    try {
      const response = await fetch("/games/games.json", { cache: "force-cache" });
      if (!response.ok) return new Map();
      const payload = await response.json();
      const games = Array.isArray(payload) ? payload : (Array.isArray(payload.games) ? payload.games : []);
      const titles = new Map();
      games.forEach((game) => {
        const key = normaliseKey(game.slug || game.id || game.game_slug || game.game_key);
        const title = value(game.title || game.name).trim();
        if (key && title) titles.set(key, title);
      });
      return titles;
    } catch (_error) {
      return new Map();
    }
  }

  function displayTitle(key, titles) {
    const slug = normaliseKey(key);
    return titles.get(slug) || slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Game";
  }

  function setStat(id, count) {
    const node = document.getElementById(id);
    if (node) node.textContent = String(count);
  }

  function emptyState(mount, message) {
    mount.replaceChildren();
    const note = document.createElement("p");
    note.className = "ccg-community-muted";
    note.textContent = message;
    mount.append(note);
  }

  function metaDate(input) {
    const date = input ? new Date(input) : null;
    if (!date || Number.isNaN(date.valueOf())) return "";
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function renderRatings(mount, rows, titles) {
    mount.replaceChildren();
    if (!rows.length) {
      emptyState(mount, "You have not rated a game yet.");
      return;
    }

    rows.slice(0, 12).forEach((row) => {
      const item = document.createElement("article");
      item.className = "ccg-profile-community__item";
      const copy = document.createElement("div");
      const link = document.createElement("a");
      link.href = gameUrl(row.game_key);
      link.textContent = displayTitle(row.game_key, titles);
      const meta = document.createElement("p");
      meta.className = "ccg-profile-community__meta";
      meta.textContent = metaDate(row.created_at) || "Saved to your account";
      copy.append(link, meta);
      const score = document.createElement("strong");
      score.textContent = value(row.rating) + "/10";
      item.append(copy, score);
      mount.append(item);
    });
  }

  function renderReviews(mount, rows, titles) {
    mount.replaceChildren();
    if (!rows.length) {
      emptyState(mount, "You have not written a review yet.");
      return;
    }

    rows.slice(0, 12).forEach((row) => {
      const item = document.createElement("article");
      item.className = "ccg-profile-community__item";
      const copy = document.createElement("div");
      const link = document.createElement("a");
      link.href = gameUrl(row.game_key);
      link.textContent = displayTitle(row.game_key, titles);
      const body = document.createElement("p");
      body.className = "ccg-profile-community__body";
      const fullBody = value(row.body).trim();
      body.textContent = fullBody.length > 150 ? fullBody.slice(0, 147) + "…" : fullBody;
      const meta = document.createElement("p");
      meta.className = "ccg-profile-community__meta";
      meta.textContent = metaDate(row.created_at) || "Saved to your account";
      copy.append(link, body, meta);
      item.append(copy);
      mount.append(item);
    });
  }

  async function init() {
    const ratingsMount = document.getElementById("profileCommunityRatings");
    const reviewsMount = document.getElementById("profileCommunityReviews");
    if (!ratingsMount || !reviewsMount || !window.ccgSupabase) return;

    try {
      await window.ccgSupabase.waitForAuth();
      const [context, supabase, titles] = await Promise.all([
        window.ccgSupabase.getCurrentUserContext(),
        window.ccgSupabase.getClient(),
        loadTitles()
      ]);
      const userId = context && context.user ? context.user.id : "";
      if (!userId) {
        emptyState(ratingsMount, "Log in to view your ratings.");
        emptyState(reviewsMount, "Log in to view your reviews.");
        return;
      }

      const [ratingsResult, commentsResult] = await Promise.all([
        supabase
          .from("ratings")
          .select("game_key,rating,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("comments")
          .select("game_key,body,created_at")
          .eq("user_id", userId)
          .eq("deleted", false)
          .order("created_at", { ascending: false })
      ]);

      if (ratingsResult.error) throw ratingsResult.error;
      if (commentsResult.error) throw commentsResult.error;

      const ratings = ratingsResult.data || [];
      const reviews = commentsResult.data || [];
      setStat("memberStatRatings", ratings.length);
      setStat("memberStatReviews", reviews.length);
      renderRatings(ratingsMount, ratings, titles);
      renderReviews(reviewsMount, reviews, titles);

      const reviewerBadge = document.getElementById("memberBadgeReviewer");
      const reviewerProgress = document.getElementById("memberBadgeReviewerProgress");
      if (reviewerBadge) reviewerBadge.classList.toggle("is-earned", reviews.length >= 5);
      if (reviewerProgress) reviewerProgress.textContent = Math.min(reviews.length, 5) + "/5 reviews posted";

      const activity = document.getElementById("memberActivityFeed");
      if (activity) {
        activity.replaceChildren();
        if (!ratings.length && !reviews.length) {
          const empty = document.createElement("p");
          empty.className = "member-empty";
          empty.textContent = "Your ratings and reviews will appear here after you contribute on a game page.";
          activity.append(empty);
        } else {
          const list = document.createElement("ul");
          list.className = "member-benefit-list";
          if (ratings.length) {
            const item = document.createElement("li");
            item.textContent = ratings.length + " game rating" + (ratings.length === 1 ? "" : "s") + " saved to your account";
            list.append(item);
          }
          if (reviews.length) {
            const item = document.createElement("li");
            item.textContent = reviews.length + " community review" + (reviews.length === 1 ? "" : "s") + " posted";
            list.append(item);
          }
          reviews.slice(0, 2).forEach((row) => {
            const item = document.createElement("li");
            item.textContent = "Reviewed " + displayTitle(row.game_key, titles);
            list.append(item);
          });
          activity.append(list);
        }
      }

      const displayName = value(document.getElementById("displayName")?.textContent).trim();
      const favourites = Number(document.getElementById("memberStatFavourites")?.textContent || 0);
      const hasName = Boolean(displayName && displayName !== "—" && displayName.toLowerCase() !== "member");
      const completed = [hasName, favourites > 0, ratings.length > 0, reviews.length > 0].filter(Boolean).length;
      const percent = Math.round((completed / 4) * 100);
      const completionPercent = document.getElementById("memberCompletionPercent");
      const completionFill = document.getElementById("memberCompletionFill");
      const completionNote = document.getElementById("memberCompletionNote");
      if (completionPercent) completionPercent.textContent = percent + "%";
      if (completionFill) completionFill.style.width = percent + "%";
      if (completionNote) completionNote.textContent = percent === 100
        ? "Your Member Hub is fully set up."
        : "Add favourites, ratings and reviews to build your CCG profile.";
    } catch (error) {
      console.error("[CCG PROFILE COMMUNITY] Could not load member activity", error);
      emptyState(ratingsMount, "Your ratings could not be loaded right now.");
      emptyState(reviewsMount, "Your reviews could not be loaded right now.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
