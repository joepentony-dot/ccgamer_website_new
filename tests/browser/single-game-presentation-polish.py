#!/usr/bin/env python3
"""Deterministic Chromium checks for shared single-game layout repairs."""
from pathlib import Path
import re
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
MASTER_CSS = (ROOT / "resources/css/ccg-master.css").read_text("utf-8")
nav_start = MASTER_CSS.index(".ccg-floating-nav {")
nav_end = MASTER_CSS.index("@media (prefers-reduced-motion: reduce)", nav_start)
NAV_CSS = MASTER_CSS[nav_start:nav_end]
CSS = NAV_CSS + "\n" + "\n".join((ROOT / path).read_text("utf-8") for path in (
    "resources/css/games.css", "resources/css/game-pages.css",
))
JS = (ROOT / "js/load-single-game.js").read_text("utf-8")
TEMPLATE = (ROOT / "games/game.html").read_text("utf-8")
assert ">Peripherals You Might Need</h2>" in TEMPLATE
match = re.search(
    r"(function setupQuickActionsFooterGuard\(quickActions\) \{[\s\S]*?\n\})\n"
    r"\nfunction handleQuickAction\(action\)",
    JS,
)
assert match, "Unchanged production quick-actions footer guard not found"
GUARD = match.group(1)

CREDITS = "".join(
    f'<div class="ccg-behind-pixels-inline__item"><dt>{label}</dt><dd>{value}</dd></div>'
    for label, value in (
        ("Publisher", "<a href='/games/publishers/electronic-arts/'>Electronic Arts</a>"),
        ("Programmer", "Alan Pavlish"),
        ("Graphics", "Todd J. Camasta"),
    )
)
CARDS = "".join(
    '<a class="related-card" href="/games/jupiter-lander/">'
    '<img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22180%22/%3E" alt="Game">'
    '<span class="related-card__title">Jupiter Lander</span>'
    '<div class="related-card__meta">'
    '<span class="related-card__tag">Arcade</span>'
    '<span class="related-card__tag">C64 · 1983</span>'
    '<span class="related-card__tag">Commodore</span>'
    '<span class="related-card__tag related-card__tag--reason">Same Publisher</span>'
    '</div></a>' for _ in range(8)
)
HTML = (
    '<!doctype html><html data-ccg-page="single-game" class="ccg-has-floating-nav"><head><meta charset="utf-8"><style>' + CSS +
    '</style></head><body class="ccg-page--single-game"><main class="game-shell">'
    '<section class="game-hero" aria-label="Game overview"><h1>Test game</h1></section>'
    '<nav class="ccg-game-section-nav" aria-label="Explore game sections">'
    '<div class="ccg-game-section-nav__links"><a class="ccg-game-section-nav__link" href="#support-cta">Video</a>'
    '<a class="ccg-game-section-nav__link" href="#support-cta">Credits</a></div></nav>'
    '<section class="ccg-behind-pixels-inline">'
    '<h2 class="ccg-behind-pixels-inline__title">Game Credits</h2>'
    '<dl class="ccg-behind-pixels-inline__list">' + CREDITS + '</dl></section>'
    '<section class="game-section game-section--related">'
    '<div class="related-carousel"><button class="related-carousel__nav related-carousel__nav--prev">‹</button>'
    '<div class="related-carousel__viewport"><div class="related-carousel__track">' + CARDS + '</div></div>'
    '<button class="related-carousel__nav related-carousel__nav--next">›</button></div></section>'
    '<div style="grid-column:1 / -1;height:1600px"></div>'
    '<p id="support-cta" style="grid-column:1 / -1">Enjoying the archive? <a href="/support.html">Support CCG</a></p>'
    '<div class="game-quick-actions" data-game-quick-actions>'
    '<button>Watch</button><button>Share</button><button>Subscribe</button></div>'
    '</main><footer class="ccg-footer"><p>Copyright CCG</p></footer>'
    '<div class="ccg-back-to-top-wrap" data-ccg-back-to-top-wrap><button>↑</button></div>'
    '<div class="ccg-floating-nav ccg-floating-nav--visible"><nav class="ccg-floating-nav__bar">'
    + ''.join(
        '<a class="ccg-floating-nav__btn" data-ccg-floating-section="' + label.lower() + '" href="#">'
        '<span class="ccg-floating-nav__icon">◉</span>'
        '<span class="ccg-floating-nav__label">' + label + '</span></a>'
        for label in ("Home", "Games", "Genres", "Collections", "Top")
    ) + '</nav></div></body></html>'
)

def run(browser, width, height):
    ctx = browser.new_context(viewport={"width": width, "height": height})
    page = ctx.new_page()
    try:
        page.route("**/*", lambda route: route.abort())
        page.set_content(HTML, wait_until="domcontentloaded")
        # Browser regression for the game-specific Explore menu. Unlike the
        # intentionally floating global controls, this menu must scroll away.
        explore = page.locator(".ccg-game-section-nav")
        assert explore.count() == 1, f"{width}: missing single-game Explore menu"
        assert explore.evaluate("(n)=>getComputedStyle(n).position") == "static", (
            f"{width}: Explore menu must participate in normal page flow"
        )
        assert explore.bounding_box()["y"] < height, f"{width}: Explore not initially visible"
        page.mouse.move(width // 2, min(height - 20, 450))
        page.mouse.wheel(0, 900)
        page.wait_for_function("window.scrollY > 500", timeout=5000)
        assert explore.evaluate("(n)=>n.getBoundingClientRect().bottom") < 0, (
            f"{width}: Explore menu follows viewport after physical wheel scroll"
        )
        page.mouse.wheel(0, -900)
        page.wait_for_function("window.scrollY < 100", timeout=5000)
        assert explore.evaluate("(n)=>n.getBoundingClientRect().bottom") > 0, (
            f"{width}: Explore menu did not return with normal document scroll"
        )
        outcome = page.evaluate("""() => {
          const pairs=[...document.querySelectorAll('.ccg-behind-pixels-inline__item')];
          const boxes=pairs.map(item=>{
            const dt=item.querySelector('dt'), dd=item.querySelector('dd');
            const a=dd.querySelector('a');
            const range=document.createRange();
            range.selectNodeContents(dt);
            return {
              label:dt.textContent,
              labelLines:range.getClientRects().length,
              centerDifference:Math.abs(
                (dt.getBoundingClientRect().top+dt.getBoundingClientRect().bottom)/2 -
                (dd.getBoundingClientRect().top+dd.getBoundingClientRect().bottom)/2),
              linkedCenterDifference:a?Math.abs(
                (a.getBoundingClientRect().top+a.getBoundingClientRect().bottom)/2 -
                (dt.getBoundingClientRect().top+dt.getBoundingClientRect().bottom)/2):null,
              itemHeight:item.getBoundingClientRect().height,
            };
          });
          const port=document.querySelector('.related-carousel__viewport').getBoundingClientRect();
          const meta=[...document.querySelectorAll('.related-card__tag--reason')].map(tag=>
            tag.getBoundingClientRect().bottom);
          return {boxes,portBottom:port.bottom,lastTagBottom:Math.max(...meta)};
        }""")
        for item in outcome["boxes"]:
            assert item["labelLines"] == 1, f"{width}: wrapped {item['label']}: {item}"
            assert item["centerDifference"] < 2.5, f"{width}: misaligned {item}"
            if item["linkedCenterDifference"] is not None:
                assert item["linkedCenterDifference"] < 4, f"{width}: publisher link misaligned: {item}"
        if width <= 560:
            assert page.locator(".ccg-behind-pixels-inline__list").evaluate(
                "(n)=>getComputedStyle(n).gridTemplateColumns.trim().split(/\s+/).length"
            ) == 1, f"{width}: credits must use one full-width record per row"
            for nav in page.locator(".ccg-floating-nav__btn").all():
                measures = nav.evaluate("""n => {
                  const label=n.querySelector('.ccg-floating-nav__label');
                  return {text:label.textContent, required:label.scrollWidth, available:label.clientWidth};
                }""")
                assert measures["required"] <= measures["available"] + 1, (
                    f"{width}: floating nav label overflows: {measures}"
                )
            assert page.locator(".ccg-back-to-top-wrap").evaluate(
                "(n)=>getComputedStyle(n).display"
            ) == "none", f"{width}: duplicate TOP button overlaps footer links"
            for row in page.locator(".ccg-behind-pixels-inline__item").all():
                metrics = row.locator("dd").evaluate("""n => {
                  const range=document.createRange();range.selectNodeContents(n);
                  return {width:n.getBoundingClientRect().width, lines:range.getClientRects().length};
                }""")
                assert metrics["width"] >= 105, f"{width}: squeezed credit value: {metrics}"
                assert metrics["lines"] <= 3, f"{width}: letter-by-letter name wrapping: {metrics}"
        assert outcome["lastTagBottom"] <= outcome["portBottom"] - 2, (
            f"{width}: related publisher labels clipped: {outcome}"
        )

        page.evaluate("""(source) => {
          const setup = new Function(source + '; return setupQuickActionsFooterGuard;')();
          setup(document.querySelector('[data-game-quick-actions]'));
        }""", GUARD)
        page.evaluate("window.scrollTo(0,0)")
        page.wait_for_timeout(120)
        assert not page.locator(".game-quick-actions").evaluate("(n)=>n.classList.contains('is-near-footer')"), (
            f"{width}: actions prematurely hidden"
        )
        page.locator("#support-cta").scroll_into_view_if_needed()
        page.wait_for_timeout(180)
        assert page.locator(".game-quick-actions").evaluate("(n)=>n.classList.contains('is-near-footer')"), (
            f"{width}: quick actions must retire before footer support message"
        )
        assert page.locator(".game-quick-actions").evaluate("(n)=>getComputedStyle(n).visibility") == "hidden"
        assert page.locator("#support-cta").is_visible()
        page.evaluate("window.scrollTo(0,0)")
        page.wait_for_timeout(160)
        assert page.locator(".game-quick-actions").evaluate("(n)=>getComputedStyle(n).visibility") == "visible", (
            f"{width}: scroll-up must restore quick actions"
        )
        print(f"PASS: {width}px credits, full-height carousel, footer support and floating actions")
    finally:
        ctx.close()

def main():
    binary = shutil.which("google-chrome") or shutil.which("chromium")
    if not binary:
        raise RuntimeError("Chromium executable unavailable")
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=binary, headless=True, args=["--no-sandbox"])
        try:
            run(browser, 1740, 900)
            run(browser, 430, 900)
            run(browser, 390, 844)
            run(browser, 360, 780)
        finally:
            browser.close()

if __name__ == "__main__":
    main()
