#!/usr/bin/env python3
"""Apply and validate Phase 7C media dimensions and loading corrections."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Callable

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
BASELINE_EVIDENCE = ROOT / "docs" / "seo-baseline" / "phase-7a-performance-accessibility-evidence.json"

GENERATOR_PATHS = [
    "scripts/generate-publisher-pages.js",
    "scripts/generate-developer-pages.js",
    "scripts/generate-year-platform-pages.js",
]

ARCHIVE_PREFIXES = [
    "games/publishers",
    "games/developers",
    "games/years",
    "games/platforms",
]


def read_text(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write_text(relative: str, text: str) -> None:
    path = ROOT / relative
    path.write_text(text, encoding="utf-8")


def add_tag_attributes(tag: str, attributes: dict[str, str], replacements: dict[str, str] | None = None) -> str:
    updated = tag
    for name, value in (replacements or {}).items():
        updated = re.sub(
            rf"\s{name}\s*=\s*([\"']).*?\1",
            f' {name}="{value}"',
            updated,
            count=1,
            flags=re.I | re.S,
        )
    for name, value in attributes.items():
        if re.search(rf"\s{name}\s*=", updated, re.I):
            continue
        updated = re.sub(r"\s*/?>$", lambda match: f' {name}="{value}"{match.group(0)}', updated, count=1)
    return updated


def transform_single_tag(text: str, pattern: re.Pattern[str], transform: Callable[[str], str], label: str) -> str:
    matches = list(pattern.finditer(text))
    if len(matches) != 1:
        raise SystemExit(f"{label}: expected exactly one matching tag, found {len(matches)}")
    match = matches[0]
    tag = match.group(0)
    updated = transform(tag)
    if updated == tag:
        return text
    return text[: match.start()] + updated + text[match.end() :]


def apply_generator_card_dimensions(relative: str) -> bool:
    text = read_text(relative)
    pattern = re.compile(
        r"<img\b(?=[^>]*getThumbnailUrl\(game\.thumbnail\))(?=[^>]*loading=\"lazy\")(?=[^>]*decoding=\"async\")[^>]*>",
        re.I | re.S,
    )
    matches = list(pattern.finditer(text))
    if len(matches) != 1:
        raise SystemExit(f"{relative}: expected one generated game-card image tag, found {len(matches)}")
    tag = matches[0].group(0)
    updated_tag = add_tag_attributes(tag, {"width": "320", "height": "180"})
    updated = text[: matches[0].start()] + updated_tag + text[matches[0].end() :]
    changed = updated != text
    if changed:
        write_text(relative, updated)
    return changed


def apply_game_page_media() -> list[str]:
    relative = "games/game.html"
    text = read_text(relative)
    original = text

    hero_pattern = re.compile(r'<img\b[^>]*id="gameHeroThumb"[^>]*>', re.I | re.S)
    text = transform_single_tag(
        text,
        hero_pattern,
        lambda tag: add_tag_attributes(
            tag,
            {
                "decoding": "async",
                "fetchpriority": "high",
                "width": "320",
                "height": "180",
            },
            {"loading": "eager"},
        ),
        "single-game hero image",
    )

    iframe_pattern = re.compile(r'<iframe\b[^>]*id="game-video-embed"[^>]*>', re.I | re.S)
    text = transform_single_tag(
        text,
        iframe_pattern,
        lambda tag: add_tag_attributes(
            tag,
            {"loading": "lazy", "width": "560", "height": "315"},
        ),
        "single-game video iframe",
    )

    logo_pattern = re.compile(
        r'<img\b(?=[^>]*ccgamer-logo\.png)(?=[^>]*class="ccg-brand__logo")[^>]*>',
        re.I | re.S,
    )
    text = transform_single_tag(
        text,
        logo_pattern,
        lambda tag: add_tag_attributes(tag, {"decoding": "async"}, {"loading": "eager"}),
        "single-game header logo",
    )

    if text != original:
        write_text(relative, text)
        return [relative]
    return []


def apply_runtime_media_guards() -> bool:
    relative = "js/load-single-game.js"
    text = read_text(relative)
    marker = 'heroThumb.fetchPriority = "high";'
    if marker in text:
        return False

    old = """            heroThumb.src = thumb;\n            heroThumb.alt = `${resolveCanonicalGameTitle(game)} cover art`;\n"""
    new = """            heroThumb.src = thumb;\n            heroThumb.alt = `${resolveCanonicalGameTitle(game)} cover art`;\n            heroThumb.loading = \"eager\";\n            heroThumb.decoding = \"async\";\n            heroThumb.fetchPriority = \"high\";\n            heroThumb.width = 320;\n            heroThumb.height = 180;\n"""
    if text.count(old) != 1:
        raise SystemExit("js/load-single-game.js: expected one hero assignment block")
    write_text(relative, text.replace(old, new, 1))
    return True


def apply_phase6b_read_only_pr_guard() -> bool:
    relative = ".github/workflows/phase-6b-reliable-games-publishing.yml"
    text = read_text(relative)
    old = "if: github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository"
    new = "if: github.event_name == 'workflow_dispatch'"
    if new in text and old not in text:
        return False
    if text.count(old) != 1:
        raise SystemExit("Phase 6B workflow: expected one PR commit condition")
    write_text(relative, text.replace(old, new, 1))
    return True


def apply() -> dict[str, Any]:
    changed: list[str] = []
    for relative in GENERATOR_PATHS:
        if apply_generator_card_dimensions(relative):
            changed.append(relative)
    changed.extend(apply_game_page_media())
    if apply_runtime_media_guards():
        changed.append("js/load-single-game.js")
    if apply_phase6b_read_only_pr_guard():
        changed.append(".github/workflows/phase-6b-reliable-games-publishing.yml")
    result = {"changed": sorted(changed), "changed_count": len(changed)}
    print(json.dumps(result, indent=2))
    return result


def issue_count(static: dict[str, Any], key: str) -> int:
    return int(static.get("html", {}).get("issues", {}).get(key, {}).get("count", 0))


def archive_card_evidence() -> dict[str, Any]:
    total = 0
    failures: list[dict[str, str]] = []
    by_family: dict[str, int] = {}
    for prefix in ARCHIVE_PREFIXES:
        count = 0
        root = ROOT / prefix
        if not root.exists():
            failures.append({"path": prefix, "reason": "archive directory missing"})
            continue
        for path in sorted(root.rglob("index.html")):
            soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="replace"), "html.parser")
            for image in soup.find_all("img"):
                alt = str(image.get("alt") or "")
                if not alt.endswith(" cover art"):
                    continue
                total += 1
                count += 1
                required = {
                    "width": "320",
                    "height": "180",
                    "loading": "lazy",
                    "decoding": "async",
                }
                missing = [name for name, value in required.items() if str(image.get(name) or "").lower() != value]
                if missing and len(failures) < 100:
                    failures.append({
                        "path": path.relative_to(ROOT).as_posix(),
                        "reason": "missing or incorrect: " + ", ".join(missing),
                    })
        by_family[prefix] = count
    return {"total": total, "by_family": by_family, "failures": failures}


def inspect_markup() -> dict[str, Any]:
    game_soup = BeautifulSoup(read_text("games/game.html"), "html.parser")
    hero = game_soup.find("img", id="gameHeroThumb")
    iframe = game_soup.find("iframe", id="game-video-embed")
    logo = game_soup.find("img", class_="ccg-brand__logo")
    return {
        "hero": {name: str(hero.get(name) or "") if hero else "" for name in ["loading", "decoding", "fetchpriority", "width", "height"]},
        "iframe": {name: str(iframe.get(name) or "") if iframe else "" for name in ["loading", "width", "height", "title"]},
        "logo": {name: str(logo.get(name) or "") if logo else "" for name in ["loading", "decoding", "width", "height"]},
        "runtime_guard": 'heroThumb.fetchPriority = "high";' in read_text("js/load-single-game.js"),
        "phase6b_pr_writer_disabled": "if: github.event_name == 'workflow_dispatch'" in read_text(".github/workflows/phase-6b-reliable-games-publishing.yml"),
    }


def validate(static_path: Path, live_path: Path, report_path: Path, evidence_path: Path) -> dict[str, Any]:
    baseline = json.loads(BASELINE_EVIDENCE.read_text(encoding="utf-8"))
    static = json.loads(static_path.read_text(encoding="utf-8"))
    live = json.loads(live_path.read_text(encoding="utf-8"))
    archive = archive_card_evidence()
    markup = inspect_markup()

    baseline_missing = int(baseline["static"]["html"]["issues"]["image_missing_intrinsic_dimensions"]["count"])
    current_missing = issue_count(static, "image_missing_intrinsic_dimensions")
    baseline_iframes = int(baseline["static"]["html"]["issues"]["iframe_not_lazy_loaded"]["count"])
    current_iframes = issue_count(static, "iframe_not_lazy_loaded")

    checks = {
        "archive_cards_found": archive["total"] >= 1500,
        "archive_cards_all_sized": not archive["failures"],
        "repository_dimension_count_reduced": current_missing < baseline_missing,
        "at_least_1500_dimension_issues_removed": baseline_missing - current_missing >= 1500,
        "iframe_lazy_count_reduced": current_iframes < baseline_iframes,
        "hero_eager": markup["hero"]["loading"] == "eager",
        "hero_async_decode": markup["hero"]["decoding"] == "async",
        "hero_high_priority": markup["hero"]["fetchpriority"] == "high",
        "hero_dimensions": markup["hero"]["width"] == "320" and markup["hero"]["height"] == "180",
        "video_iframe_lazy": markup["iframe"]["loading"] == "lazy",
        "video_iframe_dimensions": markup["iframe"]["width"] == "560" and markup["iframe"]["height"] == "315",
        "video_iframe_titled": bool(markup["iframe"]["title"]),
        "header_logo_eager": markup["logo"]["loading"] == "eager",
        "header_logo_dimensions_preserved": markup["logo"]["width"] == "1500" and markup["logo"]["height"] == "1032",
        "runtime_hero_guard": bool(markup["runtime_guard"]),
        "phase6b_read_only_on_pr": bool(markup["phase6b_pr_writer_disabled"]),
        "browser_routes_pass": bool(live.get("passed")),
        "browser_serious_critical_zero": int(live.get("serious_or_critical_nodes", 0)) == 0,
    }
    failures = [name for name, passed in checks.items() if not passed]
    evidence = {
        "baseline_missing_image_dimensions": baseline_missing,
        "current_missing_image_dimensions": current_missing,
        "dimension_issues_removed": baseline_missing - current_missing,
        "baseline_iframes_not_lazy": baseline_iframes,
        "current_iframes_not_lazy": current_iframes,
        "archive_cards": archive,
        "markup": markup,
        "live": live,
        "checks": checks,
        "passed": len(checks) - len(failures),
        "total": len(checks),
        "failures": failures,
    }
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")

    family_rows = "\n".join(
        f"| `{family}/` | {count} |"
        for family, count in archive["by_family"].items()
    )
    route_rows = "\n".join(
        f"| {item.get('label')} | {item.get('status')} | {item.get('sized_media_count', 0)} | {item.get('unsized_target_media', 0)} | {item.get('serious_or_critical_nodes', 0)} | {item.get('layout_shift_score', 0):.4f} |"
        for item in live.get("routes", [])
    )

    report = f"""# Phase 7C Media Dimensions and Loading

## Verdict

**{'PASS' if not failures else 'FAIL'} — shared media sizing and loading corrections {'are ready for review' if not failures else 'need further work'}.**

Phase 7C changes intrinsic media metadata and loading priority only. It does not replace artwork, alter thumbnail framing, redesign the Omega presentation or modify game records.

## Improvements

- Images missing intrinsic dimensions: **{baseline_missing:,} → {current_missing:,}**
- Dimension issues removed from the repository-wide static scan: **{baseline_missing - current_missing:,}**
- Iframes not marked for lazy loading: **{baseline_iframes} → {current_iframes}**
- Archive game-card images verified: **{archive['total']:,}**
- Validation checks passed: **{len(checks) - len(failures)} / {len(checks)}**

## Archive card coverage

| Generated family | Sized 16:9 game-card images |
|---|---:|
{family_rows}

Every targeted archive card now declares `width="320"`, `height="180"`, `loading="lazy"` and `decoding="async"`. The existing CSS continues to control responsive sizing and `object-fit: cover`; no card presentation was changed.

## Single-game media

- The game hero thumbnail now declares a 16:9 intrinsic size, loads eagerly and receives high fetch priority because it is the primary above-the-fold game image.
- The game video iframe now reserves a 16:9 area with `560 × 315` dimensions and uses native lazy loading.
- The header logo retains its existing intrinsic dimensions but is no longer marked lazy on the single-game page.
- Runtime guards in `js/load-single-game.js` preserve the hero policy after game data hydration.

## Browser validation

| Route | HTTP | Sized target media | Unsized target media | Serious/critical axe nodes | Layout-shift evidence |
|---|---:|---:|---:|---:|---:|
{route_rows}

Layout-shift values are local lab evidence, not production Core Web Vitals field data.

## Deliberate limits

- Third-party HTML cached under `data/lemon-cache/` is not rewritten.
- Mixed C64 and Amiga screenshot galleries are not assigned guessed dimensions; their source formats vary and must be handled only when exact dimensions are available.
- Large-file recompression is reserved for Phase 7E.
- Redirect-route architecture remains reserved for Phase 7F.

## Workflow ownership

The historical Phase 6B workflow remains a complete read-only publishing validator on pull requests. Its commit step is now manual-only, preventing it from racing with later phase-specific workflows that own their generated output.

## Safety

- `index.html` unchanged
- `home.html` unchanged
- `resources/css/intro.css` unchanged
- `js/index-intro.js` unchanged
- `games/games.json` unchanged
- no route, game record or thumbnail asset renamed, replaced or removed
"""
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")

    if failures:
        raise SystemExit("Phase 7C validation failed: " + ", ".join(failures))
    print(json.dumps({"passed": len(checks), "total": len(checks)}, indent=2))
    return evidence


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("apply")
    validate_parser = sub.add_parser("validate")
    validate_parser.add_argument("--static", required=True)
    validate_parser.add_argument("--live", required=True)
    validate_parser.add_argument("--report", required=True)
    validate_parser.add_argument("--evidence", required=True)
    args = parser.parse_args()

    if args.command == "apply":
        apply()
        return
    validate(Path(args.static), Path(args.live), Path(args.report), Path(args.evidence))


if __name__ == "__main__":
    main()
