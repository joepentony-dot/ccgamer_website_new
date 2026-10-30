#!/usr/bin/env python3
"""Real Chromium desktop/mobile contract for the FREE archive-only Ask CCG v1."""
import json
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
JS = (ROOT / "js/ccg-retro-assistant.js").read_text("utf-8")
CSS = (ROOT / "resources/css/ccg-retro-assistant.css").read_text("utf-8")
GAMES = [
    {"system": "C64", "slug": "uridium", "title": "Uridium", "year": 1986,
     "genres": ["shooter"], "credits": {"publisher": ["Hewson"]}, "ccg_rating": 8},
    *({"system": "C64", "slug": f"platform-{i}", "title": f"Platform Sample {i}",
       "year": 1987, "genres": ["platform"]} for i in range(12)),
    {"system": "Amiga", "slug": "amiga-platform", "title": "Amiga Platform",
     "year": 1991, "genres": ["platform"]},
]
HTML = ('<!doctype html><html data-ccg-page="home"><head><meta charset="utf-8">'
        '<base href="https://www.cheekycommodoregamer.co.uk/"></head>'
        '<body><main><h1>CCG Home test fixture</h1></main></body></html>')


def run(browser, width, height):
    ctx = browser.new_context(viewport={"width": width, "height": height})
    page = ctx.new_page()
    requests = []
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))

    def route_request(route):
        url = route.request.url
        requests.append(url)
        if url.endswith("/games/games.json"):
            route.fulfill(status=200, content_type="application/json", body=json.dumps(GAMES))
        elif url.endswith("/resources/css/ccg-retro-assistant.css"):
            route.fulfill(status=200, content_type="text/css", body=CSS)
        else:
            route.abort()

    page.route("**/*", route_request)
    try:
        page.set_content(HTML, wait_until="domcontentloaded")
        page.add_script_tag(content=JS)
        launcher = page.locator(".ccg-ra__trigger")
        assert launcher.count() == 1 and launcher.is_visible(), f"{width}: missing free launcher"
        assert not requests, f"{width}: network request before visitor interaction: {requests}"
        launcher.click()
        panel = page.locator(".ccg-ra__panel")
        assert panel.is_visible(), f"{width}: panel failed to open"
        box = panel.bounding_box()
        assert box and box["x"] >= -1 and box["x"] + box["width"] <= width + 1, (
            f"{width}: horizontal panel clipping {box}"
        )
        assert box["y"] >= -1 and box["y"] + box["height"] <= height + 1, (
            f"{width}: vertical panel clipping {box}"
        )
        field = page.locator(".ccg-ra__input")
        send = page.locator(".ccg-ra__send")

        def ask(value, expected):
            field.fill(value)
            send.click()
            page.wait_for_function(
                "(text) => [...document.querySelectorAll('.ccg-ra__message--bot')]"
                ".some(node => node.textContent.includes(text))", expected, timeout=8000
            )

        ask("Tell me about the SID chip", "three independently programmable")
        assert not any("/games/games.json" in u for u in requests), (
            f"{width}: hardware answer should not fetch catalogue"
        )
        ask("Who published Uridium?", "Hewson")
        assert sum("/games/games.json" in u for u in requests) == 1, (
            f"{width}: archive must be fetched once on first catalogue question"
        )
        assert page.locator('.ccg-ra__result[href="/games/uridium/"]').count() == 1
        before = page.locator(".ccg-ra__result").count()
        ask("C64 platform games", "Here are matches")
        assert page.locator(".ccg-ra__result").count() - before == 5, (
            f"{width}: first page should contain five real matches"
        )
        before = page.locator(".ccg-ra__result").count()
        ask("show me more", "Here are more matches")
        assert page.locator(".ccg-ra__result").count() - before == 5, (
            f"{width}: next page should contain five different matches"
        )
        before = page.locator(".ccg-ra__result").count()
        ask("more", "Here are more matches")
        assert page.locator(".ccg-ra__result").count() - before == 2, (
            f"{width}: final page should contain two matches"
        )
        before = page.locator(".ccg-ra__result").count()
        ask("more", "That’s all the matching games")
        assert page.locator(".ccg-ra__result").count() == before, (
            f"{width}: exhausted pagination must not duplicate links"
        )
        before = page.locator(".ccg-ra__result").count()
        ask("C64 platform games", "Here are matches")
        ask("what about Amiga?", "Here are matches")
        assert page.locator('.ccg-ra__result[href="/games/amiga-platform/"]').count() == 1
        assert page.locator(".ccg-ra__result").count() == before + 6
        assert not any("openai" in u or "supabase" in u or "turnstile" in u for u in requests), (
            f"{width}: free-only pilot attempted external AI or CAPTCHA request"
        )
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), (
            f"{width}: assistant created horizontal overflow"
        )
        page.keyboard.press("Escape")
        assert panel.is_hidden() and launcher.get_attribute("aria-expanded") == "false"
        assert launcher.evaluate("(n) => document.activeElement === n"), (
            f"{width}: Escape must restore keyboard focus"
        )
        assert not errors, f"{width}: browser errors {errors}"
        print(f"PASS: Ask CCG {width}x{height}, hardware, lazy archive, facts, pagination, follow-ups, focus")
    finally:
        ctx.close()


def main():
    binary = shutil.which("google-chrome") or shutil.which("chromium")
    if not binary:
        raise RuntimeError("Chromium executable unavailable")
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=binary, headless=True, args=["--no-sandbox"])
        try:
            run(browser, 1440, 900)
            run(browser, 390, 844)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
