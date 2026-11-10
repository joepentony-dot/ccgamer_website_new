"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { removeVideoObjectScripts, enhancePage } = require("../scripts/generate-retro-video-seo.js");
const fs = require("node:fs");
const path = require("node:path");

test("removes indented VideoObject plus its newline without whitespace-only residue", () => {
  const markup = [
    "<head>",
    '    <script type="application/ld+json" data-ccg-schema="retro-video">',
    '{"@context":"https://schema.org","@type":"VideoObject"}',
    "    </script>",
    '    <meta name="description" content="A retro feature" />',
    "</head>"
  ].join("\n");
  const result = removeVideoObjectScripts(markup);
  assert.doesNotMatch(result, /"VideoObject"/);
  assert.doesNotMatch(result, /^[ \t]+$/m, "No orphan indentation-only lines");
  assert.match(result, /^    <meta name="description"/m);
  assert.equal(removeVideoObjectScripts(result), result, "A second generation pass is idempotent");
});

test("retains ordinary BreadcrumbList JSON-LD including its exact whitespace", () => {
  const markup = [
    "<head>",
    '    <script type="application/ld+json">',
    '{"@context":"https://schema.org","@type":"BreadcrumbList"}',
    "    </script>",
    "</head>"
  ].join("\n");
  assert.equal(removeVideoObjectScripts(markup), markup);
});

test("removes inline legacy VideoObject without deleting adjacent tags", () => {
  const markup = '<meta name="one"><script type="application/ld+json">{"@type":"VideoObject"}</script><meta name="two">';
  assert.equal(removeVideoObjectScripts(markup), '<meta name="one"><meta name="two">');
});

test("Pages staging restores retro VideoObject and validates it before sitemap generation", () => {
  const deploy = fs.readFileSync(
    path.join(__dirname, "../.github/workflows/deploy-github-pages-omega-stable.yml"),
    "utf8"
  );
  const start = deploy.indexOf("node scripts/generate-retro-pages.js --root _site");
  const enrich = deploy.indexOf('CCG_REPO_ROOT="$PWD/_site" node scripts/generate-retro-video-seo.js');
  const discovery = deploy.indexOf('CCG_REPO_ROOT="$PWD/_site" node scripts/generate-video-library.js');
  const validate = deploy.indexOf('CCG_REPO_ROOT="$PWD/_site" node scripts/validate-retro-video-seo.js');
  const validateDiscovery = deploy.indexOf('CCG_REPO_ROOT="$PWD/_site" node scripts/validate-video-library.js');
  const index = deploy.indexOf("(cd _site && node scripts/generate-sitemaps.js)");
  const removeTools = deploy.indexOf("rm -rf _site/scripts", start);
  assert.ok(start >= 0, "Pages must rebuild authoritative retro watch pages");
  assert.ok(enrich > start, "Rebuild must be followed by VideoObject/sitemap enrichment");
  assert.ok(discovery > enrich, "Restore authored discovery only after VideoObject enrichment");
  assert.ok(validate > discovery, "Validate the final enriched video markup");
  assert.ok(validateDiscovery > discovery && validateDiscovery < index,
    "Published chapters and video library must be validated before the sitemap index");
  assert.ok(index > validate, "Video sitemap must exist before producing the sitemap index");
  assert.ok(removeTools > validate, "The staged validation must run before staging tools are removed");
  assert.equal(
    deploy.split('CCG_REPO_ROOT="$PWD/_site" node scripts/generate-retro-video-seo.js').length - 1,
    1,
    "Do not duplicate enrichment"
  );
});

test("retro video enrichment restores verified JSON-LD after template regeneration without unverified dates", () => {
  const canonicalUrl = "https://www.cheekycommodoregamer.co.uk/amiga-demo-music/state-of-the-art/";
  const entry = {
    title: "State of the Art",
    seo: { description: "Spaceballs released State of the Art in 1992." },
    thumbnail: "https://img.youtube.com/vi/USTUwD_eH2c/hqdefault.jpg"
  };
  const source = [
    '<html lang="en"><head>',
    '<meta name="description" content="Spaceballs" />',
    "<!-- CCG_VIDEO_SCHEMA -->",
    "</head><body></body></html>"
  ].join("\n");
  const context = {
    entry,
    videoId: "USTUwD_eH2c",
    canonicalUrl,
    metadata: { verifiedBy: "youtube-data-api-v3", uploadDate: "2024-01-20", title: "State of the Art" },
    videoIndexable: true
  };
  const restored = enhancePage(source, context);
  const match = restored.match(/<script type="application\/ld\+json" data-ccg-schema="retro-video">\s*([\s\S]*?)<\/script>/);
  assert.ok(match, "Verified YouTube data must produce a VideoObject in regenerated HTML");
  const schema = JSON.parse(match[1]);
  assert.equal(schema["@type"], "VideoObject");
  assert.equal(schema.url, canonicalUrl);
  assert.equal(schema.description, entry.seo.description);
  assert.equal(schema.uploadDate, "2024-01-20");
  assert.equal((restored.match(/"@type": "VideoObject"/g) || []).length, 1);
  const unverified = enhancePage(source, { ...context, metadata: {}, videoIndexable: true });
  assert.doesNotMatch(unverified, /"@type": "VideoObject"/, "Do not invent YouTube upload dates");
  const membersOnly = enhancePage(source, { ...context, videoIndexable: false });
  assert.doesNotMatch(membersOnly, /"@type": "VideoObject"/, "Members-only metadata must not be exposed");
});


test("real staged retro regeneration validates all ten demo pages and is repeatable", () => {
  const { execFileSync } = require("node:child_process");
  const os = require("node:os");
  const root = path.resolve(__dirname, "..");
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-retro-pages-staging-"));
  const sourcePaths = [
    "data/retro-specials.json",
    "data/retro-events.json",
    "data/amiga-demo-music.json",
    "data/video-metadata.json",
    "admin/templates/retro-video-template.html",
    "admin/templates/video-library-template.html"
  ];

  const execute = (script, args = [], environment = {}) => execFileSync(
    process.execPath,
    [path.join(root, "scripts", script), ...args],
    {
      cwd: root,
      env: { ...process.env, ...environment },
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 4 * 1024 * 1024
    }
  );

  try {
    for (const sourcePath of sourcePaths) {
      const destination = path.join(stage, sourcePath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(root, sourcePath), destination);
    }

    const demos = JSON.parse(fs.readFileSync(path.join(stage, "data/amiga-demo-music.json"), "utf8"));
    const records = JSON.parse(fs.readFileSync(path.join(stage, "data/video-metadata.json"), "utf8")).videos || {};
    // This isolated fixture qualifies the retro portion of the real companion
    // pipeline; full Pages CI separately checks the actual 666-game catalogue.
    fs.mkdirSync(path.join(stage, "games"), { recursive: true });
    fs.writeFileSync(path.join(stage, "games/games.json"), "[]\n");
    const specials = JSON.parse(fs.readFileSync(path.join(stage, "data/retro-specials.json"), "utf8"));
    const quizzes = specials.filter((entry) => ["50-commodore-64-games-can-you-identify-them",
      "50-amiga-games-can-you-identify-them", "50-zx-spectrum-games-can-you-identify-them"].includes(entry.slug));
    assert.equal(quizzes.length, 3);
    const changedMetadata = JSON.parse(fs.readFileSync(path.join(stage, "data/video-metadata.json"), "utf8"));
    for (const quiz of quizzes) {
      changedMetadata.videos[quiz.youtubeId].description = "00:00 Changed upstream description\n00:01 Incomplete guide";
    }
    fs.writeFileSync(path.join(stage, "data/video-metadata.json"), JSON.stringify(changedMetadata));
    assert.equal(demos.length, 10, "All ten original Amiga demo routes must be retained");

    const rebuildAndValidate = () => {
      execute("generate-retro-pages.js", ["--root", stage]);
      execute("generate-retro-video-seo.js", [], { CCG_REPO_ROOT: stage });
      execute("generate-video-library.js", [], { CCG_REPO_ROOT: stage });
      execute("validate-retro-video-seo.js", [], { CCG_REPO_ROOT: stage });
      execute("validate-video-library.js", [], { CCG_REPO_ROOT: stage });

      const pages = new Map();
      const sitemap = fs.readFileSync(path.join(stage, "sitemap-retro-videos.xml"), "utf8");
      for (const demo of demos) {
        const url = "https://www.cheekycommodoregamer.co.uk/amiga-demo-music/" + demo.slug + "/";
        const htmlPath = path.join(stage, "amiga-demo-music", demo.slug, "index.html");
        assert.ok(fs.existsSync(htmlPath), demo.slug + " must exist in staged output");
        const html = fs.readFileSync(htmlPath, "utf8");
        assert.ok(html.includes('<link rel="canonical" href="' + url + '"'), demo.slug + " must retain its canonical");
        assert.ok(html.includes("https://www.youtube-nocookie.com/embed/" + demo.youtubeId), demo.slug + " must retain its video");
        const videoObjects = (html.match(/"@type": "VideoObject"/g) || []).length;
        const record = records[demo.youtubeId] || {};
        const verified = record.verifiedBy === "youtube-data-api-v3" &&
          /^\d{4}-\d{2}-\d{2}/.test(String(record.uploadDate || ""));
        assert.equal(videoObjects, verified && !demo.membersOnly ? 1 : 0,
          demo.slug + " must have exactly one VideoObject only for verified public metadata");
        assert.equal(sitemap.includes("<loc>" + url + "</loc>"), !demo.membersOnly,
          demo.slug + " must have the correct sitemap inclusion");
        pages.set(demo.slug, html);
      }
      for (const quiz of quizzes) {
        const html = fs.readFileSync(path.join(stage, "retro-specials", quiz.slug, "index.html"), "utf8");
        assert.equal((html.match(/data-video-chapter="/g) || []).length, 7,
          quiz.slug + " must retain its published chapters after final Pages enrichment");
        const video = JSON.parse(html.match(/<script type="application\/ld\+json" data-ccg-schema="retro-video">\s*([\s\S]*?)<\/script>/)[1]);
        assert.equal(video.hasPart.length, 7);
        assert.deepEqual(video.hasPart.map((clip) => clip.name), quiz.chapters.map((chapter) => chapter.title));
        pages.set(quiz.slug, html);
      }
      const showdown = fs.readFileSync(path.join(stage, "retro-specials/c64-vs-amiga-100-games-compared/index.html"), "utf8");
      assert.equal((showdown.match(/data-video-chapter="/g) || []).length, 111);
      assert.equal((showdown.match(/<details\b/g) || []).length, 10);
      assert.ok(showdown.includes("Can you guess the higher reader rating?"));
      assert.ok(showdown.includes('data-ccg-youtube-src="https://www.youtube-nocookie.com/embed/ygPOtslHRfk"'));
      pages.set("c64-vs-amiga-100-games-compared", showdown);
      for (const privateEntry of specials.filter((entry) => entry.membersOnly === true)) {
        const html = fs.readFileSync(path.join(stage, "retro-specials", privateEntry.slug, "index.html"), "utf8");
        assert.doesNotMatch(html, /"@type": "VideoObject"|data-video-chapter="/,
          "Restricted entries must not gain public video metadata or chapters");
      }
      pages.set("videos/index.html", fs.readFileSync(path.join(stage, "videos/index.html"), "utf8"));
      pages.set("videos/video-index.json", fs.readFileSync(path.join(stage, "videos/video-index.json"), "utf8"));
      return { pages, sitemap };
    };

    const first = rebuildAndValidate();
    const second = rebuildAndValidate();
    assert.equal(second.sitemap, first.sitemap, "Repeat generation must preserve the video sitemap byte-for-byte");
    for (const [slug, html] of first.pages) {
      assert.equal(second.pages.get(slug), html, slug + " must regenerate identically");
    }

    // Pages deploys GoatCounter after the final retro/SEO generation pass.
    // Test the actual staged watch pages rather than only generic fixtures.
    execute("ensure-goatcounter-coverage.js", ["--root", stage]);
    execute("ensure-goatcounter-coverage.js", ["--root", stage, "--check"]);
    const trackedPages = new Map();
    for (const demo of demos) {
      const htmlPath = path.join(stage, "amiga-demo-music", demo.slug, "index.html");
      const html = fs.readFileSync(htmlPath, "utf8");
      const route = "/amiga-demo-music/" + demo.slug + "/";
      // The existing retro template uses GoatCounter's default URL tracking.
      // A settings attribute is optional; when present it must use this route.
      const settingsTag = (html.match(/data-goatcounter-settings=(["'])(.*?)\1/i) || [])[2];
      const effectivePath = settingsTag
        ? JSON.parse(settingsTag.replace(/&#39;/g, "'")).path
        : route;
      assert.match(html, /<meta\s+name="robots"\s+content="index,follow/i,
        demo.slug + " must remain indexable");
      assert.equal((html.match(/data-goatcounter=/g) || []).length, 1,
        demo.slug + " must have exactly one GoatCounter tracker");
      assert.match(html, /data-goatcounter="https:\/\/cheekycommodoregamer\.goatcounter\.com\/count"/,
        demo.slug + " must retain the CCG GoatCounter endpoint");
      assert.match(html, /src="https:\/\/gc\.zgo\.at\/count\.js"/,
        demo.slug + " must load the expected GoatCounter script");
      assert.equal(effectivePath, route,
        demo.slug + " must track its canonical path");
      trackedPages.set(demo.slug, html);
    }

    // Re-running the deployment postprocessor must not alter content,
    // video schema, canonicals or tracking on the ten watch pages.
    execute("ensure-goatcounter-coverage.js", ["--root", stage]);
    execute("ensure-goatcounter-coverage.js", ["--root", stage, "--check"]);
    for (const [slug, html] of trackedPages) {
      assert.equal(
        fs.readFileSync(path.join(stage, "amiga-demo-music", slug, "index.html"), "utf8"),
        html,
        slug + " tracking and schema must be byte-identical on repeated postprocessing"
      );
    }
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
});

test("flat legacy retro redirect aliases preserve source-owned SEO, noindex and canonical routing", () => {
  // Regression: after correcting the canonical SEO source, a generated
  // metadata refresh must also correct the legacy .html redirect surfaces.
  const entries = JSON.parse(fs.readFileSync(
    path.join(__dirname, "../data/retro-specials.json"), "utf8"
  ));
  const slugs = [
    "50-essential-amiga-games",
    "50-essential-commodore-64-games",
    "c64-vs-zx-spectrum"
  ];
  for (const slug of slugs) {
    const matches = entries.filter((entry) => entry.slug === slug);
    assert.equal(matches.length, 1, slug + " has exactly one source record");
    const seo = matches[0].seo;
    assert.ok(seo && typeof seo.title === "string" && typeof seo.description === "string");
    const html = fs.readFileSync(
      path.join(__dirname, "../retro-specials", slug + ".html"), "utf8"
    );
    const canonical = "https://www.cheekycommodoregamer.co.uk/retro-specials/" + slug + "/";
    assert.ok(html.includes("<title>Redirecting to " + seo.title +
      " | Cheeky Commodore Gamer</title>"), slug + " legacy title must match source SEO");
    assert.ok(html.includes('content="Redirecting to the canonical page: ' +
      seo.description + '"'), slug + " legacy description must match source SEO");
    assert.ok(html.includes('<meta name="robots" content="noindex,follow" />'),
      slug + " legacy redirect must remain noindex");
    assert.ok(html.includes('<link rel="canonical" href="' + canonical + '"'),
      slug + " canonical must remain the real indexable page");
    assert.ok(html.includes('<meta http-equiv="refresh" content="0; url=/retro-specials/' +
      slug + '/"'), slug + " legacy redirect must target its original route");
  }
});

test("updated Spectrum quiz title stays identical across verified public video surfaces", () => {
  const id = "XxEhpjSoYc8";
  const metadata = JSON.parse(fs.readFileSync(
    path.join(__dirname, "../data/video-metadata.json"), "utf8"
  )).videos[id];
  assert.ok(metadata?.verifiedBy === "youtube-data-api-v3", "Use verified YouTube metadata only");
  const title = metadata.title;
  assert.ok(title && typeof title === "string");
  const page = fs.readFileSync(
    path.join(__dirname, "../retro-specials/50-zx-spectrum-games-can-you-identify-them/index.html"), "utf8"
  );
  const schemaMatch = page.match(
    /<script type="application\/ld\+json" data-ccg-schema="retro-video">\s*([\s\S]*?)<\/script>/
  );
  assert.ok(schemaMatch, "Spectrum quiz has its verified VideoObject");
  const video = JSON.parse(schemaMatch[1]);
  assert.equal(video.name, title, "VideoObject name matches verified metadata");
  assert.ok(page.includes('https://www.youtube.com/embed/' + id));
  const listings = JSON.parse(fs.readFileSync(
    path.join(__dirname, "../videos/video-index.json"), "utf8"
  )).items.filter((item) => item.id === id);
  assert.equal(listings.length, 1, "Video discovery has one Spectrum quiz entry");
  assert.equal(listings[0].title, title, "Video discovery title matches YouTube metadata");
  const xml = fs.readFileSync(
    path.join(__dirname, "../sitemap-retro-videos.xml"), "utf8"
  );
  assert.ok(xml.includes("<video:title>" + title + "</video:title>"),
    "Video sitemap title matches YouTube metadata");
  const library = fs.readFileSync(
    path.join(__dirname, "../videos/index.html"), "utf8"
  );
  assert.ok(library.includes('"name": "' + title + '"'),
    "Public video library structured data matches verified YouTube title");
});

test("locked retro-special SEO source agrees with generated HTML and verified VideoObject", () => {
  // Prevent a scheduled rebuild from overwriting editorial SEO improvements.
  // These are already the approved values in the website main HTML.
  const approved =   [
    [
      "50-essential-amiga-games",
      "Best Amiga Games – 50 Essential Amiga Games | CCG",
      "Discover 50 of the best Amiga games ever made, from arcade action and strategy to adventures, simulations and essential Commodore Amiga classics."
    ],
    [
      "50-essential-commodore-64-games",
      "Best C64 Games – 50 Essential Commodore 64 Games | CCG",
      "Discover 50 of the best Commodore 64 games ever made, covering essential C64 classics across arcade action, adventure, strategy, racing and more."
    ],
    [
      "c64-vs-zx-spectrum",
      "C64 vs ZX Spectrum – Commodore 64 vs Spectrum | CCG",
      "C64 vs ZX Spectrum: compare the Commodore 64 and Sinclair ZX Spectrum through their games, strengths, differences and enduring 8-bit rivalry."
    ]
  ];
  const entries = JSON.parse(fs.readFileSync(
    path.join(__dirname, "../data/retro-specials.json"), "utf8"
  ));
  for (const [slug, title, description] of approved) {
    const records = entries.filter((entry) => entry.slug === slug);
    assert.equal(records.length, 1, slug + " must have one canonical source record");
    assert.equal(records[0].seo?.title, title,
      slug + " must retain its already-published SEO title in authoritative JSON");
    assert.equal(records[0].seo?.description, description,
      slug + " must retain its already-published SEO description in authoritative JSON");

    const html = fs.readFileSync(
      path.join(__dirname, "../retro-specials", slug, "index.html"), "utf8"
    );
    const expectedTags = [
      "<title>" + title + "</title>",
      '<meta name="description" content="' + description + '"',
      '<meta property="og:title" content="' + title + '"',
      '<meta property="og:description" content="' + description + '"',
      '<meta name="twitter:title" content="' + title + '"',
      '<meta name="twitter:description" content="' + description + '"'
    ];
    for (const expected of expectedTags) {
      assert.ok(html.includes(expected), slug + " generated HTML differs from source: " + expected.slice(0, 50));
    }
    const videoSchemas = [...html.matchAll(
      /<script type="application\/ld\+json" data-ccg-schema="retro-video">\s*([\s\S]*?)<\/script>/g
    )];
    assert.equal(videoSchemas.length, 1, slug + " must retain one verified VideoObject");
    const schema = JSON.parse(videoSchemas[0][1]);
    assert.equal(schema["@type"], "VideoObject");
    assert.equal(schema.description, description,
      slug + " structured-data description must match authoritative SEO text");
  }
});
