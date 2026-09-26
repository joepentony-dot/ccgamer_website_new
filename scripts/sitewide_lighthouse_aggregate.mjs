#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index].replace(/^--/, "").replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    result[key] = args[index + 1];
  }
  if (!result.inputDir || !result.outputJson || !result.outputMd) {
    throw new Error("Usage: --input-dir DIR --output-json FILE --output-md FILE");
  }
  return result;
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/sitewide-lighthouse-(?:mobile|desktop)-\d+\.json$/.test(entry.name)) files.push(full);
  }
  return files;
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values, fraction) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

function fmt(value, digits = 0) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : "n/a";
}

function summariseGroup(items) {
  const valid = items.filter((item) => !item.error);
  return {
    pages: items.length,
    errors: items.length - valid.length,
    performance_median: median(valid.map((item) => item.scores?.performance)),
    performance_p25: percentile(valid.map((item) => item.scores?.performance), 0.25),
    accessibility_median: median(valid.map((item) => item.scores?.accessibility)),
    best_practices_median: median(valid.map((item) => item.scores?.best_practices)),
    seo_median: median(valid.map((item) => item.scores?.seo)),
    lcp_p75_ms: percentile(valid.map((item) => item.metrics?.lcp_ms), 0.75),
    cls_p75: percentile(valid.map((item) => item.metrics?.cls), 0.75),
    tbt_p75_ms: percentile(valid.map((item) => item.metrics?.tbt_ms), 0.75),
    performance_below_90: valid.filter((item) => Number.isFinite(item.scores?.performance) && item.scores.performance < 90).length,
    lcp_over_2500: valid.filter((item) => Number.isFinite(item.metrics?.lcp_ms) && item.metrics.lcp_ms > 2500).length,
    cls_over_01: valid.filter((item) => Number.isFinite(item.metrics?.cls) && item.metrics.cls > 0.1).length,
    tbt_over_200: valid.filter((item) => Number.isFinite(item.metrics?.tbt_ms) && item.metrics.tbt_ms > 200).length,
  };
}

function main() {
  const args = parseArgs();
  const files = walk(args.inputDir).sort();
  if (!files.length) throw new Error("No site-wide Lighthouse shard summaries were found");

  const payloads = files.map((file) => JSON.parse(fs.readFileSync(file, "utf8")));
  const results = payloads.flatMap((payload) => payload.results || []);
  const uniqueRouteCount = new Set(results.map((item) => item.url)).size;
  const devices = [...new Set(results.map((item) => item.device))].sort();
  const groups = new Map();

  for (const item of results) {
    const key = `${item.device}::${item.family || "other"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const familySummary = [...groups.entries()].map(([key, items]) => {
    const [device, family] = key.split("::");
    return { device, family, ...summariseGroup(items) };
  }).sort((left, right) =>
    left.device.localeCompare(right.device)
    || (left.performance_median ?? 999) - (right.performance_median ?? 999)
    || left.family.localeCompare(right.family)
  );

  const worst = results
    .filter((item) => !item.error)
    .sort((left, right) =>
      (left.scores?.performance ?? 999) - (right.scores?.performance ?? 999)
      || (right.metrics?.lcp_ms ?? 0) - (left.metrics?.lcp_ms ?? 0)
      || (right.metrics?.cls ?? 0) - (left.metrics?.cls ?? 0)
    )
    .slice(0, 120);

  const errors = results.filter((item) => item.error);
  const aggregate = {
    generated_at: new Date().toISOString(),
    shard_files: files.length,
    devices,
    unique_routes: uniqueRouteCount,
    total_runs: results.length,
    error_count: errors.length,
    overall: Object.fromEntries(devices.map((device) => [
      device,
      summariseGroup(results.filter((item) => item.device === device)),
    ])),
    families: familySummary,
    worst_pages: worst,
    errors,
  };

  fs.mkdirSync(path.dirname(args.outputJson), { recursive: true });
  fs.mkdirSync(path.dirname(args.outputMd), { recursive: true });
  fs.writeFileSync(args.outputJson, JSON.stringify(aggregate, null, 2) + "\n");

  const familyRows = familySummary.map((item) =>
    `| ${item.device} | ${item.family} | ${item.pages} | ${item.errors} | ${fmt(item.performance_median)} | ${fmt(item.performance_p25)} | ${fmt(item.lcp_p75_ms)} | ${fmt(item.cls_p75, 3)} | ${fmt(item.tbt_p75_ms)} | ${item.performance_below_90} | ${item.lcp_over_2500} | ${item.cls_over_01} |`
  );

  const worstRows = worst.map((item) =>
    `| ${item.device} | ${item.family} | ${item.scores?.performance ?? "n/a"} | ${fmt(item.metrics?.lcp_ms)} | ${fmt(item.metrics?.cls, 3)} | ${fmt(item.metrics?.tbt_ms)} | ${item.url} |`
  );

  const overallRows = devices.map((device) => {
    const item = aggregate.overall[device];
    return `| ${device} | ${item.pages} | ${item.errors} | ${fmt(item.performance_median)} | ${fmt(item.performance_p25)} | ${fmt(item.lcp_p75_ms)} | ${fmt(item.cls_p75, 3)} | ${fmt(item.tbt_p75_ms)} |`;
  });

  const markdown = `# Site-wide Lighthouse Matrix

Generated: ${aggregate.generated_at}

This report de-duplicates the public sitemap inventory and audits every discovered canonical public URL in both mobile and desktop Lighthouse modes. It is lab evidence, not field Core Web Vitals.

- Unique public routes: **${aggregate.unique_routes}**
- Lighthouse runs: **${aggregate.total_runs}**
- Audit errors: **${aggregate.error_count}**
- Shard summaries: **${aggregate.shard_files}**

## Overall

| Device | Runs | Errors | Median performance | P25 performance | P75 LCP ms | P75 CLS | P75 TBT ms |
|---|---:|---:|---:|---:|---:|---:|---:|
${overallRows.join("\n")}

## Page-family baseline

| Device | Family | Pages | Errors | Median perf | P25 perf | P75 LCP ms | P75 CLS | P75 TBT ms | Perf <90 | LCP >2.5s | CLS >0.1 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${familyRows.join("\n")}

## Worst pages for optimisation

| Device | Family | Perf | LCP ms | CLS | TBT ms | URL |
|---|---|---:|---:|---:|---:|---|
${worstRows.join("\n")}

## Programme rule

Shared failures should be fixed at the owning template, stylesheet, script or asset pipeline first. Page-specific changes should only follow when a page remains an outlier after its shared family fix. Re-run the full matrix after every material optimisation batch.
`;

  fs.writeFileSync(args.outputMd, markdown);
  console.log(JSON.stringify({
    unique_routes: aggregate.unique_routes,
    total_runs: aggregate.total_runs,
    errors: aggregate.error_count,
    devices,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
