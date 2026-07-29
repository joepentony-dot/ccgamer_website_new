#!/usr/bin/env python3
"""Compose the read-only Phase 8A LCP and layout-shift diagnostic report."""

from __future__ import annotations

import argparse
import json
import math
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def fmt_seconds(value):
    if value is None:
        return "n/a"
    return f"{float(value) / 1000:.2f}s"


def fmt_cls(value):
    if value is None:
        return "n/a"
    return f"{float(value):.3f}"


def fmt_bytes(value):
    if value is None:
        return "n/a"
    value = float(value)
    if value >= 1024 * 1024:
        return f"{value / (1024 * 1024):.2f MiB"
    if value >= 1024:
        return f"{value / 1024:.1f KiB"
    return f"{int(value)} B"


def safe_cell(value):
    return str(value or "n/a").replace("|", "\\|").replace("\n", " ")


def host(url):
    try:
        return urlparse(url).netloc or "same document"
    except Exception:
        return "unknown"


def candidate(candidates, key, title, reason, route, severity, evidence):
    item = candidates.setdefault(
        key,
        {
            "key": key,
            "title": title,
            "reason": reason,
            "severity": severity,
            "routes": [],
            "evidence": [],
        },
    )
    item["severity"] = max(item["severity"], severity)
    if route not in item["routes"]:
        item["routes"].append(route)
    if evidence and evidence not in item["evidence"]:
        item["evidence"].append(evidence)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--diagnostic", required=True, type=Path)
    parser.add_argument("--main-sha", required=True)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--evidence", required=True, type=Path)
    args = parser.parse_args()

    data = load_json(args.diagnostic)
    browser_items = {item["label"]: item for item in data.get("browser", [])}
    lighthouse_items = {item["label"]: item for item in data.get("lighthouse", [])}
    routes = data.get("routes", [])
    failures = []
    warnings = []
    candidates = {}
    route_rows = []
    game_patterns = []
    cls_sources = []

    for route in routes:
        label = route["label"]
        browser = browser_items.get(label, {})
        lighthouse = lighthouse_items.get(label, {})
        if browser.get("error"):
            failures.append(f"Browser diagnostic failed for {label}: {browser['error']}")
        if lighthouse.get("error"):
            failures.append(f"Lighthouse failed for {label}: {lighthouse['error']}")

        lcp = browser.get("lcp") or {}
        element = lcp.get("element") or {}
        resource = browser.get("lcp_resource") or {}
        metrics = lighthouse.get("metrics") or {}
        observed_lcp_ms = lcp.get("render_time") or lcp.get("load_time") or lcp.get("start_time")
        lighthouse_lcp_ms = metrics.get("lcp_ms")
        browser_cls = browser.get("cls")
        lighthouse_cls = metrics.get("cls")

        route_rows.append(
            {
                "label": label,
                "family": route.get("family", ""),
                "observed_lcp_ms": observed_lcp_ms,
                "lighthouse_lcp_ms": lighthouse_lcp_ms,
                "selector": element.get("selector"),
                "tag": element.get("tag"),
                "lcp_url": lcp.get("url") or element.get("src") or "",
                "loading": element.get("loading"),
                "fetch_priority": element.get("fetch_priority"),
                "width_attribute": element.get("width_attribute"),
                "height_attribute": element.get("height_attribute"),
                "resource_start_ms": resource.get("start_time"),
                "resource_duration_ms": resource.get("duration"),
                "resource_transfer_bytes": resource.get("transfer_size"),
                "browser_cls": browser_cls,
                "lighthouse_cls": lighthouse_cls,
                "performance_score": lighthouse.get("performance_score"),
                "total_bytes": metrics.get("total_bytes"),
            }
        )

        route_lcp = max(
            [value for value in [observed_lcp_ms, lighthouse_lcp_ms] if value is not None],
            default=None,
        )
        if route_lcp is not None and route_lcp > 2500:
            warnings.append(f"{label} mobile LCP was {route_lcp / 1000:.2f}s in at least one diagnostic run.")

        if element.get("tag") == "img":
            if str(element.get("loading", "")).lower() == "lazy":
                candidate(
                    candidates,
                    "lcp-image-lazy",
                    "Do not lazy-load the measured LCP image",
                    "A browser-reported LCP image was marked for lazy loading.",
                    label,
                    100,
                    element.get("selector"),
                )
            if str(element.get("fetch_priority", "")).lower() != "high":
                candidate(
                    candidates,
                    "lcp-image-priority",
                    "Review explicit priority for the measured LCP image",
                    "The measured LCP image did not expose fetchpriority=high.",
                    label,
                    70,
                    element.get("selector"),
                )
            if not element.get("width_attribute") or not element.get("height_attribute"):
                candidate(
                    candidates,
                    "lcp-image-dimensions",
                    "Add intrinsic dimensions to the measured LCP image",
                    "The measured LCP image lacked a width or height attribute.",
                    label,
                    65,
                    element.get("selector"),
                )

        if resource:
            resource_start = resource.get("start_time")
            if resource_start is not None and resource_start > 1000:
                candidate(
                    candidates,
                    "lcp-delayed-discovery",
                    "Reduce delayed discovery of the LCP resource",
                    "The LCP resource began more than one second after navigation start.",
                    label,
                    90,
                    f"start {resource_start:.0f}ms: {resource.get('name', '')}",
                )
            transfer = resource.get("transfer_size") or resource.get("encoded_body_size")
            if transfer and transfer > 500 * 1024:
                candidate(
                    candidates,
                    "lcp-resource-size",
                    "Reduce or responsively deliver the LCP resource",
                    "The measured LCP resource transferred more than 500 KiB.",
                    label,
                    80,
                    f"{fmt_bytes(transfer)}: {resource.get('name', '')}",
                )
            resource_url = resource.get("name", "")
            if resource_url and host(resource_url) not in {"www.cheekycommodoregamer.co.uk", "cheekycommodoregamer.co.uk"}:
                candidate(
                    candidates,
                    "lcp-third-party",
                    "Remove third-party dependency from the LCP path",
                    "The measured LCP resource was served by a third-party host.",
                    label,
                    85,
                    resource_url,
                )

        navigation = browser.get("navigation") or {}
        response_start = navigation.get("response_start")
        if response_start is not None and response_start > 800:
            candidate(
                candidates,
                "document-response-time",
                "Investigate document response delay",
                "The HTML response began more than 800ms after navigation start under the audit profile.",
                label,
                55,
                f"responseStart {response_start:.0f}ms",
            )

        route_cls = max(
            [value for value in [browser_cls, lighthouse_cls] if value is not None],
            default=None,
        )
        if route_cls is not None and route_cls > 0.1:
            warnings.append(f"{label} mobile CLS was {route_cls:.3f} in at least one diagnostic run.")
            sources = browser.get("shift_sources") or []
            if sources:
                top = sources[0]
                candidate(
                    candidates,
                    f"cls-source:{top.get('selector', '[unknown]')}",
                    f"Stabilise {top.get('selector', '[unknown]')}",
                    "The element appeared in the highest browser-observed layout-shift source group.",
                    label,
                    75,
                    f"{top.get('occurrences', 0)} occurrence(s), accumulated source value {top.get('total_value', 0):.3f}",
                )

        for source in browser.get("shift_sources") or []:
            cls_sources.append(
                {
                    "route": label,
                    "selector": source.get("selector", "[unknown]"),
                    "total_value": source.get("total_value", 0),
                    "occurrences": source.get("occurrences", 0),
                }
            )

        if route.get("family") == "game":
            game_patterns.append(
                {
                    "label": label,
                    "selector": element.get("selector") or "[none]",
                    "tag": element.get("tag") or "[none]",
                    "host": host(lcp.get("url") or element.get("src") or ""),
                    "loading": element.get("loading") or "",
                    "fetch_priority": element.get("fetch_priority") or "",
                    "lcp_ms": route_lcp,
                    "cls": route_cls,
                }
            )

    selector_counts = Counter(item["selector"] for item in game_patterns)
    tag_counts = Counter(item["tag"] for item in game_patterns)
    host_counts = Counter(item["host"] for item in game_patterns)
    common_game_issue = None
    if game_patterns:
        most_selector, selector_count = selector_counts.most_common(1)[0]
        if selector_count >= math.ceil(len(game_patterns) * 0.6):
            common_game_issue = {
                "selector": most_selector,
                "count": selector_count,
                "total": len(game_patterns),
                "tag": tag_counts.most_common(1)[0][0],
                "host": host_counts.most_common(1)[0][0],
            }

    ranked_candidates = sorted(
        candidates.values(),
        key=lambda item: (-item["severity"], -len(item["routes"]), item["title"]),
    )
    for index, item in enumerate(ranked_candidates, start=1):
        item["rank"] = index

    verdict = "PASS" if not failures else "INCOMPLETE"
    if warnings and not failures:
        verdict = "PASS WITH FINDINGS"

    lines = [
        "# Phase 8A LCP and Layout-Shift Diagnostic",
        "",
        "## Verdict",
        "",
        f"**{verdict}**",
        "",
        f"This read-only diagnostic inspected current `main` commit `{args.main_sha}`. It measured mobile LCP elements, resource timing and layout-shift sources on four core routes and five deterministic single-game pages, then correlated those observations with Lighthouse performance diagnostics.",
        "",
        f"- Routes tested: **{len(routes)}**",
        f"- Browser diagnostic failures: **{sum(1 for item in browser_items.values() if item.get('error'))}**",
        f"- Lighthouse failures: **{sum(1 for item in lighthouse_items.values() if item.get('error'))}**",
        f"- Findings recorded: **{len(warnings)}**",
        f"- Ranked correction candidates: **{len(ranked_candidates)}**",
        "",
        "Lab measurements are diagnostic evidence, not field Core Web Vitals. Search Console or CrUX remains the source for production-user experience.",
        "",
        "## Route attribution",
        "",
        "| Route | Family | Observed LCP | Lighthouse LCP | LCP element | Resource start | Resource transfer | Observed CLS | Lighthouse CLS |",
        "|---|---|---:|---:|---|---:|---:|---:|---:|",
    ]
    for row in route_rows:
        lines.append(
            "| " + " | ".join(
                [
                    safe_cell(row["label"]),
                    safe_cell(row["family"]),
                    fmt_seconds(row["observed_lcp_ms"]),
                    fmt_seconds(row["lighthouse_lcp_ms"]),
                    safe_cell(row["selector"] or row["tag"]),
                    fmt_seconds(row["resource_start_ms"]),
                    fmt_bytes(row["resource_transfer_bytes"]),
                    fmt_cls(row["browser_cls"]),
                    fmt_cls(row["lighthouse_cls"]),
                ]
            ) + " |"
        )

    lines.extend(["", "## Single-game comparison", ""])
    if game_patterns:
        lines.extend(
            [
                "| Game route | LCP selector | Tag | Resource host | Loading | Fetch priority | LCP | CLS |",
                "|---|---|---|---|---|---|---:|---:|",
            ]
        )
        for item in game_patterns:
            lines.append(
                "| " + " | ".join(
                    [
                        safe_cell(item["label"]),
                        safe_cell(item["selector"]),
                        safe_cell(item["tag"]),
                        safe_cell(item["host"]),
                        safe_cell(item["loading"]),
                        safe_cell(item["fetch_priority"]),
                        fmt_seconds(item["lcp_ms"]),
                        fmt_cls(item["cls"]),
                    ]
                ) + " |"
            )
        lines.append("")
        if common_game_issue:
            lines.append(
                f"The same LCP selector `{common_game_issue['selector']}` appeared on **{common_game_issue['count']} of {common_game_issue['total']}** tested game pages. This supports treating it as shared-template behaviour rather than a Zeewolf-only result."
            )
        else:
            lines.append("No single LCP selector dominated at least 60% of the tested game pages; route-specific treatment may be required.")
    else:
        lines.append("No game-page result was available.")

    lines.extend(["", "## Highest layout-shift sources", ""])
    if cls_sources:
        lines.extend(["| Route | Selector | Accumulated source value | Occurrences |", "|---|---|---:|---:|"])
        for source in sorted(cls_sources, key=lambda item: item["total_value"], reverse=True)[:20]:
            lines.append(
                f"| {safe_cell(source['route'])} | `{safe_cell(source['selector'])}` | {source['total_value']:.3f} | {source['occurrences']} |"
            )
    else:
        lines.append("No browser-observed layout-shift source was recorded.")

    lines.extend(["", "## Ranked correction candidates", ""])
    if ranked_candidates:
        for item in ranked_candidates:
            lines.append(f"### {item['rank']}. {item['title']}")
            lines.append("")
            lines.append(item["reason"])
            lines.append("")
            lines.append(f"Affected routes: {', '.join(item['routes'])}.")
            if item["evidence"]:
                lines.append("")
                lines.append("Evidence:")
                for evidence in item["evidence"][:8]:
                    lines.append(f"- `{safe_cell(evidence)}`")
            lines.append("")
    else:
        lines.append("No bounded correction candidate was identified from the captured evidence.")

    lines.extend(["## Recommended next bounded PR", ""])
    if ranked_candidates:
        top = ranked_candidates[0]
        lines.append(
            f"Start with **{top['title']}** on only the affected page family. Re-run the same Phase 8A routes and require lower LCP or CLS without changing the Omega presentation, routes or game data."
        )
    else:
        lines.append("Do not start a correction PR until another diagnostic run identifies a repeatable source.")

    lines.extend(["", "## Findings", ""])
    if warnings:
        for warning in warnings:
            lines.append(f"- {warning}")
    else:
        lines.append("- No route exceeded the audit LCP or CLS reference in the captured runs.")

    lines.extend(["", "## Diagnostic failures", ""])
    if failures:
        for failure in failures:
            lines.append(f"- {failure}")
    else:
        lines.append("- None")

    lines.extend(
        [
            "",
            "## Safety",
            "",
            "- No public HTML, CSS, JavaScript, image, game record, route or sitemap was changed.",
            "- `index.html`, `home.html`, `resources/css/intro.css`, `js/index-intro.js` and `games/games.json` were hash-protected.",
            "- Screenshots, full Lighthouse reports and raw browser timing remain workflow artifacts rather than public-site files.",
            "- Any correction must use a separate bounded PR with explicit approval.",
            "",
        ]
    )

    evidence = {
        "phase": "8A",
        "main_sha": args.main_sha,
        "verdict": verdict,
        "methodology": data.get("methodology"),
        "route_rows": route_rows,
        "game_patterns": game_patterns,
        "common_game_issue": common_game_issue,
        "layout_shift_sources": sorted(cls_sources, key=lambda item: item["total_value"], reverse=True),
        "ranked_candidates": ranked_candidates,
        "warnings": warnings,
        "failures": failures,
        "raw_diagnostic": data,
    }

    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.evidence.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text("\n".join(lines), encoding="utf-8")
    args.evidence.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"verdict": verdict, "warnings": len(warnings), "failures": len(failures), "candidates": len(ranked_candidates)}, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
