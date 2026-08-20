#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const START_MARKER = "<!-- CCG STATIC GENRE FALLBACK START -->";
const END_MARKER = "<!-- CCG STATIC GENRE FALLBACK END -->";
const DEFAULT_LIMIT = 16;

function readArg(argv, name, fallback) {
  const index = argv.indexOf(name);
  if (index === -1 || !argv[index + 1]) return fallback;
  return argv[index + 1];
}

function resolveRoot(argv = process.argv.slice(2)) {
  const supplied = readArg(argv, "--root", process.env.CCG_REPO_ROOT || path.resolve(__dirname, ".."));
  return path.resolve(supplied);
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, maxLength = 160) {
  const text = stripHtml(value);
  if (text.length <= maxLength) return text;
  let body = text.slice(0, Math.max(1, maxLength - 1));
  const lastSpace = body.lastIndexOf(" ");
  if (lastSpace > 80) body = body.slice(0, lastSpace);
  return `${body.replace(/[\s,;:–—-]+$/g, "")}…`;
}

function normalizeRoute(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw === "/") return "/";
  if (raw.includes("?")) return raw;
  const pathname = raw.split("#")[0].split("?")[0];
  if (pathname.endsWith(".html")) return pathname.startsWith("/") ? pathname : `/${pathname}`;
  const withSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
}

function loadPlan(root) {
  const planPath = path.join(root, "data", "seo-opportunity-targets.json");
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  if (!plan || !Array.isArray(plan.targets)) {
    throw new Error("data/seo-opportunity-targets.json must contain a targets array.");
  }
  return plan;
}

function effectiveRoute(target) {
  return normalizeRoute(target.canonicalTarget || target.observedRoute);
}

function actionsForRoute(plan, route) {
  const normalized = normalizeRoute(route);
  const actions = new Set();
  for (const target of plan.targets) {
    if (effectiveRoute(target) !== normalized) continue;
    for (const action of target.actions || []) actions.add(action);
  }
  return actions;
}

function scoreTarget(target) {
  const actions = new Set(target.actions || []);
  let score = 0;
  if (actions.has("improveSnippet")) score += 500;
  if (actions.has("strengthenRelevance")) score += 400;
  if (actions.has("investigateDecline")) score += 300;
  if (actions.has("reviewMixedSignal")) score += 250;
  if (actions.has("protectGrowth")) score += 100;
  if (actions.has("retireLegacy")) score -= 1000;
  return score;
}

function scoreRoute(plan, route) {
  const normalized = normalizeRoute(route);
  let score = 0;
  for (const target of plan.targets) {
    if (effectiveRoute(target) !== normalized) continue;
    score = Math.max(score, scoreTarget(target));
  }
  return score;
}

function routeToFile(root, route) {
  const normalized = normalizeRoute(route);
  if (!normalized || normalized === "/" || normalized.includes("?")) return null;
  if (normalized.endsWith(".html")) return path.join(root, normalized.slice(1));
  return path.join(root, normalized.slice(1), "index.html");
}

function replaceTitle(html, title) {
  if (!title || !/<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)) return html;
  return html.replace(
    /<title\b[^>]*>[\s\S]*?<\/title>/i,
    `<title>${htmlEscape(title)}</title>`
  );
}

function findMetaTag(html, attr, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attr}=(["'])${escaped}\\1)[^>]*>`, "i");
  return html.match(pattern)?.[0] || "";
}

function getMetaContent(html, attr, key) {
  const tag = findMetaTag(html, attr, key);
  if (!tag) return "";
  const match = tag.match(/\bcontent=(["'])([\s\S]*?)\1/i);
  return match ? stripHtml(match[2]) : "";
}

function setMetaContent(html, attr, key, content) {
  if (!content) return html;
  const tag = findMetaTag(html, attr, key);
  if (!tag) return html;
  const escaped = htmlEscape(content);
  const next = /\bcontent=(["'])[\s\S]*?\1/i.test(tag)
    ? tag.replace(/\bcontent=(["'])[\s\S]*?\1/i, `content="${escaped}"`)
    : tag.replace(/>$/, ` content="${escaped}">`);
  return html.replace(tag, next);
}

function buildDescription(html, target) {
  if (target.seoDescription) return truncate(target.seoDescription, 160);
  if (!target.descriptionLead) return "";
  const current = getMetaContent(html, "name", "description");
  const lead = stripHtml(target.descriptionLead);
  if (!current) return truncate(lead, 160);
  if (current.toLowerCase().startsWith(lead.toLowerCase())) return truncate(current, 160);

  let remainder = current
    .replace(/^[^—]{0,90}—\s*/, "")
    .replace(/^(released|published|developed)\b/i, (match) => match.toLowerCase());
  if (remainder.toLowerCase().includes(lead.toLowerCase())) return truncate(current, 160);
  return truncate(`${lead} ${remainder}`, 160);
}

function applyMetadata(html, target) {
  if (!target || target.protected) return html;
  const description = buildDescription(html, target);
  let output = html;
  if (target.seoTitle) {
    output = replaceTitle(output, target.seoTitle);
    output = setMetaContent(output, "property", "og:title", target.seoTitle);
    output = setMetaContent(output, "name", "twitter:title", target.seoTitle);
  }
  if (description) {
    output = setMetaContent(output, "name", "description", description);
    output = setMetaContent(output, "property", "og:description", description);
    output = setMetaContent(output, "name", "twitter:description", description);
  }
  return output;
}

function metadataTargets(plan) {
  const byRoute = new Map();
  for (const target of plan.targets) {
    const route = effectiveRoute(target);
    if (!route || target.protected) continue;
    if (!target.seoTitle && !target.seoDescription && !target.descriptionLead) continue;
    const existing = byRoute.get(route) || { observedRoute: route, actions: [] };
    byRoute.set(route, { ...existing, ...target, observedRoute: route });
  }
  return [...byRoute.values()];
}

function genreKeyFromFilename(filename) {
  return path.basename(filename, ".html")
    .toLowerCase()
    .replace(/-games$/, "")
    .replace(/-indexed$/, "")
    .replace(/-collection$/, "")
    .replace(/^genre-/, "")
    .trim();
}

function thumbnailPath(game) {
  const raw = String(game?.thumbnail || game?.thumb || game?.cover || "").trim();
  if (!raw) return "/resources/images/thumbnails/all/1942.jpg";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `/resources/images/thumbnails/all/${path.basename(raw.replace(/\\/g, "/"))}`;
}

function buildStaticCard(game) {
  const slug = String(game?.slug || "").trim();
  const title = htmlEscape(game?.title || "Unknown Game");
  const thumb = htmlEscape(thumbnailPath(game));
  const meta = [game?.year, game?.system, game?.developer]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map(htmlEscape)
    .join(" · ");
  const url = `/games/${encodeURIComponent(slug)}/`;

  return `                    <div class="ccg-game-card genre-card ccg-game-card--fallback" data-ccg-static-genre-fallback="true">
                        <a href="${url}" class="ccg-game-card__thumb">
                            <img src="${thumb}" srcset="${thumb} 320w" sizes="(max-width: 720px) 48vw, 320px" alt="${title}" loading="lazy" decoding="async" width="320" height="180">
                        </a>
                        <div class="ccg-game-card__body">
                            <div class="game-title-wrapper">
                                <h3 class="ccg-game-card__title">${title}</h3>
                                <div class="ccg-game-card__meta">${meta}</div>
                            </div>
                            <div class="ccg-game-card__actions">
                                <a href="${url}" class="ccg-btn ccg-btn--primary ccg-game-card__btn" aria-label="View ${title}">View ${title}</a>
                            </div>
                        </div>
                    </div>`;
}

function buildFallbackBlock(games) {
  const cards = games.map(buildStaticCard).join("\n");
  return `${START_MARKER}\n${cards}\n                    ${END_MARKER}`;
}

function prioritizeGenreFallbacks(root, plan, checkOnly) {
  const gamesPath = path.join(root, "games", "games.json");
  const genresDir = path.join(root, "games", "genres");
  if (!fs.existsSync(gamesPath) || !fs.existsSync(genresDir)) {
    return { checked: 0, changed: 0, supported: new Set() };
  }

  const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
  const supported = new Set();
  let checked = 0;
  let changed = 0;

  const files = fs.readdirSync(genresDir)
    .filter((name) => name.endsWith(".html") && name !== "index.html")
    .sort();

  for (const filename of files) {
    const filePath = path.join(genresDir, filename);
    const before = fs.readFileSync(filePath, "utf8");
    if (!before.includes(START_MARKER) || !before.includes(END_MARKER)) continue;

    const key = genreKeyFromFilename(filename);
    const matches = games
      .map((game, index) => ({ game, index }))
      .filter(({ game }) => Array.isArray(game?.genres) && game.genres.includes(key))
      .filter(({ game }) => String(game?.slug || "").trim())
      .sort((a, b) => {
        const scoreA = scoreRoute(plan, `/games/${a.game.slug}/`);
        const scoreB = scoreRoute(plan, `/games/${b.game.slug}/`);
        return scoreB - scoreA || a.index - b.index;
      })
      .slice(0, DEFAULT_LIMIT)
      .map(({ game }) => game);

    for (const game of matches) {
      if (scoreRoute(plan, `/games/${game.slug}/`) > 0) supported.add(game.slug);
    }

    const block = buildFallbackBlock(matches);
    const pattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`, "i");
    const after = before.replace(pattern, block);
    checked += 1;

    if (after !== before) {
      changed += 1;
      if (!checkOnly) fs.writeFileSync(filePath, after, "utf8");
    }
  }

  return { checked, changed, supported };
}

function validatePlan(plan) {
  const errors = [];
  const routes = new Set();
  const forbiddenMetricKeys = new Set([
    "clicks", "impressions", "position", "ctr", "extraClicks", "estimatedExtraClicks"
  ]);

  if (plan.targets.length !== 72) {
    errors.push(`Expected exactly 72 observed routes; found ${plan.targets.length}.`);
  }

  for (const target of plan.targets) {
    const route = String(target.observedRoute || "").trim();
    if (!route) errors.push("A target is missing observedRoute.");
    if (routes.has(route)) errors.push(`Duplicate observedRoute: ${route}`);
    routes.add(route);

    for (const key of Object.keys(target)) {
      if (forbiddenMetricKeys.has(key)) {
        errors.push(`${route || "unknown route"} stores forbidden Search Console metric field ${key}.`);
      }
    }

    if (route.includes("/music/composer.html?") && !target.canonicalTarget) {
      errors.push(`${route} must map to a canonical composer route.`);
    }
    if (route === "/" && target.protected !== true) {
      errors.push("The protected root route must remain explicitly protected.");
    }
    if (target.protected && (target.seoTitle || target.seoDescription || target.descriptionLead)) {
      errors.push(`${route} is protected but has metadata rewrite fields.`);
    }
  }

  const rootTarget = plan.targets.find((target) => target.observedRoute === "/");
  if (!rootTarget) errors.push("The root growth signal must be represented without touching index.html.");

  return errors;
}

function renderAudit(plan, metadataChanged, genreResult) {
  const counts = {};
  for (const target of plan.targets) {
    for (const action of target.actions || []) counts[action] = (counts[action] || 0) + 1;
  }
  const legacy = plan.targets.filter((target) => (target.actions || []).includes("retireLegacy"));
  const tuned = metadataTargets(plan);

  const lines = [
    "# SEO Opportunity Plan — 20 August 2026",
    "",
    "This file is generated from the public, metric-free opportunity plan. Search Console clicks, impressions, positions and CTR values are intentionally not stored in the repository.",
    "",
    "## Coverage",
    "",
    `- Observed non-legacy/opportunity routes represented: **${plan.targets.length}**`,
    `- Metadata-focused routes: **${tuned.length}**`,
    `- Legacy handlers mapped to canonical routes: **${legacy.length}**`,
    `- Genre fallback pages checked for opportunity-aware internal linking: **${genreResult.checked}**`,
    `- Metadata routes managed by the plan: **${tuned.length}**`,
    "",
    "## Action counts",
    ""
  ];
  for (const [action, count] of Object.entries(counts).sort()) {
    lines.push(`- ${action}: **${count}**`);
  }
  lines.push("", "## Route plan", "");
  for (const target of plan.targets) {
    const destination = target.canonicalTarget ? ` → ${target.canonicalTarget}` : "";
    const focus = target.focusPhrase ? ` — focus: ${target.focusPhrase}` : "";
    const protectedNote = target.protected ? " — protected, no file rewrite" : "";
    lines.push(`- \`${target.observedRoute}\`${destination}: ${(target.actions || []).join(", ")}${focus}${protectedNote}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function routeInScope(route, scope) {
  if (!scope || scope === "all") return true;
  if (scope === "retro") {
    return route.startsWith("/retro-events/") ||
      route.startsWith("/retro-specials/") ||
      route.startsWith("/amiga-demo-music/");
  }
  if (scope === "games") return route.startsWith("/games/");
  if (scope === "music") return route.startsWith("/music/");
  throw new Error(`Unknown SEO opportunity scope: ${scope}`);
}

function run(options = {}) {
  const root = path.resolve(options.root || resolveRoot());
  const checkOnly = options.checkOnly === true;
  const scope = options.scope || "all";
  const plan = loadPlan(root);
  const planErrors = validatePlan(plan);
  if (planErrors.length) {
    throw new Error(`SEO opportunity plan validation failed:\n- ${planErrors.join("\n- ")}`);
  }

  let metadataChanged = 0;
  let metadataChecked = 0;
  const missing = [];

  for (const target of metadataTargets(plan)) {
    if (!routeInScope(target.observedRoute, scope)) continue;
    const filePath = routeToFile(root, target.observedRoute);
    if (!filePath) continue;
    if (!fs.existsSync(filePath)) {
      missing.push(target.observedRoute);
      continue;
    }
    const before = fs.readFileSync(filePath, "utf8");
    const after = applyMetadata(before, target);
    metadataChecked += 1;
    if (after !== before) {
      metadataChanged += 1;
      if (!checkOnly) fs.writeFileSync(filePath, after, "utf8");
    }
  }

  if (missing.length) {
    throw new Error(`Metadata target files are missing:\n- ${missing.join("\n- ")}`);
  }

  const genreResult = scope === "all"
    ? prioritizeGenreFallbacks(root, plan, checkOnly)
    : { checked: 0, changed: 0, supported: new Set() };
  const auditPath = path.join(root, "docs", "seo-baseline", "seo-opportunity-plan-2026-08-20.md");
  const audit = scope === "all" ? renderAudit(plan, metadataChanged, genreResult) : "";
  const previousAudit = scope === "all" && fs.existsSync(auditPath) ? fs.readFileSync(auditPath, "utf8") : "";
  const auditChanged = scope === "all" ? audit !== previousAudit : false;
  if (auditChanged && !checkOnly) {
    fs.mkdirSync(path.dirname(auditPath), { recursive: true });
    fs.writeFileSync(auditPath, audit, "utf8");
  }

  return {
    root,
    targets: plan.targets.length,
    metadataChecked,
    metadataChanged,
    genrePagesChecked: genreResult.checked,
    genrePagesChanged: genreResult.changed,
    supportedGameTargets: genreResult.supported.size,
    auditChanged,
    stale: metadataChanged > 0 || genreResult.changed > 0 || auditChanged,
  };
}

function main(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const root = resolveRoot(argv);
  const scope = readArg(argv, "--scope", "all");
  const result = run({ root, checkOnly, scope });
  console.log(`[seo-opportunities] Targets represented: ${result.targets}`);
  console.log(`[seo-opportunities] Metadata targets checked: ${result.metadataChecked}`);
  console.log(`[seo-opportunities] Metadata files ${checkOnly ? "stale" : "updated"}: ${result.metadataChanged}`);
  console.log(`[seo-opportunities] Genre pages checked: ${result.genrePagesChecked}`);
  console.log(`[seo-opportunities] Genre pages ${checkOnly ? "stale" : "updated"}: ${result.genrePagesChanged}`);
  console.log(`[seo-opportunities] Opportunity game slugs represented in priority fallback cards: ${result.supportedGameTargets}`);
  if (checkOnly && result.stale) {
    console.error("[seo-opportunities] Generated opportunity output is stale. Run node scripts/apply-seo-opportunity-plan.js.");
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[seo-opportunities] ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  START_MARKER,
  END_MARKER,
  DEFAULT_LIMIT,
  actionsForRoute,
  applyMetadata,
  buildDescription,
  buildStaticCard,
  effectiveRoute,
  genreKeyFromFilename,
  htmlEscape,
  loadPlan,
  metadataTargets,
  normalizeRoute,
  prioritizeGenreFallbacks,
  routeInScope,
  routeToFile,
  run,
  scoreRoute,
  scoreTarget,
  truncate,
  validatePlan,
};
