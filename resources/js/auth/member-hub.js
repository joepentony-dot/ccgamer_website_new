/* ============================================================
   CCG MEMBER HUB — PRIVATE DASHBOARD
   ------------------------------------------------------------
   Phase 1 uses existing account favourites plus established
   browser-local history and personal-list data. Phase 20E adds
   an explicit, account-backed announcement preference choice.
============================================================ */

(function () {
  "use strict";

  if (window.CCG_MEMBER_HUB_READY) return;
  window.CCG_MEMBER_HUB_READY = true;

  const PERSONAL_LIBRARY_KEY = "ccgPersonalGameLibraryV1";
  const RECENTLY_VIEWED_KEY = "ccgRecentlyViewedGamesV1";
  const PREFERRED_SYSTEM_KEY = "ccgMemberPreferredSystemV1";
  const ZZAP_VISIT_KEY = "ccgVisitedZzap64ArchiveV1";
  const LIST_KEYS = ["played", "want", "owned", "still"];

  const state = {
    personalLibrary: {},
    recentlyViewed: [],
    favouriteCount: 0,
    topPickCount: 0,
    preferredSystem: "both",
    recentContent: []
  };

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      return parsed === null ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writePreferredSystem(value) {
    const allowed = new Set(["c64", "amiga", "both"]);
    state.preferredSystem = allowed.has(value) ? value : "both";
    try {
      localStorage.setItem(PREFERRED_SYSTEM_KEY, state.preferredSystem);
    } catch (error) {}
    updatePreferredSystemUi();
    updateCompletion();
  }

  function loadLocalState() {
    const library = readJson(PERSONAL_LIBRARY_KEY, {});
    const viewed = readJson(RECENTLY_VIEWED_KEY, []);
    state.personalLibrary = library && typeof library === "object" && !Array.isArray(library) ? library : {};
    state.recentlyViewed = Array.isArray(viewed) ? viewed.filter(Boolean) : [];
    try {
      state.preferredSystem = localStorage.getItem(PREFERRED_SYSTEM_KEY) || "both";
    } catch (error) {
      state.preferredSystem = "both";
    }
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value);
  }

  function listCount(listKey) {
    return Object.values(state.personalLibrary).filter((entry) => (
      Array.isArray(entry?.lists) && entry.lists.includes(listKey)
    )).length;
  }

  function countFavourites() {
    const list = document.getElementById("favouriteGamesList");
    if (!list) return;
    const cards = Array.from(list.querySelectorAll(":scope > li"))
      .filter((item) => !item.classList.contains("profile-favourites-list__empty"));
    state.favouriteCount = cards.length;
    state.topPickCount = cards.filter((item) => item.classList.contains("profile-favourite-card--top-pick")).length;
  }

  function updateStats() {
    countFavourites();
    setText("memberStatFavourites", state.favouriteCount);
    setText("memberStatTopPicks", state.topPickCount);
    setText("memberStatPlayed", listCount("played"));
    setText("memberStatWant", listCount("want"));
    setText("memberStatOwned", listCount("owned"));
    setText("memberStatStill", listCount("still"));
  }

  function preferredSystemLabel(value) {
    if (value === "c64") return "Commodore 64";
    if (value === "amiga") return "Commodore Amiga";
    return "C64 & Amiga";
  }

  function updatePreferredSystemUi() {
    const select = document.getElementById("preferredSystem");
    if (select) select.value = state.preferredSystem;
    setText("memberPreferredSystemLabel", preferredSystemLabel(state.preferredSystem));
  }

  function updateCompletion() {
    const displayName = String(document.getElementById("displayName")?.textContent || "").trim();
    const hasName = Boolean(displayName && displayName !== "—" && displayName.toLowerCase() !== "member");
    const hasPreference = Boolean(state.preferredSystem);
    const hasFavourites = state.favouriteCount > 0;
    const hasLibrary = LIST_KEYS.some((key) => listCount(key) > 0);
    const complete = [hasName, hasPreference, hasFavourites, hasLibrary].filter(Boolean).length;
    const percent = Math.round((complete / 4) * 100);

    setText("memberCompletionPercent", `${percent}%`);
    const fill = document.getElementById("memberCompletionFill");
    if (fill) fill.style.width = `${percent}%`;
    setText(
      "memberCompletionNote",
      percent === 100
        ? "Your Member Hub is fully set up."
        : "Add favourites and personal game lists to make this dashboard more useful."
    );
  }

  function buildGameCard(item) {
    const link = document.createElement("a");
    link.className = "member-game-card";
    link.href = item.href || `/games/${encodeURIComponent(item.slug || "")}/`;

    const image = document.createElement("img");
    image.className = "member-game-card__image";
    image.src = item.image || item.thumbnail || "/resources/images/thumbnails/all/1942.jpg";
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      image.src = "/resources/images/thumbnails/all/1942.jpg";
    }, { once: true });

    const body = document.createElement("span");
    body.className = "member-game-card__body";
    const title = document.createElement("span");
    title.className = "member-game-card__title";
    title.textContent = item.title || item.slug || "CCG game";
    const meta = document.createElement("span");
    meta.className = "member-game-card__meta";
    meta.textContent = [item.system, item.year].filter(Boolean).join(" · ") || "Recently viewed";
    body.append(title, meta);
    link.append(image, body);
    return link;
  }

  function renderRecentlyViewed() {
    const host = document.getElementById("memberRecentlyViewed");
    if (!host) return;
    host.replaceChildren();
    const items = state.recentlyViewed.slice(0, 4);
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "member-empty";
      empty.textContent = "Open a few game pages and they will appear here for quick access.";
      host.appendChild(empty);
      return;
    }
    items.forEach((item) => host.appendChild(buildGameCard(item)));
  }

  function wantToPlayEntries() {
    return Object.entries(state.personalLibrary)
      .filter(([, entry]) => Array.isArray(entry?.lists) && entry.lists.includes("want"))
      .map(([slug, entry]) => ({ slug, ...entry }));
  }

  function renderSuggestion(forceDifferent = false) {
    const host = document.getElementById("memberWantSuggestion");
    if (!host) return;
    host.replaceChildren();
    const entries = wantToPlayEntries();

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "member-empty";
      empty.textContent = "Add games to Want to Play from any game page and this panel will choose one for you.";
      host.appendChild(empty);
      return;
    }

    const previous = host.dataset.currentSlug || "";
    let choices = entries;
    if (forceDifferent && entries.length > 1) choices = entries.filter((entry) => entry.slug !== previous);
    const selected = choices[Math.floor(Math.random() * choices.length)] || entries[0];
    host.dataset.currentSlug = selected.slug;

    const box = document.createElement("div");
    box.className = "member-suggestion__game";
    const link = document.createElement("a");
    link.href = `/games/${encodeURIComponent(selected.slug)}/`;
    link.textContent = selected.title || selected.slug;
    const meta = document.createElement("span");
    meta.className = "member-suggestion__meta";
    meta.textContent = [selected.system, selected.year, selected.rating ? `${selected.rating}/10` : ""]
      .filter(Boolean)
      .join(" · ") || "From your Want to Play list";
    box.append(link, meta);
    host.appendChild(box);
  }

  function formatDate(value) {
    const parsed = new Date(`${value}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return value || "";
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
  }

  function renderRecentContent() {
    const host = document.getElementById("memberRecentContent");
    if (!host) return;
    host.replaceChildren();
    state.recentContent.slice(0, 3).forEach((item) => {
      const link = document.createElement("a");
      link.className = "member-content-card";
      link.href = item.href || "/home.html";
      const top = document.createElement("span");
      top.className = "member-content-card__top";
      const type = document.createElement("span");
      type.textContent = item.type || "Updated";
      const date = document.createElement("span");
      date.textContent = formatDate(item.date);
      top.append(type, date);
      const title = document.createElement("span");
      title.className = "member-content-card__title";
      title.textContent = item.title || "CCG archive update";
      link.append(top, title);
      host.appendChild(link);
    });
  }

  async function loadRecentContent() {
    try {
      const response = await fetch("/data/recent-content.json", { cache: "default" });
      if (!response.ok) return;
      const data = await response.json();
      state.recentContent = Array.isArray(data)
        ? data.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
        : [];
      renderRecentContent();
    } catch (error) {}
  }

  function viewedSystemCount(system) {
    return state.recentlyViewed.filter((item) => {
      const value = String(item?.system || "").toLowerCase();
      return system === "c64" ? /c64|commodore 64/.test(value) : /amiga/.test(value);
    }).length;
  }

  function hasVisitedZzap() {
    try {
      return localStorage.getItem(ZZAP_VISIT_KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  function updateAchievements() {
    const achievementData = [
      { id: "memberBadgeC64", earned: viewedSystemCount("c64") >= 12, progress: `${viewedSystemCount("c64")}/12 C64 games viewed` },
      { id: "memberBadgeAmiga", earned: viewedSystemCount("amiga") >= 12, progress: `${viewedSystemCount("amiga")}/12 Amiga games viewed` },
      { id: "memberBadgeCollector", earned: listCount("owned") + listCount("still") >= 25, progress: `${listCount("owned") + listCount("still")}/25 collection entries` },
      { id: "memberBadgeTopPicker", earned: state.topPickCount >= 10, progress: `${state.topPickCount}/10 Top Picks selected` },
      { id: "memberBadgeZzap", earned: hasVisitedZzap(), progress: hasVisitedZzap() ? "Archive visited" : "Visit the Zzap!64 Awards Archive" }
    ];

    achievementData.forEach((badge) => {
      const node = document.getElementById(badge.id);
      if (!node) return;
      node.classList.toggle("is-earned", badge.earned);
      node.querySelector("[data-member-achievement-progress]")?.replaceChildren(document.createTextNode(badge.progress));
    });
  }

  function renderActivity() {
    const host = document.getElementById("memberActivityFeed");
    if (!host) return;
    host.replaceChildren();
    const events = [];
    state.recentlyViewed.slice(0, 3).forEach((item) => {
      events.push(`Viewed ${item.title || item.slug || "a game"}`);
    });
    const played = listCount("played");
    const want = listCount("want");
    if (played) events.push(`${played} game${played === 1 ? "" : "s"} recorded as played`);
    if (want) events.push(`${want} game${want === 1 ? "" : "s"} waiting in Want to Play`);
    if (state.topPickCount) events.push(`${state.topPickCount} Top Pick${state.topPickCount === 1 ? "" : "s"} selected`);

    if (!events.length) {
      const empty = document.createElement("p");
      empty.className = "member-empty";
      empty.textContent = "Your recent private activity will appear here as you explore the archive.";
      host.appendChild(empty);
      return;
    }

    const list = document.createElement("ul");
    list.className = "member-benefit-list";
    events.slice(0, 6).forEach((eventText) => {
      const item = document.createElement("li");
      item.textContent = eventText;
      list.appendChild(item);
    });
    host.appendChild(list);
  }

  async function getMemberClient() {
    const started = Date.now();
    while (Date.now() - started < 8000) {
      if (window.ccgSupabase && typeof window.ccgSupabase.getClient === "function") {
        return window.ccgSupabase.getClient();
      }
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    throw new Error("Supabase member client is unavailable.");
  }

  function ensureConsentStylesheet() {
    if (document.querySelector('link[data-ccg-notification-preferences]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/resources/css/notification-preferences.css";
    link.dataset.ccgNotificationPreferences = "true";
    document.head.appendChild(link);
  }

  function setProfileMessage(message, type = "success") {
    const box = document.getElementById("profileMessage");
    if (!box) return;
    box.textContent = message;
    box.classList.remove("auth-error", "auth-success");
    box.classList.add(type === "error" ? "auth-error" : "auth-success");
  }

  async function updateRecordedPreferences(supabase, userId, values) {
    const now = new Date().toISOString();
    const updates = {
      notification_preferences_updated_at: now
    };

    if (Object.hasOwn(values, "notifyNewGames")) {
      updates.notify_new_games = Boolean(values.notifyNewGames);
      updates.notify_new_games_opt_in = Boolean(values.notifyNewGames);
      updates.notify_new_games_choice_recorded = true;
    }

    if (Object.hasOwn(values, "notifyNewsletter")) {
      updates.notify_newsletter = Boolean(values.notifyNewsletter);
      updates.newsletter_opt_in = Boolean(values.notifyNewsletter);
      updates.notify_newsletter_choice_recorded = true;
    }

    return supabase.from("profiles").update(updates).eq("id", userId);
  }

  function createNotificationChoice({ supabase, userId, currentValue }) {
    const settings = document.getElementById("memberSettings");
    const grid = settings?.querySelector(".member-account-grid");
    if (!settings || !grid || document.getElementById("memberNotificationChoice")) return;

    ensureConsentStylesheet();

    const panel = document.createElement("section");
    panel.id = "memberNotificationChoice";
    panel.className = "member-notification-choice";
    panel.setAttribute("aria-labelledby", "memberNotificationChoiceTitle");

    const title = document.createElement("h3");
    title.id = "memberNotificationChoiceTitle";
    title.textContent = "Choose your CCG video email preference";

    const copy = document.createElement("p");
    copy.textContent = "Would you like an email when new CCG videos, Zzap!64 features and Retro Specials are published? No video announcement emails will be sent to you until you choose.";

    const actions = document.createElement("div");
    actions.className = "member-notification-choice__actions";

    const yesButton = document.createElement("button");
    yesButton.type = "button";
    yesButton.className = "auth-btn";
    yesButton.textContent = "Yes, email me";

    const noButton = document.createElement("button");
    noButton.type = "button";
    noButton.className = "auth-btn";
    noButton.textContent = "No thanks";

    const status = document.createElement("p");
    status.className = "member-notification-choice__status";
    status.setAttribute("aria-live", "polite");

    const choose = async (enabled) => {
      yesButton.disabled = true;
      noButton.disabled = true;
      status.textContent = "Saving your choice…";

      const { error } = await updateRecordedPreferences(supabase, userId, {
        notifyNewsletter: enabled
      });

      if (error) {
        console.error("[member-hub] notification choice save failed", error);
        status.textContent = "Your choice could not be saved. Please try again.";
        yesButton.disabled = false;
        noButton.disabled = false;
        return;
      }

      const newsletterCheckbox = document.getElementById("notifyNewsletter");
      if (newsletterCheckbox) newsletterCheckbox.checked = enabled;
      setProfileMessage(enabled ? "Video and Retro Special emails enabled." : "Video and Retro Special emails remain disabled.");
      panel.remove();
    };

    yesButton.addEventListener("click", () => void choose(true));
    noButton.addEventListener("click", () => void choose(false));
    actions.append(yesButton, noButton);
    panel.append(title, copy, actions, status);
    grid.insertAdjacentElement("beforebegin", panel);

    const newsletterCheckbox = document.getElementById("notifyNewsletter");
    if (newsletterCheckbox) newsletterCheckbox.checked = Boolean(currentValue);
  }

  async function initNotificationConsent() {
    try {
      const supabase = await getMemberClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user?.id) return;

      const userId = authData.user.id;
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("notify_new_games, notify_newsletter, notify_newsletter_choice_recorded")
        .eq("id", userId)
        .maybeSingle();

      if (profileError || !profile) {
        console.error("[member-hub] notification preference read failed", profileError);
        return;
      }

      const prefsForm = document.getElementById("prefsForm");
      prefsForm?.addEventListener("submit", () => {
        const notifyNewGames = Boolean(document.getElementById("notifyNewGames")?.checked);
        const notifyNewsletter = Boolean(document.getElementById("notifyNewsletter")?.checked);
        void updateRecordedPreferences(supabase, userId, { notifyNewGames, notifyNewsletter })
          .then(({ error }) => {
            if (error) console.error("[member-hub] preference choice marker save failed", error);
          });
      });

      if (!profile.notify_newsletter_choice_recorded) {
        createNotificationChoice({
          supabase,
          userId,
          currentValue: profile.notify_newsletter
        });
      }
    } catch (error) {
      console.error("[member-hub] notification consent init failed", error);
    }
  }

  function refreshDashboard() {
    loadLocalState();
    updateStats();
    updatePreferredSystemUi();
    updateCompletion();
    renderRecentlyViewed();
    renderSuggestion();
    updateAchievements();
    renderActivity();
  }

  function bindControls() {
    document.getElementById("preferredSystem")?.addEventListener("change", (event) => {
      writePreferredSystem(event.target.value);
    });
    document.getElementById("memberRefreshSuggestion")?.addEventListener("click", () => renderSuggestion(true));
    document.getElementById("memberClearRecent")?.addEventListener("click", () => {
      try { localStorage.removeItem(RECENTLY_VIEWED_KEY); } catch (error) {}
      state.recentlyViewed = [];
      renderRecentlyViewed();
      updateAchievements();
      renderActivity();
    });
    document.addEventListener("ccg:personal-library-updated", refreshDashboard);
    document.addEventListener("ccg:recently-viewed-updated", refreshDashboard);
    window.addEventListener("storage", refreshDashboard);
  }

  function observeAccountContent() {
    const favourites = document.getElementById("favouriteGamesList");
    const displayName = document.getElementById("displayName");
    const observer = new MutationObserver(() => {
      updateStats();
      updateCompletion();
      updateAchievements();
      renderActivity();
    });
    if (favourites) observer.observe(favourites, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    if (displayName) observer.observe(displayName, { childList: true, subtree: true, characterData: true });
  }

  function init() {
    if (!document.getElementById("memberHub")) return;
    bindControls();
    observeAccountContent();
    refreshDashboard();
    void loadRecentContent();
    void initNotificationConsent();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
