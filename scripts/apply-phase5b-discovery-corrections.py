#!/usr/bin/env python3
"""Apply the bounded Phase 5B internal-discovery corrections."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAMES_INDEX = ROOT / "games" / "index.html"
QUIZ_HUB = ROOT / "quiz" / "quiz.html"
RETRO_EVENTS_HUB = ROOT / "games" / "collections" / "retro-events.html"
MANUAL_VIEWER = ROOT / "viewer" / "manual.html"
STATIC_PAGES = ROOT / "tools" / "seo" / "static-pages.json"
SITEMAP_GENERATOR = ROOT / "tools" / "seo" / "generate-sitemap.js"

PUBLISHER_LINK = '<a class="ccg-btn ccg-btn--secondary" href="/games/publishers/">Browse by Publisher</a>'
QUIZ_MARKER = 'data-phase5b-quiz-pack6-discovery="true"'
EVENT_MARKER = 'data-phase5b-yorkshire-event-discovery="true"'
MANUAL_ENTRY = "viewer/manual.html"


def read(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"Missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def write_if_changed(path: Path, content: str) -> bool:
    current = path.read_text(encoding="utf-8") if path.exists() else None
    if current == content:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return True


def add_publisher_shortcut(html: str) -> str:
    if html.count('href="/games/publishers/"') == 1:
        return html
    if 'href="/games/publishers/"' in html:
        raise SystemExit("Browse Games contains duplicate publisher discovery links.")

    pattern = re.compile(
        r'(<div class="games-hero__stats" data-games-developers-shortcut="true">[\s\S]*?'
        r'<a class="ccg-btn ccg-btn--secondary" href="/games/developers/">Browse by Developer</a>)'
    )
    if not pattern.search(html):
        raise SystemExit("Could not locate the bounded Browse Games developer shortcut block.")
    return pattern.sub(rf"\1\n                    {PUBLISHER_LINK}", html, count=1)


def add_quiz_fallback(html: str) -> str:
    if QUIZ_MARKER in html:
        return html
    anchor = """                                <div class="quiz-pack-list" data-quiz-pack-list>
                                    <button class="ccg-btn ccg-btn--secondary quiz-pack-btn" type="button" disabled>Loading packs…</button>
                                </div>"""
    if anchor not in html:
        raise SystemExit("Could not locate the Quiz Packs list insertion point.")
    fallback = f"""{anchor}
                                <noscript>
                                    <p class="quiz-pack-status" {QUIZ_MARKER}>
                                        JavaScript is disabled. <a href="pack-6.html">Play Game Box Hangman</a>.
                                    </p>
                                </noscript>"""
    return html.replace(anchor, fallback, 1)


def add_retro_event_fallback(html: str) -> str:
    if EVENT_MARKER in html:
        return html
    anchor = '                    <li><a href="../index.html">Browse all games</a></li>'
    if anchor not in html:
        raise SystemExit("Could not locate the Retro Events no-script fallback list.")
    link = (
        f'                    <li {EVENT_MARKER}><a href="/retro-events/'
        'yorkshire-amiga-group-meetup/">Yorkshire Amiga Group meetup</a></li>\n'
    )
    return html.replace(anchor, f"{link}{anchor}", 1)


def noindex_manual_viewer(html: str) -> str:
    robots_pattern = re.compile(
        r'<meta\b[^>]*name\s*=\s*(["\'])robots\1[^>]*>', re.I
    )
    robots_tags = robots_pattern.findall(html)
    if robots_tags:
        tags = list(robots_pattern.finditer(html))
        if len(tags) != 1:
            raise SystemExit("Manual viewer contains multiple robots directives.")
        tag = tags[0].group(0)
        if re.search(r'content\s*=\s*(["\'])noindex,follow\1', tag, re.I):
            return html
        replacement = '<meta name="robots" content="noindex,follow">'
        return html[: tags[0].start()] + replacement + html[tags[0].end() :]

    viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    if viewport not in html:
        raise SystemExit("Could not locate the manual viewer viewport meta tag.")
    return html.replace(
        viewport,
        f'{viewport}\n    <meta name="robots" content="noindex,follow">',
        1,
    )


def remove_manual_registry_entry() -> str:
    payload = json.loads(read(STATIC_PAGES))
    if not isinstance(payload, list):
        raise SystemExit("tools/seo/static-pages.json must contain an array.")
    next_payload = [entry for entry in payload if entry != MANUAL_ENTRY]
    if len(payload) - len(next_payload) > 1:
        raise SystemExit("Manual viewer appears more than once in the static registry.")
    return json.dumps(next_payload, indent=2) + "\n"


def remove_manual_default_entry(source: str) -> str:
    line_pattern = re.compile(r"^\s*'viewer/manual\.html',\s*\n", re.M)
    matches = list(line_pattern.finditer(source))
    if not matches:
        if "viewer/manual.html" in source:
            raise SystemExit("Manual viewer remains in the sitemap generator in an unexpected form.")
        return source
    if len(matches) != 1:
        raise SystemExit("Manual viewer appears more than once in sitemap defaults.")
    return line_pattern.sub("", source, count=1)


def validate_outputs() -> None:
    games_html = read(GAMES_INDEX)
    quiz_html = read(QUIZ_HUB)
    events_html = read(RETRO_EVENTS_HUB)
    manual_html = read(MANUAL_VIEWER)
    registry = json.loads(read(STATIC_PAGES))
    generator = read(SITEMAP_GENERATOR)

    if games_html.count('href="/games/publishers/"') != 1:
        raise SystemExit("Browse Games must contain exactly one publisher discovery link.")
    if quiz_html.count('href="pack-6.html"') != 1 or quiz_html.count(QUIZ_MARKER) != 1:
        raise SystemExit("Quiz Pack 6 static fallback validation failed.")
    event_href = 'href="/retro-events/yorkshire-amiga-group-meetup/"'
    if events_html.count(event_href) != 1 or events_html.count(EVENT_MARKER) != 1:
        raise SystemExit("Yorkshire meetup static fallback validation failed.")
    robots = re.findall(
        r'<meta\b[^>]*name\s*=\s*(["\'])robots\1[^>]*>', manual_html, re.I
    )
    if len(robots) != 1 or not re.search(
        r'<meta\b[^>]*name\s*=\s*(["\'])robots\1[^>]*content\s*=\s*(["\'])noindex,follow\2',
        manual_html,
        re.I,
    ):
        raise SystemExit("Manual viewer must contain exactly one noindex,follow directive.")
    if MANUAL_ENTRY in registry:
        raise SystemExit("Manual viewer remains in the static-page registry.")
    if "viewer/manual.html" in generator:
        raise SystemExit("Manual viewer remains in sitemap generator defaults.")


def main() -> None:
    changes = {
        str(GAMES_INDEX.relative_to(ROOT)): write_if_changed(
            GAMES_INDEX, add_publisher_shortcut(read(GAMES_INDEX))
        ),
        str(QUIZ_HUB.relative_to(ROOT)): write_if_changed(
            QUIZ_HUB, add_quiz_fallback(read(QUIZ_HUB))
        ),
        str(RETRO_EVENTS_HUB.relative_to(ROOT)): write_if_changed(
            RETRO_EVENTS_HUB, add_retro_event_fallback(read(RETRO_EVENTS_HUB))
        ),
        str(MANUAL_VIEWER.relative_to(ROOT)): write_if_changed(
            MANUAL_VIEWER, noindex_manual_viewer(read(MANUAL_VIEWER))
        ),
        str(STATIC_PAGES.relative_to(ROOT)): write_if_changed(
            STATIC_PAGES, remove_manual_registry_entry()
        ),
        str(SITEMAP_GENERATOR.relative_to(ROOT)): write_if_changed(
            SITEMAP_GENERATOR, remove_manual_default_entry(read(SITEMAP_GENERATOR))
        ),
    }
    validate_outputs()
    changed = [path for path, did_change in changes.items() if did_change]
    print(json.dumps({"changed": changed, "changed_count": len(changed)}, indent=2))


if __name__ == "__main__":
    main()
