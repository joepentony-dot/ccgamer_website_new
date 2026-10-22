#!/usr/bin/env python3
"""Browser acceptance for visible GoatCounter counters on *currently live* HTML.

The live CCG pages can be overwritten by the branch-based GitHub Pages
publisher, so inject the candidate shared JS via Playwright route.fulfill().
This exercises the actual HTML and public GoatCounter JSON service without
requiring the PR to be deployed first. No dashboard credentials used.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
GLOBAL = (ROOT / "js/ccg-global.js").read_text(encoding="utf-8")
METRICS = (ROOT / "js/ccg-visitor-metrics.js").read_text(encoding="utf-8")
BASE = "https://www.cheekycommodoregamer.co.uk"

assert "ccgEnsureVisitorMetrics" in GLOBAL
assert "CCGVisitorMetricsInitialized" in METRICS


def check_page(browser, path: str, is_game: bool):
    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        service_workers="block",
    )
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    try:
        page.route(
            "**/js/ccg-global.js*",
            lambda route: route.fulfill(
                status=200,
                content_type="application/javascript",
                body=GLOBAL,
            ),
        )
        page.route(
            "**/js/ccg-visitor-metrics.js*",
            lambda route: route.fulfill(
                status=200,
                content_type="application/javascript",
                body=METRICS,
            ),
        )
        response = page.goto(BASE + path, wait_until="domcontentloaded", timeout=35000)
        assert response and response.status == 200, f"{path}: page unavailable"

        if is_game:
            counter = page.locator(".ccg-footer--game #ccg-game-view-count")
            counter.wait_for(state="attached", timeout=15000)
            assert page.locator(".ccg-footer--game .ccg-game-views__label").inner_text() == "Game views"
            counter_text = counter.inner_text()
            assert page.locator(".ccg-footer--game .ccg-game-views").is_visible()
            assert page.locator(".ccg-footer--game").evaluate(
                "(el) => el.contains(document.querySelector('#ccg-game-view-count'))"
            )
        else:
            counter = page.locator("#ccg-visit-count")
            page.wait_for_function(
                "() => document.querySelector('.ccg-footer-home__status')?.textContent === 'Archive visits'",
                timeout=15000,
            )
            counter_text = counter.inner_text()

        print(f"PASS: {path} rendered counter, initial display={counter_text!r}")
        assert not any("SyntaxError" in error for error in errors), errors
        # A public counter response may still be 404/0 until the first event
        # is persisted; browser instrumentation itself must be present.
    finally:
        context.close()


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path="/usr/bin/google-chrome",
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        try:
            check_page(browser, "/home.html", False)
            check_page(browser, "/games/chuckie-egg/", True)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
