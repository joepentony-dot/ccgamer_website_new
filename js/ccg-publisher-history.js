/* ============================================================
   CCG CURATED PUBLISHER HISTORIES
   ------------------------------------------------------------
   Adds concise archive context. Source-backed profiles expose
   their evidence links and review date to visitors.
============================================================ */

(function () {
  "use strict";

  if (window.CCG_PUBLISHER_HISTORY_READY) return;
  window.CCG_PUBLISHER_HISTORY_READY = true;

  const CSS_PATH = "/resources/css/publisher-history.css";
  const DATA_PATH = "/data/publisher-histories.json";

  function currentPublisherSlug() {
    const match = window.location.pathname.match(/\/games\/publishers\/([^/]+)\/?(?:index\.html)?$/i);
    return match ? String(match[1] || "").toLowerCase() : "";
  }

  function ensureCss() {
    if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_PATH;
    document.head.appendChild(link);
  }

  function text(value) {
    return String(value ?? "").trim();
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(value);
      return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  function targetContainer() {
    return document.querySelector(
      ".ccg-publisher-playlist, .ccg-publishers-tools, #publisherGameGrid, .ccg-publisher-game-grid, .ccg-publishers-wayfinding"
    )?.parentElement || document.querySelector(".ccg-publishers-main, main");
  }

  function createHeading(level, content) {
    const heading = document.createElement(level);
    heading.textContent = content;
    return heading;
  }

  function createTagList(values) {
    const list = document.createElement("ul");
    list.className = "ccg-publisher-history__tags";

    (Array.isArray(values) ? values : []).forEach((value) => {
      const item = document.createElement("li");
      item.className = "ccg-publisher-history__tag";
      item.textContent = text(value);
      list.appendChild(item);
    });

    return list;
  }

  function createFactList(values) {
    const list = document.createElement("ul");
    list.className = "ccg-publisher-history__facts";

    (Array.isArray(values) ? values : []).forEach((value) => {
      const item = document.createElement("li");
      item.textContent = text(value);
      list.appendChild(item);
    });

    return list;
  }

  function createRelatedList(values) {
    const list = document.createElement("ul");
    list.className = "ccg-publisher-history__links";
    const entries = Array.isArray(values) ? values : [];

    if (!entries.length) {
      const item = document.createElement("li");
      item.textContent = "No related archive routes recorded.";
      list.appendChild(item);
      return list;
    }

    entries.forEach((entry) => {
      const slug = text(entry?.slug).replace(/^\/+|\/+$/g, "");
      if (!slug) return;
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `/games/publishers/${encodeURIComponent(slug)}/`;
      link.textContent = text(entry?.label || slug);
      item.appendChild(link);
      list.appendChild(item);
    });

    return list;
  }

  function formatReviewDate(value) {
    const date = new Date(`${text(value)}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  function createPanel(title, content, modifier = "") {
    const panel = document.createElement("div");
    panel.className = `ccg-publisher-history__panel${modifier ? ` ${modifier}` : ""}`;
    panel.append(createHeading("h3", title), content);
    return panel;
  }

  function createSourcePanel(profile) {
    const sources = (Array.isArray(profile.sources) ? profile.sources : [])
      .map((source) => ({
        label: text(source?.label),
        url: safeExternalUrl(source?.url),
        type: text(source?.type)
      }))
      .filter((source) => source.label && source.url);

    if (!sources.length) return null;

    const list = document.createElement("ul");
    list.className = "ccg-publisher-history__sources";

    sources.forEach((source) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer external";
      link.textContent = source.label;

      if (source.type) {
        const type = document.createElement("span");
        type.className = "ccg-publisher-history__source-type";
        type.textContent = source.type;
        item.append(link, type);
      } else {
        item.appendChild(link);
      }
      list.appendChild(item);
    });

    return createPanel("Evidence sources", list, "ccg-publisher-history__panel--sources");
  }

  function insertProfile(profile) {
    if (document.querySelector("[data-ccg-publisher-history]")) return;

    const facts = Array.isArray(profile.facts) ? profile.facts.filter((item) => text(item)) : [];
    const sources = Array.isArray(profile.sources) ? profile.sources : [];
    const sourceBacked = facts.length > 0 && sources.length > 0;
    const reviewed = formatReviewDate(profile.verified_on);

    const section = document.createElement("section");
    section.className = `ccg-publisher-history${sourceBacked ? " is-source-backed" : ""}`;
    section.dataset.ccgPublisherHistory = "true";

    const topLine = document.createElement("div");
    topLine.className = "ccg-publisher-history__topline";

    const kicker = document.createElement("p");
    kicker.className = "ccg-publisher-history__kicker";
    kicker.textContent = sourceBacked ? "Source-backed publisher profile" : "Curated CCG context";
    topLine.appendChild(kicker);

    if (sourceBacked) {
      const status = document.createElement("span");
      status.className = "ccg-publisher-history__status";
      status.textContent = reviewed ? `Evidence reviewed ${reviewed}` : "Evidence links included";
      topLine.appendChild(status);
    }

    const title = createHeading("h2", "About this publisher");
    title.className = "ccg-publisher-history__title";

    const summary = document.createElement("p");
    summary.className = "ccg-publisher-history__summary";
    summary.textContent = text(profile.summary);

    const grid = document.createElement("div");
    grid.className = "ccg-publisher-history__grid";

    if (facts.length) {
      grid.appendChild(createPanel("Documented company facts", createFactList(facts)));
    }
    grid.appendChild(createPanel("Archive strengths", createTagList(profile.strengths)));
    grid.appendChild(createPanel("Related labels and archives", createRelatedList(profile.related)));

    const sourcePanel = createSourcePanel(profile);
    if (sourcePanel) grid.appendChild(sourcePanel);

    const note = document.createElement("p");
    note.className = "ccg-publisher-history__note";
    note.textContent = text(
      profile.note || "This contextual summary complements the publisher credits stored in the main game database."
    );

    section.append(topLine, title, summary, grid, note);

    const anchor = document.querySelector(
      ".ccg-publisher-playlist, .ccg-publishers-tools, #publisherGameGrid, .ccg-publisher-game-grid, .ccg-publishers-wayfinding"
    );
    if (anchor?.parentNode) anchor.parentNode.insertBefore(section, anchor);
    else targetContainer()?.appendChild(section);
  }

  async function init() {
    const slug = currentPublisherSlug();
    if (!slug) return;
    ensureCss();

    try {
      const response = await fetch(DATA_PATH, { cache: "default" });
      if (!response.ok) return;
      const data = await response.json();
      const profile = Array.isArray(data)
        ? data.find((entry) => text(entry?.slug).toLowerCase() === slug)
        : null;
      if (profile) insertProfile(profile);
    } catch (error) {
      console.warn("[ccg-publisher-history] Publisher profile unavailable", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    void init();
  }
})();
