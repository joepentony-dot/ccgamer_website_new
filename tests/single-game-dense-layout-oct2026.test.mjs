import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const css = fs.readFileSync("resources/css/game-pages.css", "utf8");
const loader = fs.readFileSync("js/load-single-game.js", "utf8");

test("compact layout is scoped to individual game pages", () => {
    assert.match(css, /OMEGA SINGLE-GAME DENSE RECORD — OCTOBER 2026/);
    assert.match(css, /\.ccg-page--single-game #game-video-section:not\(\[hidden\]\)/);
    assert.match(css, /\.ccg-page--single-game \.game-hero/);
    assert.match(css, /\.ccg-page--single-game \.related-carousel \.related-card img/);
    assert.match(css, /\.ccg-page--single-game #affiliate-products-section/);
    assert.match(css, /@media \(max-width: 900px\)/);
    assert.match(css, /@media \(max-width: 560px\)/);
    assert.match(css, /min-height: 44px/);
});

function exerciseOverview(length) {
    const start = loader.indexOf("    // Progressive enhancement only: preserve complete crawlable HTML");
    const end = loader.indexOf("    if (hasVideo && videoIncludesOverview && descriptionSection)", start);
    assert.ok(start > 0 && end > start);
    const snippet = loader.slice(start, end);
    const inserts = [];
    const listeners = {};
    const nodes = [];
    const parent = { insertBefore(node, source) { inserts.push({ node, source }); } };
    const description = {
        id: "", textContent: "X".repeat(length), hidden: false, parentNode: parent,
        closest() { return null; }
    };
    const document = {
        createElement(tag) {
            const attributes = {};
            const node = {
                tag, attributes, children: [], className: "",
                classList: {
                    active: false,
                    toggle(name) {
                        assert.equal(name, "is-expanded");
                        this.active = !this.active;
                        return this.active;
                    }
                },
                setAttribute(k, v) { attributes[k] = v; },
                appendChild(child) { this.children.push(child); },
                addEventListener(type, fn) { listeners[type] = fn; }
            };
            nodes.push(node);
            return node;
        }
    };
    vm.runInNewContext("(function() { const videoIncludesOverview = true; " + snippet + " })()", {
        hasVideo: true, videoDescription: description, document
    });
    return { description, inserts, nodes, listeners };
}

test("long overview is expandable without deleting editorial text", () => {
    const result = exerciseOverview(900);
    assert.equal(result.inserts.length, 1);
    const wrapper = result.inserts[0].node;
    const toggle = result.nodes.find(x => x.tag === "button");
    assert.equal(wrapper.className, "ccg-game-overview");
    assert.equal(toggle.attributes["aria-expanded"], "false");
    assert.equal(toggle.attributes["aria-controls"], result.description.id);
    assert.ok(wrapper.children.includes(result.description));
    assert.equal(result.description.textContent.length, 900);
    result.listeners.click();
    assert.equal(toggle.attributes["aria-expanded"], "true");
    assert.equal(toggle.textContent, "Show less");
    result.listeners.click();
    assert.equal(toggle.attributes["aria-expanded"], "false");
    assert.equal(toggle.textContent, "Read full overview");
});

test("short overview is left as written", () => {
    const result = exerciseOverview(180);
    assert.equal(result.inserts.length, 0);
    assert.equal(result.nodes.length, 0);
});

test("representative static pages retain canonical and media elements", () => {
    const w = fs.readFileSync("games/wasteland/index.html", "utf8");
    const old = fs.readFileSync("games/20-tons/index.html", "utf8");
    for (const html of [w, old]) {
        assert.match(html, /<meta name="robots" content="index,follow">/);
        assert.match(html, /data-ccg-schema="game-graph"/);
        assert.match(html, /<section id="game-video-section"/);
        assert.match(html, /id="gameManualBtn"/);
        assert.match(html, /id="game-reading-section"/);
    }
    assert.match(w, /games\/wasteland\//);
    assert.match(w, /data-ccg-video-description/);
    assert.match(w, /ccg-magazine-reviews--static/);
});
