#!/usr/bin/env python3
"""Read-only CCG 666-game source-vs-staged GitHub Pages release audit.

This script NEVER changes repository or staged HTML. It writes only a JSON report
under --report-dir. Run after staging and all postprocessors, before Pages upload.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urlparse

CANONICAL_ORIGIN = "https://www.cheekycommodoregamer.co.uk"
GAME_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
PLAY_ATTR = "data-ccg-play-in-emulator"
COMMON_TITLE_SUFFIX = re.compile(r"Review,\s*Screens\s*&\s*History", re.I)
MAG_START = "<!-- CCG_MAGAZINE_REVIEWS_STATIC_START -->"
MAG_END = "<!-- CCG_MAGAZINE_REVIEWS_STATIC_END -->"


class FactsParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title_active = False
        self.title_chunks: list[str] = []
        self.metas: dict[str, str] = {}
        self.canonical = ""
        self.anchors: list[str] = []
        self.body_classes: list[str] = []
        self.prefilled = False
        self.rating_depth = 0
        self.rating_chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = dict(attrs)
        if data.get("data-ccg-static-editorial-rating") == "true":
            self.rating_depth = 1
        elif self.rating_depth and tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.rating_depth += 1
        if tag == "title":
            self.title_active = True
        elif tag == "meta":
            key = (data.get("name") or data.get("property") or "").lower()
            if key:
                self.metas[key] = data.get("content") or ""
        elif tag == "link" and (data.get("rel") or "").lower() == "canonical":
            self.canonical = data.get("href") or ""
        elif tag == "a" and data.get(PLAY_ATTR) == "true":
            self.anchors.append(data.get("href") or "")
        elif tag == "body":
            self.body_classes = (data.get("class") or "").split()
        if data.get("data-ccg-prefilled") == "true":
            self.prefilled = True

    def handle_endtag(self, tag: str) -> None:
        if self.rating_depth:
            self.rating_depth -= 1
        if tag == "title":
            self.title_active = False

    def handle_data(self, data: str) -> None:
        if self.title_active:
            self.title_chunks.append(data)
        if self.rating_depth:
            self.rating_chunks.append(data)

    @property
    def title(self) -> str:
        return "".join(self.title_chunks).strip()


def collapse(text: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(text or "")).strip()


def normalized_body(inner: str) -> str:
    return collapse(re.sub(r"<[^>]*>", " ", inner))


def fragment(source: str, regex: str, flags: int = re.S | re.I) -> str:
    found = re.search(regex, source, flags)
    return found.group(1) if found else ""


def read_section(source: str, node_id: str) -> str:
    # CCG's generated plain-text game overview is a single div, no nested divs.
    return normalized_body(fragment(source, rf'<div\b(?=[^>]*\bid=["\']{re.escape(node_id)}["\'])[^>]*>(.*?)</div>'))


def read_video_intro(source: str) -> str:
    return normalized_body(fragment(source, r'<p\b[^>]*\bdata-ccg-video-description\b[^>]*>(.*?)</p>'))


def magazine_static(source: str) -> str:
    if MAG_START not in source or MAG_END not in source:
        return ""
    return collapse(source.split(MAG_START, 1)[1].split(MAG_END, 1)[0])


def schema(source: str) -> str:
    raw = fragment(source, r'<script\b[^>]*\bdata-ccg-schema=["\']game-graph["\'][^>]*>(.*?)</script>')
    if not raw:
        return ""
    try:
        return json.dumps(json.loads(raw), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    except json.JSONDecodeError:
        return f"INVALID-JSON:{raw[:300]}"


def attr_value(source: str, marker: str) -> str:
    found = re.search(rf'\b{re.escape(marker)}\s*=\s*["\']([^"\']*)["\']', source, re.I)
    return html.unescape(found.group(1)) if found else ""


def video_source(source: str) -> str:
    tag = re.search(r"<iframe\b[^>]*\bid=[\"']game-video-embed[\"'][^>]*>", source, re.I)
    if not tag:
        return ""
    found = re.search(r'\bdata-video-src=["\']([^"\']+)["\']', tag.group(0), re.I)
    return html.unescape(found.group(1)) if found else ""


@dataclass
class GameReport:
    slug: str
    system: str
    source_exists: bool
    stage_exists: bool
    source_title: str = ""
    stage_title: str = ""
    source_play: str = ""
    stage_play: str = ""
    meta_chars: int = 0
    editorial_words: int = 0
    problems: list[str] | None = None
    warnings: list[str] | None = None


def summarize_html(raw: str) -> dict:
    p = FactsParser()
    p.feed(raw)
    return {
        "title": p.title,
        "meta_description": p.metas.get("description", ""),
        "robots": p.metas.get("robots", ""),
        "canonical": p.canonical,
        "og_title": p.metas.get("og:title", ""),
        "og_description": p.metas.get("og:description", ""),
        "og_url": p.metas.get("og:url", ""),
        "twitter_title": p.metas.get("twitter:title", ""),
        "twitter_description": p.metas.get("twitter:description", ""),
        "play": p.anchors,
        "ready": "ccg-single-ready" in p.body_classes,
        "prefilled": p.prefilled,
        "overview": read_section(raw, "gameDescription"),
        "video_intro": read_video_intro(raw),
        "magazine": magazine_static(raw),
        "rating": collapse("".join(p.rating_chunks)),
        "rating_marker": 'data-ccg-static-editorial-rating="true"' in raw,
        "schema": schema(raw),
        "video_src": video_source(raw),
    }


def inspect_play(href: str) -> bool:
    parsed = urlparse(html.unescape(href))
    parameters = parse_qs(parsed.query)
    game_id = parameters.get("game", [""])[0]
    return (
        not parsed.scheme and not parsed.netloc and not parsed.fragment
        and parsed.path == "/emulator/c64/"
        and set(parameters) == {"game", "autoplay"}
        and len(parameters.get("game", [])) == 1
        and bool(re.fullmatch(r"[a-z0-9][a-z0-9-]{0,100}", game_id))
        and parameters.get("autoplay") == ["1"]
    )


def compare_game(g: dict, source_root: Path, stage_root: Path) -> GameReport:
    slug, system = str(g.get("slug", "")), str(g.get("system", "")).strip().upper()
    source_file = source_root / "games" / slug / "index.html"
    stage_file = stage_root / "games" / slug / "index.html"
    result = GameReport(slug, system, source_file.is_file(), stage_file.is_file(), problems=[], warnings=[])
    if not GAME_SLUG.fullmatch(slug):
        result.problems.append("INVALID_SLUG")
        return result
    if not result.source_exists:
        result.problems.append("MISSING_SOURCE_CANONICAL_PAGE")
        return result
    if not result.stage_exists:
        result.problems.append("MISSING_STAGED_CANONICAL_PAGE")
        return result
    sf = summarize_html(source_file.read_text(encoding="utf-8"))
    st = summarize_html(stage_file.read_text(encoding="utf-8"))
    result.source_title = sf["title"]
    result.stage_title = st["title"]
    result.source_play = sf["play"][0] if len(sf["play"]) == 1 else ""
    result.stage_play = st["play"][0] if len(st["play"]) == 1 else ""
    result.meta_chars = len(sf["meta_description"])
    result.editorial_words = len(sf["overview"].split())
    required_canonical = f"{CANONICAL_ORIGIN}/games/{slug}/"
    if not sf["prefilled"] or not st["prefilled"] or not sf["ready"] or not st["ready"]:
        result.problems.append("GENERATED_CONTENT_FIRST_PAINT_MARKER_LOST")
    if st["canonical"] != required_canonical:
        result.problems.append("STAGED_WRONG_CANONICAL")
    robots = set(re.split(r"[,\s]+", st["robots"].lower().strip()))
    if robots.intersection({"noindex", "none"}) or "index" not in robots:
        result.problems.append("STAGED_NOT_INDEXABLE")
    if not st["schema"] or st["schema"].startswith("INVALID-JSON:"):
        result.problems.append("STAGED_INVALID_JSON_LD_GRAPH")
    for key, label in [
        ("title", "SEO_TITLE_CHANGED"),
        ("meta_description", "META_DESCRIPTION_CHANGED"),
        ("robots", "ROBOTS_DIRECTIVE_CHANGED"),
        ("canonical", "CANONICAL_CHANGED"),
        ("og_title", "OG_TITLE_CHANGED"),
        ("og_description", "OG_DESCRIPTION_CHANGED"),
        ("og_url", "OG_URL_CHANGED"),
        ("twitter_title", "TWITTER_TITLE_CHANGED"),
        ("twitter_description", "TWITTER_DESCRIPTION_CHANGED"),
        ("overview", "GAME_OVERVIEW_CHANGED"),
        ("video_intro", "VIDEO_EDITORIAL_CHANGED"),
        ("magazine", "STATIC_MAGAZINE_REVIEWS_CHANGED"),
        ("rating_marker", "STATIC_RATING_MARKER_CHANGED"),
        ("rating", "STATIC_RATING_CHANGED"),
        ("schema", "JSON_LD_GRAPH_CHANGED"),
        ("video_src", "DEFERRED_VIDEO_SOURCE_CHANGED"),
    ]:
        if sf[key] != st[key]:
            result.problems.append(label)
    if system == "C64":
        if len(sf["play"]) > 1 or len(st["play"]) > 1:
            result.problems.append("DUPLICATE_PLAY_LINK")
        elif sf["play"] != st["play"]:
            result.problems.append("APPROVED_EMULATOR_LINK_MISSING_OR_CHANGED")
        if len(sf["play"]) == 1 and not inspect_play(sf["play"][0]):
            result.problems.append("SOURCE_EMULATOR_LINK_MALFORMED")
        if len(st["play"]) == 1 and not inspect_play(st["play"][0]):
            result.problems.append("STAGED_EMULATOR_LINK_MALFORMED")
    elif sf["play"] or st["play"]:
        result.problems.append("NON_C64_PAGE_HAS_C64_EMULATOR_LINK")
    if COMMON_TITLE_SUFFIX.search(sf["title"]):
        result.warnings.append("GENERIC_SEO_TITLE")
    if result.meta_chars < 120:
        result.warnings.append("SHORT_META_DESCRIPTION_REVIEW")
    if result.editorial_words < 200:
        result.warnings.append("SHORT_EDITORIAL_OVERVIEW_REVIEW")
    if sf["overview"] and sf["overview"] == sf["video_intro"]:
        result.warnings.append("DUPLICATED_VIDEO_AND_OVERVIEW")
    if sf["overview"] and sf["overview"].startswith(("🎮", "🕹️", "⚡", "️")):
        result.warnings.append("DECORATIVE_EMOJI_EDITORIAL")
    return result


def optional_authorised_media_check(source_root: Path, stage_root: Path) -> None:
    """Runs owning generator in --check mode against both roots. No mutations."""
    owner_script = source_root / "scripts" / "link-c64-emulator-games.js"
    if not owner_script.is_file():
        raise RuntimeError("Cannot verify media: owning linker script absent in source checkout")
    import os
    for root in (source_root, stage_root):
        env = dict(os.environ)
        env["CCG_REPO_ROOT"] = str(root)
        p = subprocess.run(["node", str(owner_script), "--check"], cwd=source_root, env=env,
                           capture_output=True, text=True, timeout=120, check=False)
        if p.returncode:
            raise RuntimeError(f"Approved-media --check failed for {root}: {(p.stdout+p.stderr)[-1800:]}")
        print(p.stdout.strip())


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fail-closed, read-only staged CCG game-page SEO/CTA parity audit")
    parser.add_argument("--source", type=Path, required=True, help="Path to complete CCG repository checkout")
    parser.add_argument("--staged", type=Path, required=True, help="Path to completed _site staging directory")
    parser.add_argument("--report-dir", type=Path, required=True, help="Output directory outside source/_site")
    parser.add_argument("--media-check", action="store_true", help="Also run owning Node emulator link generator in --check mode for both roots")
    options = parser.parse_args(argv)
    source, stage, destination = options.source.resolve(), options.staged.resolve(), options.report_dir.resolve()
    if source == stage or source == destination or stage == destination or source in destination.parents or stage in destination.parents:
        parser.error("Report directory must be outside source and staged directories; source and stage must differ")
    games_file = source / "games" / "games.json"
    try:
        games = json.loads(games_file.read_text(encoding="utf-8"))
        if not isinstance(games, list) or not games or not all(isinstance(g, dict) for g in games):
            raise ValueError("games.json must be a nonempty list of game records")
        if games_file.read_bytes() != (stage / "games" / "games.json").read_bytes():
            raise ValueError("Staged game catalogue differs from source")
        if len(games) != len({g.get("slug") for g in games}):
            raise ValueError("Duplicate game slug(s) found in catalogue")
        reports = [compare_game(g, source, stage) for g in games]
        media_verified = False
        if options.media_check:
            optional_authorised_media_check(source, stage)
            media_verified = True
    except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as e:
        print(f"AUDIT FAILURE: {e}", file=sys.stderr)
        return 2
    errors = Counter(issue for r in reports for issue in (r.problems or []))
    warnings = Counter(issue for r in reports for issue in (r.warnings or []))
    count_links = lambda prop: sum(bool(getattr(r, prop)) for r in reports if r.system == "C64")
    summary = {
        "catalogue_count": len(reports),
        "c64_count": sum(r.system == "C64" for r in reports),
        "amiga_count": sum(r.system == "AMIGA" for r in reports),
        "approved_source_c64_buttons": count_links("source_play"),
        "approved_staged_c64_buttons": count_links("stage_play"),
        "pages_with_release_blockers": sum(bool(r.problems) for r in reports),
        "pages_with_editorial_warnings": sum(bool(r.warnings) for r in reports),
        "release_blockers": dict(errors),
        "editorial_warnings": dict(warnings),
        "owning_media_generator_checks_passed": media_verified,
        "source_root": str(source),
        "stage_root": str(stage),
        "notice": "Read-only source/staged HTML checks, not live deployment or real-browser verification",
    }
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "ccg-game-release-report.json").write_text(
        json.dumps({"summary": summary, "games": [asdict(r) for r in reports]}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )
    lines = ["# CCG game-page release audit", "", f"Games: {len(reports)}; C64: {summary['c64_count']}; Amiga: {summary['amiga_count']}",
             f"Expected C64 play anchors in source: {summary['approved_source_c64_buttons']}",
             f"Play anchors in staged site: {summary['approved_staged_c64_buttons']}",
             f"Pages with deployment regressions: {summary['pages_with_release_blockers']}",
             f"Pages requiring editorial review: {summary['pages_with_editorial_warnings']}", "", "## Release-blocking failures", ""]
    lines.extend(f"- {key}: {value}" for key, value in errors.most_common())
    if not errors:
        lines.append("- None found in source/staged comparison (production still needs separate verification).")
    lines += ["", "## Editorial improvement flags", ""]
    lines.extend(f"- {key}: {value}" for key, value in warnings.most_common())
    lines += ["", "## Sample affected routes", ""]
    for item in (r for r in reports if r.problems):
        lines.append(f"- `/games/{item.slug}/`: {', '.join(item.problems or [])}")
        if len(lines) > 220:
            lines.append("- See JSON for all remaining routes.")
            break
    (destination / "ccg-game-release-summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 2 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
