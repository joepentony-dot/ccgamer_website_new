#!/usr/bin/env python3
"""Chromium smoke of the actual CCG game video markup and click-handler body.

An isolated offline fixture, not a live YouTube playback or full-page-load test.
Network requests are blocked; no external video or player is contacted.
"""
import json
from pathlib import Path
import re
import shutil

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SHELL = (ROOT / "games/game.html").read_text(encoding="utf-8")
RUNTIME = (ROOT / "js/load-single-game.js").read_text(encoding="utf-8")
GAME_CSS = (ROOT / "resources/css/games.css").read_text(encoding="utf-8")
PAGE_CSS = (ROOT / "resources/css/game-pages.css").read_text(encoding="utf-8")
VIDEO_ID = "CCGSMOKE123"
EMBED = f"https://www.youtube-nocookie.com/embed/{VIDEO_ID}"

section_match = re.search(
    r'<section\b[^>]*id="game-video-section"[^>]*>[\s\S]*?</section>',
    SHELL, re.IGNORECASE
)
handler_match = re.search(
    r'videoFacade\.onclick = \(event\) => \{([\s\S]*?)\n            \};',
    RUNTIME
)
if not section_match or not handler_match:
    raise AssertionError("Canonical video section or actual runtime click handler missing")
SECTION = section_match.group(0)
HANDLER = handler_match.group(1)
if 'id="game-video-facade"' not in SECTION or 'id="game-video-embed"' not in SECTION:
    raise AssertionError("Required canonical facade and deferred iframe missing")

HTML = (
    '<!doctype html><html><head><meta charset="utf-8"><style>'
    + GAME_CSS + "\n" + PAGE_CSS
    + '</style></head><body class="ccg-page--single-game">'
    + SECTION + '</body></html>'
)

def run_case(browser, width, height, keyboard):
    context = browser.new_context(viewport={"width": width, "height": height})
    page = context.new_page()
    external_requests = []
    try:
        page.on("request", lambda request: external_requests.append(request.url))
        page.route("**/*", lambda route: route.abort())
        page.set_content(HTML, wait_until="domcontentloaded")
        page.evaluate(
            """({body, embed, videoId}) => {
              const section = document.getElementById("game-video-section");
              const facade = document.getElementById("game-video-facade");
              const videoEmbed = document.getElementById("game-video-embed");
              const poster = document.getElementById("game-video-poster");
              const link = document.getElementById("gameVideoBtn");
              if (!section || !facade || !videoEmbed || !poster || !link) {
                throw new Error("Canonical video fixture incomplete");
              }
              section.hidden = false;
              facade.hidden = false;
              facade.setAttribute("aria-label", "Play CCG video");
              videoEmbed.hidden = true;
              videoEmbed.removeAttribute("src");
              videoEmbed.dataset.videoSrc = embed;
              poster.src = "data:image/svg+xml," + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"></svg>'
              );
              link.href = "https://www.youtube.com/watch?v=" + videoId;
              link.hidden = false;
              const activate = new Function(
                "event", "videoEmbed", "videoFacade", "embedUrl", "document", body
              );
              facade.onclick = (event) =>
                activate(event, videoEmbed, facade, embed, document);
            }""",
            {"body": HANDLER, "embed": EMBED, "videoId": VIDEO_ID}
        )
        facade = page.locator("#game-video-facade")
        iframe = page.locator("#game-video-embed")
        link = page.locator("#gameVideoBtn")
        assert facade.is_visible(), f"{width}: poster Play button must be visible"
        assert not iframe.is_visible(), f"{width}: iframe must be hidden until activation"
        assert iframe.get_attribute("src") is None, "No YouTube iframe URL before Play"
        assert link.get_attribute("href") == f"https://www.youtube.com/watch?v={VIDEO_ID}"
        assert not any("youtube-nocookie.com" in url for url in external_requests), (
            "No YouTube iframe request may start before Play"
        )
        bounds = facade.bounding_box()
        assert bounds is not None and bounds["width"] > 100 and bounds["height"] > 100, (
            f"{width}: Play target must occupy visible poster geometry"
        )
        if keyboard:
            facade.focus()
            page.keyboard.press("Enter")
        else:
            facade.click()
        page.wait_for_function(
            "() => !!document.querySelector('#game-video-embed')?.getAttribute('src')",
            timeout=5000
        )
        assert iframe.get_attribute("src") == EMBED + "?autoplay=1"
        assert iframe.is_visible(), f"{width}: iframe must be revealed after Play"
        assert not facade.is_visible(), f"{width}: poster must be hidden after Play"
        assert link.get_attribute("href") == f"https://www.youtube.com/watch?v={VIDEO_ID}"
        if keyboard:
            assert page.evaluate(
                "() => document.activeElement?.id === 'game-video-embed'"
            ), "Keyboard activation should move focus to the iframe"
        print(json.dumps({
            "viewport": width, "keyboard": keyboard, "poster_before_play": True,
            "no_eager_iframe": True, "player_revealed": True,
            "external_youtube_link_preserved": True
        }))
    finally:
        context.close()

def main():
    executable = (
        shutil.which("google-chrome")
        or shutil.which("chromium")
        or shutil.which("chromium-browser")
    )
    if not executable:
        raise RuntimeError("System Chromium/Chrome executable unavailable")
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=executable, headless=True, args=["--no-sandbox"]
        )
        try:
            run_case(browser, 390, 844, False)
            run_case(browser, 1280, 800, False)
            run_case(browser, 390, 844, True)
            run_case(browser, 1280, 800, True)
        finally:
            browser.close()
    print("PASS: four offline Chromium video facade interactions")

if __name__ == "__main__":
    main()
