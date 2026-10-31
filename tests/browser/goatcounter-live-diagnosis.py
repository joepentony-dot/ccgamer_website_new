#!/usr/bin/env python3
"""Read-only live GoatCounter diagnostics. Never fake data or inject JS."""
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from playwright.sync_api import sync_playwright

BASE = "https://www.cheekycommodoregamer.co.uk"
COUNTER = "https://cheekycommodoregamer.goatcounter.com/counter/"
PATHS = ["TOTAL", "ccg-archive-session", "/games/chuckie-egg", "/games/chuckie-egg/", "/games/bruce-lee", "/games/bruce-lee/"]

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
    browser.close()
