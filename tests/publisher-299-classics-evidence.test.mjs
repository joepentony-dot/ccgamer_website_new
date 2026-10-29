import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const history = require("../scripts/materialize-publisher-histories.js");
const root = process.cwd();
const html = fs.readFileSync(path.join(root,"games/publishers/2-99-classics/index.html"),"utf8");
const metadata = JSON.parse(fs.readFileSync(path.join(root,"games/publishers/publishers.json"),"utf8"));

test("2.99 Classics history is independently sourced and preserves original/re-release dates",()=>{
  const profile = history.loadProfiles().find(x=>x.slug==="2-99-classics");
  assert.ok(profile,"profile must survive historical registry reload");
  const safe = history.sanitizeProfile(profile);
  assert.equal(safe.sourceBacked,true);
  assert.equal(safe.sources.length,3);
  assert.ok(safe.sources.every(x=>x.url.startsWith("https://")&&!history.isFirstPartyEvidenceUrl(x.url)));
  assert.match(safe.summary,/1986/);
  assert.match(safe.note,/1985/);
  assert.ok(safe.facts.some(x=>/Elite Systems/.test(x)));
  const eligible = metadata.find(x=>x.slug==="2-99-classics");
  assert.ok(eligible && eligible.count===1 && eligible.firstYear===1985);
  assert.equal(history.isPublisherIndexable(eligible,safe),true);
});

test("static archive history is exactly reproducible from registered evidence",()=>{
  const profile = history.loadProfiles().find(x=>x.slug==="2-99-classics");
  const map = history.buildArchiveMap(metadata);
  const generated = history.renderHistorySection(profile,map);
  const left = html.indexOf(history.HISTORY_START),right = html.indexOf(history.HISTORY_END);
  assert.ok(left>=0&&right>left,"source-backed static publisher block must be present");
  const published = html.slice(left,right+history.HISTORY_END.length);
  assert.equal(published,generated,"history must not drift from the authoritative renderer");
  assert.ok(html.includes('<link rel="stylesheet" href="/resources/css/publisher-history.css">'));
  assert.ok(html.includes('href="/games/publishers/elite/"'));
  assert.ok(html.includes('href="/games/publishers/"'));
  assert.ok(html.includes('name="robots" content="index,follow"'));
  assert.ok(html.includes('<link rel="canonical" href="https://www.cheekycommodoregamer.co.uk/games/publishers/2-99-classics/">'));
  assert.ok(html.includes('href="/games/skool-daze/"'));
  assert.ok(published.includes("1986")&&published.includes("1985"));
  assert.ok(!published.includes("2.99 Classics published the original"));
});
