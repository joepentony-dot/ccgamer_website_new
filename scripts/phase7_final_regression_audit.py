#!/usr/bin/env python3
"""Compose the read-only final Phase 7 regression audit."""
from __future__ import annotations

import argparse
import json
import re
import statistics
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://www.cheekycommodoregamer.co.uk"
CORE_SCHEMA_PAGES = {"Zeewolf", "Publishers", "Activision"}

STATIC_METRICS = [
    ("missing_document_language", "Missing document language"),
    ("missing_viewport", "Missing viewport meta"),
    ("missing_main_landmark", "Missing main landmark"),
    ("missing_h1", "Missing H1"),
    ("missing_skip_link", "Missing skip link"),
    ("image_missing_alt_attribute", "Images missing alt attribute"),
    ("image_missing_intrinsic_dimensions", "Images missing intrinsic dimensions"),
    ("form_control_missing_label", "Form controls missing a label"),
    ("iframe_missing_title", "Iframes missing a title"),
    ("iframe_not_lazy_loaded", "Iframes not lazy loaded"),
    ("duplicate_id", "Duplicate IDs"),
    ("head_script_without_defer_or_async", "Head scripts without defer or async"),
    ("duplicate_stylesheet_reference", "Duplicate stylesheet references"),
]

KEY_PAGES = {
    "Games": ("games/index.html", f"{ORIGIN}/games/"),
    "Zeewolf": ("games/zeewolf/index.html", f"{ORIGIN}/games/zeewolf/"),
    "Genres": ("games/genres/index.html", f"{ORIGIN}/games/genres/"),
    "Publishers": ("games/publishers/index.html", f"{ORIGIN}/games/publishers/"),
    "Activision": ("games/publishers/activision/index.html", f"{ORIGIN}/games/publishers/activision/"),
    "Quiz": ("quiz/quiz.html", f"{ORIGIN}/quiz/quiz.html"),
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def main_commit() -> str:
    return subprocess.check_output(
        ["git", "rev-parse", "origin/main"], cwd=ROOT, text=True
    ).strip()


def issue_count(payload: dict[str, Any], key: str) -> int:
    return int(payload.get("html", {}).get("issues", {}).get(key, {}).get("count", 0))


def lighthouse_map(payload: dict[str, Any]) -> dict[tuple[str, str], dict[str, Any]]:
    return {
        (str(item.get("label")), str(item.get("mode"))): item
        for item in payload.get("lighthouse", [])
    }


def median_score(items: list[dict[str, Any]], key: str) -> float | None:
    values = [float(item[key]) for item in items if item.get(key) is not None]
    return statistics.median(values) if values else None


def fmt_score(value: float | None) -> str:
    return "n/a" if value is None else str(round(value * 100))


def fmt_number(value: Any, digits: int = 0) -> str:
    if value is None:
        return "n/a"
    return f"{float(value):,.{digits}f}"


def clean_generator_paths(paths: list[str]) -> list[str]:
    excluded = ("node_modules/", ".venv/", "venv/", "__pycache__/")
    return [
        path for path in paths
        if not path.startswith(excluded) and "/__pycache__/" not in path
    ]


def local_asset_path(page_path: Path, value: str) -> Path | None:
    raw = value.split("#", 1)[0].split("?", 1)[0].strip()
    if not raw or raw.startswith(("data:", "javascript:", "mailto:", "tel:", "//")):
        return None
    parsed = urlparse(raw)
    if parsed.scheme in {"http", "https"}:
        if parsed.netloc not in {
            "www.cheekycommodoregamer.co.uk",
            "cheekycommodoregamer.co.uk",
        }:
            return None
        raw = parsed.path
    candidate = ROOT / raw.lstrip("/") if raw.startswith("/") else page_path.parent / raw
    if raw.endswith("/"):
        candidate = candidate / "index.html"
    return candidate.resolve()


def sitemap_urls() -> tuple[set[str], list[str]]:
    urls: set[str] = set()
    errors: list[str] = []
    for path in sorted(ROOT.glob("sitemap*.xml")):
        try:
            tree = ET.parse(path)
        except (ET.ParseError, OSError) as error:
            errors.append(f"{path.name}: {error}")
            continue
        for node in tree.getroot().iter():
            if node.tag.endswith("loc") and node.text:
                urls.add(node.text.strip())
    return urls, errors


def game_records() -> list[dict[str, Any]]:
    payload = load_json(ROOT / "games/games.json")
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for key in ("games", "items", "records"):
            value = payload.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
    return []


def audit_repository(generator: dict[str, Any], redirect: dict[str, Any]) -> dict[str, Any]:
    records = game_records()
    powerdrome = []
    for item in records:
        identity = " ".join(
            str(item.get(key, "")) for key in ("id", "slug", "title", "name")
        ).lower()
        if "powerdrome" in identity:
            powerdrome.append(identity)

    games_index = (ROOT / "games/index.html").read_text(encoding="utf-8", errors="replace")
    publisher_index = (ROOT / "games/publishers/index.html").read_text(
        encoding="utf-8", errors="replace"
    )
    activision = (ROOT / "games/publishers/activision/index.html").read_text(
        encoding="utf-8", errors="replace"
    )

    page_checks: dict[str, Any] = {}
    broken_assets: list[dict[str, str]] = []
    site_urls, sitemap_errors = sitemap_urls()
    for label, (relative, expected_canonical) in KEY_PAGES.items():
        path = ROOT / relative
        exists = path.exists()
        canonical = None
        json_ld = 0
        if exists:
            soup = BeautifulSoup(
                path.read_text(encoding="utf-8", errors="replace"), "html.parser"
            )
            canonical_tag = soup.find(
                "link", rel=lambda value: value and "canonical" in value
            )
            canonical = (
                str(canonical_tag.get("href") or "").strip() if canonical_tag else None
            )
            json_ld = len(
                soup.find_all(
                    "script", attrs={"type": re.compile(r"^application/ld\+json$", re.I)}
                )
            )
            resource_tags = [
                *[(node, "src") for node in soup.find_all(["img", "script", "iframe"], src=True)],
                *[(node, "href") for node in soup.find_all("link", href=True)],
            ]
            for tag, attribute in resource_tags:
                value = str(tag.get(attribute) or "")
                resolved = local_asset_path(path, value)
                if resolved is not None and not resolved.exists():
                    broken_assets.append({"page": relative, "reference": value})
        page_checks[label] = {
            "path": relative,
            "exists": exists,
            "canonical": canonical,
            "expected_canonical": expected_canonical,
            "canonical_matches": canonical == expected_canonical,
            "json_ld_blocks": json_ld,
            "in_sitemap": expected_canonical in site_urls,
        }

    redirect_totals = redirect.get("totals", {})
    core_schema_ok = all(
        page_checks[label]["json_ld_blocks"] > 0 for label in CORE_SCHEMA_PAGES
    )
    checks = {
        "game_count_651": len(records) == 651,
        "powerdrome_absent": not powerdrome,
        "genre_shortcut_present": 'href="/games/genres/">Browse by Genre</a>' in games_index,
        "visible_platform_shortcut_absent": ">Browse by Platform</a>" not in games_index,
        "publisher_index_logo_present": (
            'data-publisher-logo="activision"' in publisher_index
            and 'src="/resources/images/publishers/activision.png"' in publisher_index
        ),
        "activision_page_logo_present": (
            'data-publisher-page-logo="activision"' in activision
            and 'src="/resources/images/publishers/activision.png"' in activision
        ),
        "rebuild_completed": bool(generator.get("completed")),
        "rebuild_deterministic": bool(generator.get("deterministic")),
        "publisher_validator_passed": bool(generator.get("publisher_validator_passed")),
        "year_platform_validator_passed": bool(generator.get("year_platform_validator_passed")),
        "redirect_missing_targets_zero": int(redirect_totals.get("missing_targets", -1)) == 0,
        "redirect_external_targets_zero": int(redirect_totals.get("external_targets", -1)) == 0,
        "redirect_chains_zero": int(redirect_totals.get("redirect_chains", -1)) == 0,
        "redirect_target_mismatches_zero": int(redirect_totals.get("target_mismatches", -1)) == 0,
        "redirect_canonical_mismatches_zero": int(redirect_totals.get("canonical_mismatches", -1)) == 0,
        "redirect_delays_zero": int(redirect_totals.get("delayed_refreshes", -1)) == 0,
        "representative_pages_exist": all(item["exists"] for item in page_checks.values()),
        "representative_canonicals_match": all(
            item["canonical_matches"] for item in page_checks.values()
        ),
        "core_detail_schema_present": core_schema_ok,
        "representative_sitemap_coverage": all(
            item["in_sitemap"] for item in page_checks.values()
        ),
        "representative_assets_resolve": not broken_assets,
        "sitemaps_parse": not sitemap_errors,
    }
    return {
        "game_count": len(records),
        "powerdrome_matches": powerdrome,
        "checks": checks,
        "page_checks": page_checks,
        "schema_gaps": [
            label for label, item in page_checks.items() if item["json_ld_blocks"] == 0
        ],
        "broken_assets": broken_assets,
        "sitemap_url_count": len(site_urls),
        "sitemap_errors": sitemap_errors,
        "redirect_totals": redirect_totals,
    }


def compose(args: argparse.Namespace) -> None:
    baseline = load_json(Path(args.baseline))
    current_static = load_json(Path(args.current_static))
    current_live = load_json(Path(args.current_live))
    generator = load_json(Path(args.generator))
    redirect = load_json(Path(args.redirect))
    legacy_runs = (
        load_json(Path(args.legacy_runs)) if Path(args.legacy_runs).exists() else []
    )

    for key in ("first_changed_paths", "second_changed_paths"):
        generator[key] = clean_generator_paths(generator.get(key, []))

    repository = audit_repository(generator, redirect)
    baseline_static = baseline.get("static", {})
    baseline_live = baseline.get("live", {})
    baseline_lh = lighthouse_map(baseline_live)
    current_lh = lighthouse_map(current_live)

    static_rows = []
    for key, label in STATIC_METRICS:
        before = issue_count(baseline_static, key)
        after = issue_count(current_static, key)
        static_rows.append(
            {
                "key": key,
                "label": label,
                "before": before,
                "after": after,
                "change": after - before,
            }
        )

    lighthouse_rows = []
    for run in sorted(set(baseline_lh) | set(current_lh)):
        before = baseline_lh.get(run, {})
        after = current_lh.get(run, {})
        lighthouse_rows.append(
            {
                "label": run[0],
                "mode": run[1],
                "before_performance": before.get("performance_score"),
                "after_performance": after.get("performance_score"),
                "before_accessibility": before.get("accessibility_score"),
                "after_accessibility": after.get("accessibility_score"),
                "before_lcp_ms": before.get("numeric", {}).get("lcp_ms"),
                "after_lcp_ms": after.get("numeric", {}).get("lcp_ms"),
                "before_cls": before.get("numeric", {}).get("cls"),
                "after_cls": after.get("numeric", {}).get("cls"),
                "before_total_bytes": before.get("numeric", {}).get("total_bytes"),
                "after_total_bytes": after.get("numeric", {}).get("total_bytes"),
                "error": after.get("error"),
            }
        )

    baseline_perf = median_score(
        baseline_live.get("lighthouse", []), "performance_score"
    )
    current_perf = median_score(
        current_live.get("lighthouse", []), "performance_score"
    )
    baseline_access = median_score(
        baseline_live.get("lighthouse", []), "accessibility_score"
    )
    current_access = median_score(
        current_live.get("lighthouse", []), "accessibility_score"
    )
    current_axe = sum(
        int(item.get("violation_count", 0)) for item in current_live.get("axe", [])
    )
    current_serious = sum(
        int(item.get("serious_or_critical_nodes", 0))
        for item in current_live.get("axe", [])
    )

    hard_failures = [
        name for name, passed in repository["checks"].items() if not passed
    ]
    warnings: list[str] = []
    if current_live.get("errors"):
        warnings.append(
            f"Live audit recorded {len(current_live['errors'])} execution error(s)."
        )
    if current_axe:
        warnings.append(f"Live axe found {current_axe} violation rule(s).")
    if current_serious:
        warnings.append(
            f"Live axe found {current_serious} serious or critical affected node(s)."
        )
    if repository["schema_gaps"]:
        warnings.append(
            "Representative archive or utility pages without JSON-LD: "
            + ", ".join(repository["schema_gaps"])
            + "."
        )
    for row in lighthouse_rows:
        name = f"{row['label']} {row['mode']}"
        lcp = row.get("after_lcp_ms")
        cls = row.get("after_cls")
        before_score = row.get("before_performance")
        after_score = row.get("after_performance")
        if lcp is not None and float(lcp) > 2500:
            warnings.append(
                f"{name} lab LCP was {float(lcp) / 1000:.1f}s, above the 2.5s reference."
            )
        if cls is not None and float(cls) > 0.1:
            warnings.append(
                f"{name} lab CLS was {float(cls):.3f}, above the 0.1 reference."
            )
        if (
            before_score is not None
            and after_score is not None
            and float(after_score) < float(before_score) - 0.10
        ):
            warnings.append(
                f"{name} Lighthouse performance fell by more than 10 points versus Phase 7A."
            )

    warnings = list(dict.fromkeys(warnings))
    verdict = "FAIL" if hard_failures else ("PASS WITH WARNINGS" if warnings else "PASS")
    current_totals = current_static.get("html", {}).get("totals", {})
    baseline_totals = baseline_static.get("html", {}).get("totals", {})
    current_assets = current_static.get("assets", {}).get("totals", {})
    baseline_assets = baseline_static.get("assets", {}).get("totals", {})

    evidence = {
        "phase": "7-final",
        "mode": "read-only-regression-audit",
        "commit": main_commit(),
        "audit_branch_commit": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip(),
        "baseline_commit": baseline.get("commit"),
        "verdict": verdict,
        "hard_failures": hard_failures,
        "warnings": warnings,
        "summary": {
            "baseline_median_lighthouse_performance": baseline_perf,
            "current_median_lighthouse_performance": current_perf,
            "baseline_median_lighthouse_accessibility": baseline_access,
            "current_median_lighthouse_accessibility": current_access,
            "current_axe_violations": current_axe,
            "current_axe_serious_or_critical_nodes": current_serious,
            "baseline_html_files": baseline_totals.get("html_files"),
            "current_html_files": current_totals.get("html_files"),
            "baseline_asset_bytes": baseline_assets.get("bytes"),
            "current_asset_bytes": current_assets.get("bytes"),
        },
        "static_comparison": static_rows,
        "lighthouse_comparison": lighthouse_rows,
        "repository": repository,
        "generator": generator,
        "redirect": redirect,
        "live": current_live,
        "legacy_runs": legacy_runs,
    }

    static_table = "\n".join(
        f"| {row['label']} | {row['before']:,} | {row['after']:,} | {row['change']:+,} |"
        for row in static_rows
    )
    lighthouse_table = "\n".join(
        "| {label} | {mode} | {bp} | {ap} | {blcp} | {alcp} | {bcls} | {acls} | {bb} | {ab} |".format(
            label=row["label"],
            mode=row["mode"],
            bp=fmt_score(row["before_performance"]),
            ap=fmt_score(row["after_performance"]),
            blcp=fmt_number(
                None
                if row["before_lcp_ms"] is None
                else row["before_lcp_ms"] / 1000,
                1,
            ),
            alcp=fmt_number(
                None
                if row["after_lcp_ms"] is None
                else row["after_lcp_ms"] / 1000,
                1,
            ),
            bcls=fmt_number(row["before_cls"], 3),
            acls=fmt_number(row["after_cls"], 3),
            bb=fmt_number(
                None
                if row["before_total_bytes"] is None
                else row["before_total_bytes"] / 1024,
                0,
            ),
            ab=fmt_number(
                None
                if row["after_total_bytes"] is None
                else row["after_total_bytes"] / 1024,
                0,
            ),
        )
        for row in lighthouse_rows
    )
    checks_table = "\n".join(
        f"| `{name}` | {'PASS' if passed else 'FAIL'} |"
        for name, passed in repository["checks"].items()
    )
    page_table = "\n".join(
        f"| {label} | {'Yes' if item['exists'] else 'No'} | "
        f"{'Yes' if item['canonical_matches'] else 'No'} | {item['json_ld_blocks']} | "
        f"{'Yes' if item['in_sitemap'] else 'No'} |"
        for label, item in repository["page_checks"].items()
    )
    warning_text = "\n".join(f"- {item}" for item in warnings) or "- None"
    failure_text = "\n".join(f"- `{item}`" for item in hard_failures) or "- None"
    legacy_text = "\n".join(
        f"- `{item.get('workflowName') or item.get('name')}` — "
        f"{item.get('conclusion')} on `{str(item.get('headSha', ''))[:12]}` "
        f"({item.get('createdAt', 'unknown date')})"
        for item in legacy_runs[:10]
    ) or "- No historical failed/cancelled main-branch runs were returned."

    report = f"""# Final Phase 7 Regression Audit

## Verdict

**{verdict}**

This is a read-only comparison of current `main` commit `{evidence['commit']}` against the original Phase 7A baseline commit `{evidence['baseline_commit']}`. It repeats the repository-wide static scan, representative axe checks, and the same seven Lighthouse runs, then verifies Phase 7 route, generator, navigation, publisher-logo, sitemap and metadata safeguards.

- Hard regression failures: **{len(hard_failures)}**
- Audit warnings: **{len(warnings)}**
- Current live axe violations: **{current_axe}**
- Current serious/critical axe nodes: **{current_serious}**
- Median Lighthouse performance: **{fmt_score(baseline_perf)} → {fmt_score(current_perf)}**
- Median Lighthouse accessibility: **{fmt_score(baseline_access)} → {fmt_score(current_access)}**
- Game records: **{repository['game_count']}**
- Sitemap URLs discovered: **{repository['sitemap_url_count']:,}**

## Static scan comparison

| Finding | Phase 7A | Current | Change |
|---|---:|---:|---:|
{static_table}

## Lighthouse lab comparison

Lab scores vary between runs and do not replace Search Console or CrUX field data.

| Route | Mode | Perf A | Perf now | LCP A (s) | LCP now (s) | CLS A | CLS now | KiB A | KiB now |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
{lighthouse_table}

## Phase 7 integrity checks

| Check | Result |
|---|---|
{checks_table}

## Representative metadata and sitemap checks

| Page | Exists | Canonical | JSON-LD blocks | In sitemap |
|---|---|---|---:|---|
{page_table}

Archive and utility pages without JSON-LD are recorded as remaining metadata opportunities rather than regressions. Detail pages covered by earlier structured-data work remain mandatory.

## Generator repeatability

- Completed: **{generator.get('completed')}**
- Deterministic across two rebuilds: **{generator.get('deterministic')}**
- First rebuild changed repository paths: **{len(generator.get('first_changed_paths', []))}**
- Publisher-logo validator: **{'PASS' if generator.get('publisher_validator_passed') else 'FAIL'}**
- Year/platform validator: **{'PASS' if generator.get('year_platform_validator_passed') else 'FAIL'}**
- Temporary generator changes were discarded after validation.

## Redirect-route integrity

- Redirect pages: **{repository['redirect_totals'].get('redirect_pages', 'n/a')}**
- Missing targets: **{repository['redirect_totals'].get('missing_targets', 'n/a')}**
- External targets: **{repository['redirect_totals'].get('external_targets', 'n/a')}**
- Redirect chains: **{repository['redirect_totals'].get('redirect_chains', 'n/a')}**
- Target mismatches: **{repository['redirect_totals'].get('target_mismatches', 'n/a')}**
- Canonical mismatches: **{repository['redirect_totals'].get('canonical_mismatches', 'n/a')}**
- Delayed refreshes: **{repository['redirect_totals'].get('delayed_refreshes', 'n/a')}**

## Hard failures

{failure_text}

## Warnings and remaining opportunities

{warning_text}

## Historical workflow noise

The following recent failed or cancelled `main` runs belong to older commit SHAs and are listed separately from this audit's own result:

{legacy_text}

## Safety

- No public HTML, CSS, JavaScript, image, game record, route or sitemap is changed by this audit.
- `index.html`, `home.html`, `resources/css/intro.css`, `js/index-intro.js` and `games/games.json` are hash-protected.
- The authoritative game rebuild is run twice only in the temporary workflow worktree; all generated changes are discarded.
- Detailed static, live, Lighthouse, redirect, generator and comparison evidence is uploaded as a workflow artifact.
"""

    report_path = Path(args.report)
    evidence_path = Path(args.evidence)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")
    evidence_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {"verdict": verdict, "hard_failures": hard_failures, "warnings": warnings},
            indent=2,
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", required=True)
    parser.add_argument("--current-static", required=True)
    parser.add_argument("--current-live", required=True)
    parser.add_argument("--generator", required=True)
    parser.add_argument("--redirect", required=True)
    parser.add_argument("--legacy-runs", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--evidence", required=True)
    compose(parser.parse_args())


if __name__ == "__main__":
    main()
