#!/usr/bin/env python3
"""Read-only live GoatCounter diagnostics. Never fake data or inject JS."""
import json
import re
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from playwright.sync_api import sync_playwright

BASE = "https://www.cheekycommodoregamer.co.uk"
COUNTER = "https://cheekycommodoregamer.goatcounter.com/counter/"
PATHS = ["TOTAL", "ccg-archive-session", "/games/chuckie-egg", "/games/chuckie-egg/", "/games/bruce-lee", "/games/bruce-lee/"]
RETRO_PATHS = [
    "/retro-specials/50-essential-commodore-64-games/",
    "/retro-events/north-west-computer-museum-leigh/",
    "/amiga-demo-music/state-of-the-art/",
]
PATHS.extend(path.rstrip("/") for path in RETRO_PATHS)

for path in PATHS:
    from urllib.parse import quote
    url = COUNTER + quote(path, safe="") + ".json"
    try:
        with urlopen(Request(url, headers={"User-Agent": "CCG Goacounter diagnostics"}), timeout=20) as r:
            raw=r.read(1800).decode()
            print(f"API {path!r}: HTTP {r.status} BODY {raw!r}")
    except HTTPError as e:
        print(f"API {path!r}: HTTP {e.code} BODY {e.read(1800).decode()!r}")
    except Exception as e:
        print(f"API {path!r}: ERROR {type(e).__name__} {e}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path="/usr/bin/google-chrome",
                                args=["--no-sandbox", "--disable-dev-shm-usage"])
    for path in ["/home.html", "/games/chuckie-egg/", "/games/bruce-lee/"]:
        ctx=browser.new_context(service_workers="block")
        page=ctx.new_page()
        failures=[]
        page.on("pageerror",lambda e: failures.append(str(e)[:300]))
        try:
            response=page.goto(BASE+path,wait_until="domcontentloaded",timeout=45000)
            page.wait_for_timeout(9500)
            data=page.evaluate("""() => ({
              ready: document.readyState,
              page: document.documentElement.getAttribute('data-ccg-page'),
              globalScript: Boolean(document.querySelector('script[src*="ccg-global.js"]')),
              metricsScript: [...document.querySelectorAll('script[src*="ccg-visitor-metrics.js"]')].map(s=>s.src),
              metricsInitialised: Boolean(window.CCGVisitorMetricsInitialized),
              goatcounterAvailable: Boolean(window.goatcounter),
              footer: Boolean(document.querySelector('.ccg-footer--game')),
              canonical: document.querySelector('link[rel="canonical"]')?.href,
              homeCount: document.querySelector('#ccg-visit-count')?.textContent,
              gameCount: document.querySelector('#ccg-game-view-count')?.textContent,
              loadedCount: document.querySelector('#ccg-game-view-count,#ccg-visit-count')?.getAttribute('data-ccg-counter-loaded')
            })""")
            print(f"BROWSER {path}: HTTP {response.status if response else None}, DOM {json.dumps(data)}, errors {json.dumps(failures[-5:])}")
        except Exception as e: print(f"BROWSER {path}: {type(e).__name__}: {e}")
        finally:ctx.close()

    # Exact live browser acceptance: no candidate script injection, API mocks,
    # synthetic values, or manual alteration of published HTML.
    for path in RETRO_PATHS:
        context = browser.new_context(service_workers="block", viewport={"width": 1280, "height": 800})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)[:300]))
        try:
            response = page.goto(BASE + path, wait_until="domcontentloaded", timeout=45000)
            assert response and response.status == 200, f"{path}: HTTP {response.status if response else 'unavailable'}"
            try:
                page.wait_for_function("""() => {
                    const counter = document.getElementById('ccg-retro-view-count');
                    return counter && counter.getAttribute('data-ccg-counter-loaded') === 'true';
                }""", timeout=30000)
            except Exception as error:
                details = page.evaluate("""() => ({
                    pageType: document.documentElement.getAttribute('data-ccg-page'),
                    canonical: document.querySelector('link[rel="canonical"]')?.href,
                    metricsScripts: [...document.querySelectorAll('script[src*="ccg-visitor-metrics.js"]')].map(s => s.src),
                    initialized: Boolean(window.CCGVisitorMetricsInitialized),
                    trackerCount: document.querySelectorAll('script[data-goatcounter]').length,
                    counterNodes: [...document.querySelectorAll('#ccg-retro-view-count')].map(n => ({
                        text: n.textContent, loaded: n.getAttribute('data-ccg-counter-loaded')
                    }))
                })""")
                raise AssertionError(f"{path}: numeric live counter never loaded; {json.dumps(details)}; page errors {errors}") from error

            badge = page.locator(".ccg-footer .ccg-retro-views")
            count = page.locator("#ccg-retro-view-count")
            value = count.inner_text().strip()
            assert re.fullmatch(r"[0-9][0-9,.'’\s]*", value), f"{path}: nonnumeric counter {value!r}"
            assert badge.count() == 1 and badge.is_visible(), f"{path}: missing or duplicate visible badge"
            assert count.count() == 1, f"{path}: duplicate counter IDs"
            assert page.locator("script[data-goatcounter]").count() == 1, f"{path}: duplicate/missing GoatCounter tracker"
            assert page.evaluate("document.documentElement.getAttribute('data-ccg-page')") == "retro-video"
            assert page.evaluate("document.querySelector('link[rel=canonical]')?.href") == BASE + path
            assert not any("SyntaxError" in msg for msg in errors), f"{path}: syntax errors {errors}"
            print(f"PASS LIVE RETRO: {path} feature visits={value!r}; one visible footer badge and tracker")
        finally:
            context.close()

    browser.close()
