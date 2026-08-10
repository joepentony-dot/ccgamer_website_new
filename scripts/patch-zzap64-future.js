#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function patchFile(relativePath, patches) {
  const target = path.join(ROOT, relativePath);
  let source = fs.readFileSync(target, "utf8");

  for (const { before, after, label } of patches) {
    if (!source.includes(before)) {
      if (source.includes(after)) continue;
      throw new Error(`${relativePath}: could not find ${label}`);
    }
    source = source.replace(before, after);
  }

  fs.writeFileSync(target, source, "utf8");
  console.log(`Patched ${relativePath}`);
}

patchFile("js/zzap64-awards.js", [
  {
    label: "archive comment",
    before: "   Original-magazine links use a generated, local verification map;\n   page numbers are never guessed and unresolved entries fall back\n   to the correct official Zzap!64 issue.",
    after: "   Original-magazine links use a generated verification map backed\n   by the official Zzap Bible; page numbers are never guessed.\n   Available award-year files are discovered from that map."
  },
  {
    label: "default years constant",
    before: "    const YEARS = [1985, 1986, 1987, 1988, 1989];",
    after: "    const DEFAULT_YEARS = [1985, 1986, 1987, 1988, 1989];"
  },
  {
    label: "state years",
    before: "    const state = {\n        entries: [],",
    after: "    const state = {\n        years: DEFAULT_YEARS.slice(),\n        entries: [],"
  },
  {
    label: "magazine link fallback",
    before: `    function magazineLinkFor(entry) {
        const issue = issueNumber(entry);
        if (!issue) return null;

        const record = state.reviewLinks.get(awardRecordKey(entry));
        const recordUrl = safeZzapUrl(record?.url);
        if (
            recordUrl
            && Number(record?.issue) === issue
            && (record.precision === "page" || record.precision === "issue")
        ) {
            return {
                issue,
                page: Number.isInteger(Number(record.page)) && Number(record.page) > 0 ? Number(record.page) : null,
                precision: record.precision,
                url: recordUrl
            };
        }

        return {
            issue,
            page: null,
            precision: "issue",
            url: officialIssueUrl(issue)
        };
    }`,
    after: `    function magazineLinkFor(entry) {
        const issue = issueNumber(entry);
        if (!issue) return null;

        const record = state.reviewLinks.get(awardRecordKey(entry));
        const recordUrl = safeZzapUrl(record?.url);
        if (
            recordUrl
            && Number(record?.issue) === issue
            && record.precision === "page"
            && Number.isInteger(Number(record.page))
            && Number(record.page) > 0
        ) {
            return {
                issue,
                page: Number(record.page),
                precision: "page",
                url: recordUrl
            };
        }

        return { issue, page: null, precision: "pending", url: "" };
    }`
  },
  {
    label: "year cards",
    before: `        const fragment = document.createDocumentFragment();
        YEARS.forEach((year) => {
            const meta = YEAR_META[year];`,
    after: `        const fragment = document.createDocumentFragment();
        state.years.forEach((year) => {
            const meta = YEAR_META[year] || {
                label: "Zzap!64 awards retrospective",
                page: \`/retro-specials/zzap64-gold-medals-sizzlers-\${year}/\`
            };`
  },
  {
    label: "magazine renderer",
    before: `    function renderMagazineLink(entry) {
        const magazine = magazineLinkFor(entry);
        if (!magazine) return "";

        const exactPage = magazine.precision === "page" && magazine.page;
        const label = exactPage ? "Read original Zzap!64 review" : "Browse original Zzap!64 issue";
        const detail = exactPage ? \`Issue \${magazine.issue} · p\${magazine.page}\` : \`Issue \${magazine.issue}\`;
        const aria = exactPage
            ? \`Open the original Zzap!64 review of \${entry.title}, issue \${magazine.issue}, page \${magazine.page}\`
            : \`Open Zzap!64 issue \${magazine.issue}, containing the original review of \${entry.title}\`;

        return \`
            <a class="zzap-award-card__magazine-link\${exactPage ? " zzap-award-card__magazine-link--page" : ""}"
               href="\${escapeHtml(magazine.url)}"
               target="_blank"
               rel="noopener noreferrer external"
               aria-label="\${escapeHtml(aria)}">
                <span class="zzap-award-card__magazine-label">\${escapeHtml(label)} <span aria-hidden="true">↗</span></span>
                <span class="zzap-award-card__magazine-detail">\${escapeHtml(detail)} · zzap64.co.uk</span>
            </a>
        \`;
    }`,
    after: `    function renderMagazineLink(entry) {
        const magazine = magazineLinkFor(entry);
        if (!magazine) return "";

        if (magazine.precision !== "page" || !magazine.page || !magazine.url) {
            return \`
                <span class="zzap-award-card__magazine-link zzap-award-card__magazine-link--pending">
                    <span class="zzap-award-card__magazine-label">Original Zzap!64 scan pending verification</span>
                    <span class="zzap-award-card__magazine-detail">Issue \${escapeHtml(magazine.issue)}</span>
                </span>
            \`;
        }

        const aria = \`Open the original Zzap!64 review of \${entry.title}, issue \${magazine.issue}, page \${magazine.page}\`;
        return \`
            <a class="zzap-award-card__magazine-link zzap-award-card__magazine-link--page"
               href="\${escapeHtml(magazine.url)}"
               target="_blank"
               rel="noopener noreferrer external"
               aria-label="\${escapeHtml(aria)}">
                <span class="zzap-award-card__magazine-label">Read original Zzap!64 review <span aria-hidden="true">↗</span></span>
                <span class="zzap-award-card__magazine-detail">Issue \${escapeHtml(magazine.issue)} · p\${escapeHtml(magazine.page)} · zzap64.co.uk</span>
            </a>
        \`;
    }`
  },
  {
    label: "dynamic filter summary",
    before: "        const context = parts.length ? parts.join(\" · \") : \"All indexed awards from 1985–1989\";",
    after: "        const yearRange = state.years.length ? `${state.years[0]}–${state.years[state.years.length - 1]}` : \"available years\";\n        const context = parts.length ? parts.join(\" · \") : `All indexed awards from ${yearRange}`;"
  },
  {
    label: "load review links years",
    before: `            const data = await response.json();
            const records = data && typeof data.entries === "object" && data.entries ? data.entries : {};
            state.reviewLinks = new Map(Object.entries(records));
            state.reviewLinksStatus = "ready";`,
    after: `            const data = await response.json();
            const records = data && typeof data.entries === "object" && data.entries ? data.entries : {};
            const years = Array.isArray(data?.years)
                ? data.years.map(Number).filter((year) => Number.isInteger(year) && year >= 1985).sort((a, b) => a - b)
                : [];
            state.years = years.length ? [...new Set(years)] : DEFAULT_YEARS.slice();
            state.reviewLinks = new Map(Object.entries(records));
            state.reviewLinksStatus = "ready";`
  },
  {
    label: "review link failure text",
    before: "            console.warn(\"[CCG] Exact Zzap!64 magazine page links were unavailable; issue links will be used.\", error);",
    after: "            state.years = DEFAULT_YEARS.slice();\n            console.warn(\"[CCG] Exact Zzap!64 magazine page links were unavailable; direct scan links will remain pending.\", error);"
  },
  {
    label: "award load heading",
    before: "        updateProgress(8, \"Loading award records…\", \"Fetching the five year files in parallel.\");\n        const yearResults = await Promise.all(YEARS.map(async (year) => {",
    after: "        updateProgress(8, \"Loading award records…\", `Fetching ${state.years.length} year file${state.years.length === 1 ? \"\" : \"s\"} in parallel.`);\n        const yearResults = await Promise.all(state.years.map(async (year) => {"
  },
  {
    label: "year stats and filter",
    before: `        const total = document.getElementById("zzapTotalCount");
        if (total) total.textContent = state.entries.length.toLocaleString("en-GB");
        renderYearCards();
        bindFilters();`,
    after: `        const total = document.getElementById("zzapTotalCount");
        if (total) total.textContent = state.entries.length.toLocaleString("en-GB");

        const yearRange = document.getElementById("zzapYearRange");
        const yearCount = document.getElementById("zzapYearCount");
        if (yearRange && state.years.length) yearRange.textContent = \`\${state.years[0]}–\${state.years[state.years.length - 1]}\`;
        if (yearCount) yearCount.textContent = \`\${state.years.length} year\${state.years.length === 1 ? "" : "s"} covered\`;

        const yearFilter = document.getElementById("zzapYearFilter");
        if (yearFilter) {
            yearFilter.textContent = "";
            const all = document.createElement("option");
            all.value = "all";
            all.textContent = "All years";
            yearFilter.appendChild(all);
            state.years.forEach((year) => {
                const option = document.createElement("option");
                option.value = String(year);
                option.textContent = String(year);
                yearFilter.appendChild(option);
            });
            state.year = "all";
        }

        renderYearCards();
        bindFilters();`
  },
  {
    label: "magazine load detail",
    before: `        const exactCount = Array.from(state.reviewLinks.values()).filter((record) => record?.precision === "page").length;
        const magazineDetail = state.reviewLinksStatus === "ready"
            ? \` \${exactCount.toLocaleString("en-GB")} exact original-review scan links are available; the rest open the correct issue.\`
            : " Original-magazine links will open the correct issue where an exact scan reference is unavailable.";`,
    after: `        const exactCount = state.entries.filter((entry) => magazineLinkFor(entry)?.precision === "page").length;
        const magazineDetail = state.reviewLinksStatus === "ready"
            ? (exactCount === state.entries.length
                ? " Every indexed award has a verified direct original-review scan link."
                : \` \${exactCount.toLocaleString("en-GB")} direct original-review scan links are verified; unresolved links remain pending rather than opening a generic issue.\`)
            : " Direct original-review links will remain pending until the verification map is available.";`
  },
  {
    label: "init loading detail",
    before: "        updateProgress(2, \"Preparing archive…\", \"Starting the title matcher and original-magazine index.\");",
    after: "        updateProgress(2, \"Preparing archive…\", \"Starting the title matcher and verified original-magazine index.\");"
  }
]);

patchFile("zzap64/index.html", [
  {
    label: "meta description",
    before: "Search the Cheeky Commodore Gamer archive of Zzap!64 Gold Medals, Sizzlers and Silver Medals from 1985 to 1989, covering Commodore 64 and Amiga games.",
    after: "Search the Cheeky Commodore Gamer year-by-year archive of Zzap!64 Gold Medals, Sizzlers and Silver Medals from 1985 onwards, covering Commodore 64 and Amiga games."
  },
  {
    label: "schema description",
    before: "A searchable archive of Zzap!64 Gold Medals, Sizzlers and Silver Medals from 1985 to 1989.",
    after: "A searchable year-by-year archive of Zzap!64 Gold Medals, Sizzlers and Silver Medals from 1985 onwards."
  },
  {
    label: "dynamic year stat",
    before: "<div class=\"zzap-archive__stat\"><strong>1985–1989</strong><span>five years covered</span></div>",
    after: "<div class=\"zzap-archive__stat\"><strong id=\"zzapYearRange\">1985–1989</strong><span id=\"zzapYearCount\">5 years covered</span></div>"
  },
  {
    label: "loading year text",
    before: "Preparing the five year award index.",
    after: "Preparing the available Zzap!64 award years."
  },
  {
    label: "dynamic year select",
    before: "<select id=\"zzapYearFilter\" disabled><option value=\"all\">All years</option><option>1985</option><option>1986</option><option>1987</option><option>1988</option><option>1989</option></select>",
    after: "<select id=\"zzapYearFilter\" disabled><option value=\"all\">All years</option></select>"
  }
]);

patchFile("resources/css/zzap64-awards.css", [
  {
    label: "pending magazine link style",
    before: ".zzap-award-card__game-link:hover .zzap-award-card__game-name,",
    after: `.zzap-award-card__magazine-link--pending {
    cursor: default;
    opacity: .58;
    border-style: dashed;
}

.zzap-award-card__game-link:hover .zzap-award-card__game-name,`
  }
]);

patchFile("tests/zzap64-review-links.test.mjs", [
  {
    label: "dynamic test years",
    before: "const years = [1985, 1986, 1987, 1988, 1989];",
    after: "const years = generator.awardYears();"
  },
  {
    label: "direct coverage assertions",
    before: `  assert.equal(data.totals.exactPages + data.totals.issueFallbacks, awards.length);

  awards.forEach((entry) => {`,
    after: `  assert.equal(data.totals.exactPages + data.totals.issueFallbacks, awards.length);
  assert.equal(data.totals.issueFallbacks, 0, 'Every indexed award must resolve to a direct original Zzap!64 scan page.');
  assert.equal(data.totals.exactPages, awards.length);

  awards.forEach((entry) => {`
  },
  {
    label: "Armalyte regression test",
    before: "test('archive renderer exposes original-magazine links without replacing CCG game links', () => {",
    after: `test('Armalyte resolves to Zzap!64 issue 43 page 24', () => {
  const data = readJson('data/zzap64-review-links.json');
  const record = data.entries['1988|november|c64|Armalyte'];
  assert.ok(record);
  assert.equal(record.precision, 'page');
  assert.equal(record.issue, 43);
  assert.equal(record.page, 24);
  assert.equal(record.url, 'https://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=43&page=24');
});

test('archive renderer exposes original-magazine links without replacing CCG game links', () => {`
  },
  {
    label: "no generic browse label",
    before: "  assert.match(source, /Browse original Zzap!64 issue/);",
    after: "  assert.doesNotMatch(source, /Browse original Zzap!64 issue/);\n  assert.match(source, /Original Zzap!64 scan pending verification/);"
  }
]);

console.log("Prepared dynamic future-year archive, direct-scan-only renderer and strict review-link regression checks.");
