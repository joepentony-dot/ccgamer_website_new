import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const staticSeoPages = [
  ["about.html", "AboutPage"],
  ["contact.html", "ContactPage"],
  ["emulation.html", "WebPage"],
  ["quiz/quiz.html", "WebPage"],
  ["community/index.html", "CollectionPage"],
  ["games/discover/index.html", "WebPage"]
];

for (const [path, schemaType] of staticSeoPages) {
  test(`${path} has indexable canonical and structured discovery metadata`, () => {
    const html = read(path);
    assert.match(html, /<meta[^>]+name="robots"[^>]+index,follow/i);
    assert.match(html, /<link[^>]+rel="canonical"/i);
    assert.match(html, /<meta[^>]+name="description"/i);
    assert.match(html, /application\/ld\+json/);
    assert.match(html, new RegExp(`"@type":"${schemaType}"`));
    assert.match(html, /"@type":"BreadcrumbList"/);
  });
}

for (const path of ["about.html", "contact.html", "install-app.html"]) {
  test(`${path} exposes complete social preview metadata`, () => {
    const html = read(path);
    assert.match(html, /property="og:title"/);
    assert.match(html, /property="og:description"/);
    assert.match(html, /property="og:image"/);
    assert.match(html, /name="twitter:card"/);
    assert.match(html, /name="twitter:image"/);
  });
}

for (const path of ["about.html", "contact.html", "emulation.html", "install-app.html", "quiz/quiz.html"]) {
  test(`${path} warms Google Fonts connections before shared font discovery`, () => {
    const html = read(path);
    assert.match(html, /rel="preconnect" href="https:\/\/fonts\.googleapis\.com"/);
    assert.match(html, /rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin/);
  });
}

test("install app retains HowTo schema and adds breadcrumbs/social discovery", () => {
  const html = read("install-app.html");
  assert.match(html, /"@type":\s*"HowTo"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, /property="og:title"/);
});

test("home retains its protected dual hero preload contract", () => {
  const html = read("home.html");
  assert.match(html, /rel="preload" as="image" href="resources\/images\/hero\/ccg-hero-c64\.png"/);
  assert.match(html, /rel="preload" as="image" href="resources\/images\/hero\/ccg-hero-amiga\.png"/);
});
