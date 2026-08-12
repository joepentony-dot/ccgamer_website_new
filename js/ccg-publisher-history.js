/* ============================================================
   CCG CURATED PUBLISHER HISTORIES
   ------------------------------------------------------------
   Adds concise archive context. Source-backed profiles expose
   their evidence links and review date to visitors.

   Publisher relationships are link-safe: a relationship becomes
   clickable only when the generated publisher metadata confirms
   a populated archive route. Other historical labels remain text.
============================================================ */

(function () {
  "use strict";

  if (window.CCG_PUBLISHER_HISTORY_READY) return;
  window.CCG_PUBLISHER_HISTORY_READY = true;

  const CSS_PATH = "/resources/css/publisher-history.css";
  const DATA_PATHS = [
    "/data/publisher-histories.json",
    "/data/publisher-histories-a-c.json"
  ];
  const METADATA_PATH = "/games/publishers/publishers.json";

  function currentPublisherSlug() {
    const match = window.location.pathname.match(/\/games\/publishers\/([^/]+)\/?(?:index\.html)?$/i);
    return match ? normaliseSlug(match[1]) : "";
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

  function normaliseSlug(value) {
    return text(value).toLowerCase().replace(/^\/+|\/+$/g, "");
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

  function buildPublisherArchiveMap(metadata) {
    const archiveMap = new Map();

    (Array.isArray(metadata) ? metadata : []).forEach((record) => {
      const slug = normaliseSlug(record?.slug);
      const count = Number(record?.count || 0);
      const url = text(record?.url);
      const expectedUrl = slug ? `/games/publishers/${slug}/` : "";

      if (!slug || !Number.isFinite(count) || count < 1 || url !== expectedUrl) return;
      archiveMap.set(slug, {
        slug,
        label: text(record?.name || slug),
        count,
        url
      });
    });

    return archiveMap;
  }

  function partitionRelationships(values, archiveMap) {
    const archives = [];
    const associated = [];
    const seen = new Set();

    (Array.isArray(values) ? values : []).forEach((entry) => {
      const slug = normaliseSlug(entry?.slug);
      const label = text(entry?.label || slug);
      const key = slug || label.toLowerCase();
      if (!label || !key || seen.has(key)) return;
      seen.add(key);

      const archive = slug ? archiveMap.get(slug) : null;
      if (archive) {
        archives.push({
          slug,
          label,
          count: archive.count,
          url: archive.url
        });
      } else {
        associated.push({ slug, label });
      }
    });

    return { archives, associated };
  }

  function createArchiveLinkList(entries) {
    const list = document.createElement("ul");
    list.className = "ccg-publisher-history__links";

    entries.forEach((entry) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = entry.url;
      link.textContent = entry.label;
      link.dataset.publisherArchive = entry.slug;
      link.setAttribute(
        "aria-label",
        `${entry.label}: open CCG publisher archive containing ${entry.count} ${entry.count === 1 ? "game" : "games"}`
      );
      item.appendChild(link);
      list.appendChild(item);
    });

    return list;
  }

  function createAssociatedLabelList(entries) {
    const list = document.createElement("ul");
    list.className = "ccg-publisher-history__associated";

    entries.forEach((entry) => {
      const item = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = entry.label;
      label.title = "Historical association; no populated CCG publisher archive is currently available.";
      item.appendChild(label);
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

  function insertProfile(profile, archiveMap) {
    if (document.querySelector("[data-ccg-publisher-history]")) return;

    const facts = Array.isArray(profile.facts) ? profile.facts.filter((item) => text(item)) : [];
    const sources = Array.isArray(profile.sources) ? profile.sources : [];
    const sourceBacked = facts.length > 0 && sources.length > 0;
    const reviewed = formatReviewDate(profile.verified_on);
    const relationships = partitionRelationships(profile.related, archiveMap);

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

    if (relationships.archives.length) {
      grid.appendChild(createPanel("Related CCG archives", createArchiveLinkList(relationships.archives)));
    }
    if (relationships.associated.length) {
      grid.appendChild(createPanel("Associated labels", createAssociatedLabelList(relationships.associated)));
    }

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

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "default" });
    if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
    return response.json();
  }

  function mergeProfileResults(results) {
    const merged = [];
    const seen = new Set();

    results.forEach((result) => {
      if (result.status !== "fulfilled" || !Array.isArray(result.value)) return;
      result.value.forEach((entry) => {
        const slug = normaliseSlug(entry?.slug);
        if (!slug || seen.has(slug)) return;
        seen.add(slug);
        merged.push(entry);
      });
    });

    return merged;
  }

  async function init() {
    const slug = currentPublisherSlug();
    if (!slug) return;
    ensureCss();

    try {
      const results = await Promise.allSettled([
        ...DATA_PATHS.map((path) => fetchJson(path)),
        fetchJson(METADATA_PATH)
      ]);
      const metadataResult = results[results.length - 1];
      const profiles = mergeProfileResults(results.slice(0, -1));
      const profile = profiles.find((entry) => normaliseSlug(entry?.slug) === slug);
      if (!profile) return;

      const archiveMap = metadataResult.status === "fulfilled"
        ? buildPublisherArchiveMap(metadataResult.value)
        : new Map();

      insertProfile(profile, archiveMap);
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