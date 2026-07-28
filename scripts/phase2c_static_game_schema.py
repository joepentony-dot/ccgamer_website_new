#!/usr/bin/env python3
"""Apply bounded Phase 2C static VideoGame and BreadcrumbList schema."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

from phase0_site_audit import ROOT

GENERATOR = ROOT / "scripts" / "generate-slug-pages.js"
GAMES_JSON = ROOT / "games" / "games.json"
OUTPUT_DIR = ROOT / "docs" / "seo-baseline"
JSON_REPORT = OUTPUT_DIR / "phase-2c-static-game-schema.json"
MD_REPORT = OUTPUT_DIR / "phase-2c-static-game-schema.md"
EXPECTED_GAME_COUNT = 651

JSONLD_RE = re.compile(
    r"<script\b[^>]*type\s*=\s*([\"'])application/ld\+json\1[^>]*>(.*?)</script\s*>",
    re.I | re.S,
)
GAME_SCHEMA_RE = re.compile(
    r"^[ \t]*<script\b(?=[^>]*type\s*=\s*([\"'])application/ld\+json\1)"
    r"(?=[^>]*data-ccg-schema\s*=\s*([\"'])game-graph\2)[^>]*>.*?</script>[ \t]*\n?",
    re.I | re.M | re.S,
)

PROTECTED_FILES = [
    "games/games.json",
    "games/game.html",
    "js/load-single-game.js",
    "index.html",
    "home.html",
    "complete-index.html",
    "resources/css/intro.css",
    "js/index-intro.js",
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def replace_section(text: str, start: str, end: str, replacement: str, label: str) -> str:
    start_index = text.find(start)
    end_index = text.find(end, start_index + len(start))
    if start_index < 0 or end_index < 0:
        raise RuntimeError(f"Unable to locate {label} boundaries")
    return text[:start_index] + replacement.rstrip() + "\n\n" + text[end_index:]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    old_count = text.count(old)
    new_count = text.count(new)
    if old_count == 1 and new_count == 0:
        return text.replace(old, new, 1)
    if old_count == 0 and new_count == 1:
        return text
    raise RuntimeError(
        f"Unexpected {label} state: old occurrences={old_count}, new occurrences={new_count}"
    )


def load_games() -> list[dict]:
    payload = json.loads(GAMES_JSON.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise RuntimeError("games/games.json must contain a top-level array")
    return payload


def game_slug(game: dict) -> str:
    return str(game.get("slug") or "").strip()


def canonical_path(slug: str) -> Path:
    return ROOT / "games" / slug / "index.html"


def redirect_path(slug: str) -> Path:
    return ROOT / "games" / f"{slug}.html"


def strip_game_schema(html: str) -> str:
    return GAME_SCHEMA_RE.sub("", html)


def parse_schema(path: Path) -> list[dict]:
    html = path.read_text(encoding="utf-8", errors="ignore")
    payloads: list[dict] = []
    for _, block in JSONLD_RE.findall(html):
        payload = json.loads(block.strip())
        if isinstance(payload, dict):
            payloads.append(payload)
    return payloads


def flatten(payload: dict) -> list[dict]:
    values = [payload]
    graph = payload.get("@graph")
    if isinstance(graph, list):
        values.extend(item for item in graph if isinstance(item, dict))
    return values


def typed_objects(path: Path, schema_type: str) -> list[dict]:
    objects: list[dict] = []
    for payload in parse_schema(path):
        for item in flatten(payload):
            value = item.get("@type")
            types = value if isinstance(value, list) else [value]
            if schema_type in types:
                objects.append(item)
    return objects


def update_generator() -> bool:
    original = GENERATOR.read_text(encoding="utf-8")
    text = original

    text = replace_once(
        text,
        'const RESERVED_GAME_DIRS = new Set(["collections", "genres"]);',
        'const RESERVED_GAME_DIRS = new Set(["collections", "genres"]);\nconst REMOVE_STALE_GAME_OUTPUTS = process.env.CCG_REMOVE_STALE_GAME_OUTPUTS === "1";',
        "stale-output safety flag",
    )

    expected_artifacts = r'''function getExpectedPageArtifacts(game, slug, validation, canonicalPath) {
    const title = stripHtml(game.title || "Game");
    const platformLong = detectPlatform(game);
    const schemaDescription = buildDescription(game, title, platformLong);
    const existingHtml = fs.existsSync(canonicalPath)
        ? fs.readFileSync(canonicalPath, "utf8")
        : "";
    const fallbackDescription = `${title} on ${platformLong} — screenshots, manual, downloads and video.`;

    return {
        title,
        description: fallbackDescription,
        canonicalHtml: buildCanonicalHtml({
            slug,
            game,
            title,
            schemaDescription,
            canonicalUrl: validation.canonicalUrl,
            ogImage: validation.ogImage,
            platformLong,
            existingHtml
        }),
        redirectStubHtml: buildRedirectStubHtml(
            slug,
            validation.canonicalUrl,
            title,
            fallbackDescription
        )
    };
}'''
    text = replace_section(
        text,
        "function getExpectedPageArtifacts(",
        "function getCanonicalRewriteReason(",
        expected_artifacts,
        "expected page artifacts",
    )

    redirect_reason = r'''function getRedirectStubRewriteReason(filePath, _expectedHtml) {
    if (!fs.existsSync(filePath)) return "missing redirect stub";
    return "";
}'''
    text = replace_section(
        text,
        "function getRedirectStubRewriteReason(",
        "function toTokenList(",
        redirect_reason,
        "redirect-stub policy",
    )

    videogame_builder = r'''function buildVideoGameSchema({
    game,
    title,
    description,
    canonicalUrl,
    ogImage,
    year,
    platformLong
}) {
    const schema = {
        "@type": "VideoGame",
        "@id": `${canonicalUrl}#game`,
        name: title,
        description,
        url: canonicalUrl
    };

    if (String(year || "").trim()) schema.datePublished = String(year).trim();
    if (String(platformLong || "").trim()) schema.gamePlatform = String(platformLong).trim();

    const genres = toTokenList(game?.genres);
    if (genres.length === 1) schema.genre = genres[0];
    if (genres.length > 1) schema.genre = genres;

    const publisherName = firstNonEmpty([
        ...(Array.isArray(game?.credits?.publisher)
            ? game.credits.publisher
            : [game?.credits?.publisher]),
        game?.publisher
    ]);
    if (publisherName) {
        schema.publisher = {
            "@type": "Organization",
            name: publisherName
        };
    }

    if (String(ogImage || "").trim()) schema.image = ogImage;
    return schema;
}'''
    text = replace_section(
        text,
        "function buildVideoGameSchema(",
        "function buildVideoObjectSchema(",
        videogame_builder,
        "VideoGame builder",
    )

    breadcrumb_graph = r'''function buildBreadcrumbSchema({ canonicalUrl, title }) {
    return {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
            {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: SITE_ROOT
            },
            {
                "@type": "ListItem",
                position: 2,
                name: "Games",
                item: `${SITE_ROOT}/games/`
            },
            {
                "@type": "ListItem",
                position: 3,
                name: title,
                item: canonicalUrl
            }
        ]
    };
}

function buildGameSchemaGraph(args) {
    return {
        "@context": "https://schema.org",
        "@graph": [
            buildVideoGameSchema(args),
            buildBreadcrumbSchema(args)
        ]
    };
}

function serializeSchemaForHtml(schema) {
    return JSON.stringify(schema)
        .replace(/</g, "\\u003c")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}'''
    text = replace_section(
        text,
        "function buildBreadcrumbSchema(",
        "function buildCanonicalHtml(",
        breadcrumb_graph,
        "breadcrumb and graph builders",
    )

    canonical_builder = r'''function buildCanonicalHtml({
    slug,
    game,
    title,
    schemaDescription,
    canonicalUrl,
    ogImage,
    platformLong,
    existingHtml
}) {
    const gameId = String(game?.id || toGameId(slug)).trim();
    const target = `/games/game.html?id=${gameId}`;
    const schemaJson = serializeSchemaForHtml(buildGameSchemaGraph({
        game,
        title,
        description: schemaDescription,
        canonicalUrl,
        ogImage,
        year: game?.year,
        platformLong
    }));
    const schemaScript = `    <script type="application/ld+json" data-ccg-schema="game-graph">${schemaJson}</script>`;
    const current = String(existingHtml || "");

    if (current.trim()) {
        const existingSchema = /^[ \t]*<script\b(?=[^>]*type\s*=\s*(["'])application\/ld\+json\1)(?=[^>]*data-ccg-schema\s*=\s*(["'])game-graph\2)[^>]*>.*?<\/script>[ \t]*$/im;
        if (existingSchema.test(current)) {
            return current.replace(existingSchema, schemaScript);
        }
        const charset = /<meta charset=(["'])UTF-8\1\s*\/>/i;
        if (charset.test(current)) {
            return current.replace(charset, `${schemaScript}\n$&`);
        }
        return current.replace(/<\/head>/i, `${schemaScript}\n</head>`);
    }

    const metaDescription = `${title} on ${platformLong} — screenshots, manual, downloads and video.`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <title>${escapeHtml(title)} | Cheeky Commodore Gamer</title>
    <meta name="description" content="${escapeHtml(metaDescription)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Cheeky Commodore Gamer">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:title" content="${escapeHtml(title)} | Cheeky Commodore Gamer">
    <meta property="og:description" content="${escapeHtml(metaDescription)}">
    <meta property="og:image" content="${escapeHtml(ogImage)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)} | Cheeky Commodore Gamer">
    <meta name="twitter:description" content="${escapeHtml(metaDescription)}">
    <meta name="twitter:image" content="${escapeHtml(ogImage)}">
    <meta name="twitter:url" content="${escapeHtml(canonicalUrl)}">
${schemaScript}
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="/js/analytics.js"></script>
    <meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">

    <style>
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: #000;
            overflow: hidden;
        }
    </style>

    <script>
        (function () {
            if (typeof window !== "undefined") {
                window.location.replace("${escapeHtml(target)}");
            }
        })();
    </script>
</head>
<body></body>
</html>
`;
}'''
    text = replace_section(
        text,
        "function buildCanonicalHtml(",
        "function writeTextFileIfChanged(",
        canonical_builder,
        "canonical HTML builder",
    )

    text = replace_once(
        text,
        "        const expected = getExpectedPageArtifacts(game, slug, validation);",
        "        const expected = getExpectedPageArtifacts(game, slug, validation, canonicalPath);",
        "canonical wrapper input",
    )
    text = replace_once(
        text,
        "        if (writeTextFileIfChanged(item.redirectStubPath, item.redirectStubHtml)) {",
        "        if (item.redirectStubReason && writeTextFileIfChanged(item.redirectStubPath, item.redirectStubHtml)) {",
        "redirect-stub write guard",
    )
    text = replace_once(
        text,
        "        stale: findStaleGameOutputs(new Set(gamesBySlug.keys()))",
        "        stale: REMOVE_STALE_GAME_OUTPUTS ? findStaleGameOutputs(new Set(gamesBySlug.keys())) : []",
        "stale-output removal guard",
    )

    if text == original:
        return False
    GENERATOR.write_text(text, encoding="utf-8")
    return True


def run(*parts: str) -> None:
    subprocess.run(list(parts), cwd=ROOT, check=True)


def main() -> None:
    games = load_games()
    slugs = [game_slug(game) for game in games]
    if len(games) != EXPECTED_GAME_COUNT or len(set(slugs)) != EXPECTED_GAME_COUNT:
        raise RuntimeError(
            f"Expected {EXPECTED_GAME_COUNT} unique games, found records={len(games)} unique_slugs={len(set(slugs))}"
        )
    if any(not slug for slug in slugs):
        raise RuntimeError("A game record is missing its slug")

    canonical_files = [canonical_path(slug) for slug in slugs]
    redirect_files = [redirect_path(slug) for slug in slugs]
    missing = [
        path.relative_to(ROOT).as_posix()
        for path in canonical_files + redirect_files
        if not path.exists()
    ]
    if missing:
        raise RuntimeError(f"Missing expected game outputs: {missing[:20]}")

    before_video_games = sum(len(typed_objects(path, "VideoGame")) for path in canonical_files)
    before_breadcrumbs = sum(len(typed_objects(path, "BreadcrumbList")) for path in canonical_files)
    if before_video_games != 0 or before_breadcrumbs != 0:
        raise RuntimeError(
            f"Unexpected Phase 2C baseline: VideoGame={before_video_games}, BreadcrumbList={before_breadcrumbs}"
        )

    wrapper_before = {
        path.relative_to(ROOT).as_posix(): strip_game_schema(path.read_text(encoding="utf-8"))
        for path in canonical_files
    }
    redirects_before = {
        path.relative_to(ROOT).as_posix(): sha256(path)
        for path in redirect_files
    }
    protected_before = {
        relative: sha256(ROOT / relative)
        for relative in PROTECTED_FILES
    }

    generator_changed = update_generator()
    run("node", "--check", "scripts/generate-slug-pages.js")
    run("node", "scripts/generate-slug-pages.js")

    wrapper_changes = []
    for path in canonical_files:
        relative = path.relative_to(ROOT).as_posix()
        after_without_schema = strip_game_schema(path.read_text(encoding="utf-8"))
        if after_without_schema != wrapper_before[relative]:
            wrapper_changes.append(relative)
    if wrapper_changes:
        raise RuntimeError(
            f"Phase 2C changed non-schema wrapper content: {wrapper_changes[:20]}"
        )

    redirect_changes = sorted(
        relative
        for relative, before_hash in redirects_before.items()
        if sha256(ROOT / relative) != before_hash
    )
    if redirect_changes:
        raise RuntimeError(f"Phase 2C altered legacy redirect stubs: {redirect_changes[:20]}")

    protected_changes = sorted(
        relative
        for relative, before_hash in protected_before.items()
        if sha256(ROOT / relative) != before_hash
    )
    if protected_changes:
        raise RuntimeError(f"Protected files changed: {protected_changes}")

    failures: list[dict] = []
    games_by_slug = {game_slug(game): game for game in games}
    for slug, path in zip(slugs, canonical_files):
        html = path.read_text(encoding="utf-8", errors="ignore")
        if html.count('data-ccg-schema="game-graph"') != 1:
            failures.append({"slug": slug, "issue": "schema marker count is not one"})
            continue

        payloads = parse_schema(path)
        if len(payloads) != 1:
            failures.append({"slug": slug, "issue": f"expected one JSON-LD block, found {len(payloads)}"})
            continue
        payload = payloads[0]
        graph = payload.get("@graph")
        if payload.get("@context") != "https://schema.org" or not isinstance(graph, list):
            failures.append({"slug": slug, "issue": "missing Schema.org @graph"})
            continue

        video_games = [item for item in graph if isinstance(item, dict) and item.get("@type") == "VideoGame"]
        breadcrumbs = [item for item in graph if isinstance(item, dict) and item.get("@type") == "BreadcrumbList"]
        videos = [item for item in graph if isinstance(item, dict) and item.get("@type") == "VideoObject"]
        if len(video_games) != 1 or len(breadcrumbs) != 1 or videos:
            failures.append({
                "slug": slug,
                "issue": f"graph types VideoGame={len(video_games)} BreadcrumbList={len(breadcrumbs)} VideoObject={len(videos)}",
            })
            continue

        game = games_by_slug[slug]
        canonical = f"https://www.cheekycommodoregamer.co.uk/games/{slug}/"
        video_game = video_games[0]
        breadcrumb = breadcrumbs[0]
        expected_title = str(game.get("title") or "").strip()

        if video_game.get("name") != expected_title:
            failures.append({"slug": slug, "issue": "VideoGame name mismatch"})
        if video_game.get("url") != canonical or video_game.get("@id") != f"{canonical}#game":
            failures.append({"slug": slug, "issue": "VideoGame canonical identity mismatch"})
        if not str(video_game.get("description") or "").strip():
            failures.append({"slug": slug, "issue": "VideoGame description missing"})
        if not str(video_game.get("image") or "").startswith("https://"):
            failures.append({"slug": slug, "issue": "VideoGame image is not absolute"})
        if video_game.get("aggregateRating") or video_game.get("review") or video_game.get("author"):
            failures.append({"slug": slug, "issue": "unsupported rating, review or author field emitted"})

        items = breadcrumb.get("itemListElement")
        if not isinstance(items, list) or [item.get("position") for item in items] != [1, 2, 3]:
            failures.append({"slug": slug, "issue": "breadcrumb positions invalid"})
        elif items[-1].get("name") != expected_title or items[-1].get("item") != canonical:
            failures.append({"slug": slug, "issue": "breadcrumb final item mismatch"})

    if failures:
        raise RuntimeError(json.dumps(failures[:50], indent=2, ensure_ascii=False))

    run("python", "scripts/validate_structured_data.py")

    summary = {
        "canonical_game_pages": EXPECTED_GAME_COUNT,
        "video_game_objects_before": 0,
        "video_game_objects_after": EXPECTED_GAME_COUNT,
        "breadcrumb_objects_before": 0,
        "breadcrumb_objects_after": EXPECTED_GAME_COUNT,
        "video_object_objects_added": 0,
        "non_schema_wrapper_changes": len(wrapper_changes),
        "legacy_redirect_changes": len(redirect_changes),
        "protected_file_changes": len(protected_changes),
        "generator_changed_this_run": generator_changed,
    }
    report = {
        "summary": summary,
        "schema_policy": {
            "format": "single Schema.org @graph per canonical game page",
            "types": ["VideoGame", "BreadcrumbList"],
            "excluded": ["VideoObject", "AggregateRating", "Review", "author"],
            "video_reason": "No verified upload dates are stored in games.json.",
        },
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    JSON_REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    MD_REPORT.write_text(
        f"""# Phase 2C Static Game and Breadcrumb Schema

Phase 2C connects the existing game-page generator to conservative static Schema.org markup without rebuilding existing wrapper metadata.

## Results

| Check | Before | After |
|---|---:|---:|
| Canonical game pages | **{EXPECTED_GAME_COUNT}** | **{EXPECTED_GAME_COUNT}** |
| Pages with static `VideoGame` | **0** | **{EXPECTED_GAME_COUNT}** |
| Pages with static `BreadcrumbList` | **0** | **{EXPECTED_GAME_COUNT}** |
| Static `VideoObject` entries added | **0** | **0** |
| Non-schema wrapper content changed | — | **0** |
| Legacy redirect stubs changed | — | **0** |
| Protected files changed | — | **0** |

## Schema format

Each canonical `/games/<slug>/` wrapper now contains one marked JSON-LD block with a Schema.org `@graph` containing one `VideoGame` and one three-level `BreadcrumbList`.

The graph uses facts already stored in `games/games.json`: title, description, year, platform, genres, publisher and thumbnail.

## Preservation method

The generator injects or replaces only the marked schema block inside an existing canonical wrapper. All titles, descriptions, canonical links, Open Graph fields, Twitter fields, redirect targets and existing encoding are retained byte-for-byte outside that block.

## Deliberate exclusions

- No `VideoObject` is emitted because verified upload dates are not stored.
- No `AggregateRating` is emitted from a single editorial score.
- No `author` is inferred from the publisher.
- Existing `.html` game redirects are unchanged.
- `games/games.json`, the dynamic game shell, homepage and intro-loader stack are unchanged.

## Permanent validation

The structured-data workflow regenerates both retro pages and canonical game wrappers in a temporary workspace, validates the resulting JSON-LD, checks generator scope and requires committed outputs to remain current.

## Rollback

Revert the Phase 2C squash merge commit.
""",
        encoding="utf-8",
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
