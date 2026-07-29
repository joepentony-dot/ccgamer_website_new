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
        return f"{value / (1024 * 1024):.2f} MiB"
    if value >= 1024:
        return f"{value / 1024:.1f} KiB"
    return f"{int(value)} B"


def safe_cell(value):
    return str(value or "n/a").replace("|", "\\|").replace("\n", " ")


def host(url):
    try:
        return urlparse(url).netloc or "same document"
    except Exception:
        return "unknown"


def walk(value):
    if isinstance(value, dict):
        yield value
        for item in value.values():
            yield from walk(item)
    elif isinstance(value, list):
        for item in value:
            yield from walk(item)


def diagnostic_details(lighthouse, audit_id):
    return ((lighthouse.get("diagnostics") or {}).get(audit_id) or {}).get("details")


def first_node(details):
    for item in walk(details):
        if item.get("type") == "node" and item.get("selector"):
            return {
                "selector": item.get("selector"),
                "snippet": item.get("snippet"),
                "label": item.get("nodeLabel"),
            }
    return None


def lcp_breakdown(details):
    result = {}
    for item in walk(details):
        if item.get("subpart") and item.get("duration") is not None:
            result[item["subpart"]] = float(item["duration"])
    return result


def discovery_checks(details):
    result = {}
    for item in walk(details):
        for key in ("priorityHinted", "requestDiscoverable", "eagerlyLoaded"):
            value = item.get(key)
            if isinstance(value, dict) and "value" in value:
                result[key] = bool(value.get("value"))
    return result


def lighthouse_cls_sources(details):
    sources = []
    for item in walk(details):
        node = item.get("node")
        score = item.get("score")
        if not isinstance(node, dict) or not node.get("selector") or score is None:
            continue
        causes = []
        for child in walk(item.get("subItems")):
            if child.get("cause"):
                causes.append(str(child["cause"]))
            extra = child.get("extra")
            if isinstance(extra, dict) and extra.get("value"):
                causes.append(str(extra["value"]))
        sources.append(
            {
                "selector": node.get("selector"),
                "score": float(score),
                "causes": sorted(set(causes)),
            }
        )
    deduped = {}
    for item in sources:
        key = (item["selector"], round(item["score"], 6))
        deduped[key] = item
    return sorted(deduped.values(), key=lambda item: item["score"], reverse=True)


def dominant_phase(phases):
    if not phases:
        return None
    key, value = max(phases.items(), key=lambda item: item[1])
    names = {
        "timeToFirstByte": "TTFB",
        "resourceLoadDelay": "resource delay",
        "resourceLoadDuration": "resource load",
        "elementRenderDelay": "render delay",
    }
    return {"key": key, "label": names.get(key, key), "duration_ms": value}


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
        breakdown = lcp_breakdown(diagnostic_details(lighthouse, "lcp-breakdown-insight"))
        discovery = discovery_checks(diagnostic_details(lighthouse, "lcp-discovery-insight"))
        lighthouse_node = first_node(diagnostic_details(lighthouse, "lcp-breakdown-insight")) or {}
        lh_cls = lighthouse_cls_sources(diagnostic_details(lighthouse, "cls-culprits-insight"))

        observed_lcp_ms = lcp.get("render_time") or lcp.get("load_time") or lcp.get("start_time")
        lighthouse_lcp_ms = metrics.get("lcp_ms")
        browser_cls = browser.get("cls")
        lighthouse_cls = metrics.get("cls")
        selector = element.get("selector") or lighthouse_node.get("selector")
        tag = element.get("tag") or ((selector or "").split(".", 1)[0].split("#", 1)[0] or None)
        phase = dominant_phase(breakdown)

        row = {
            "label": label,
            "family": route.get("family", ""),
            "canonical_url": route.get("url"),
            "tested_url": browser.get("tested_url") or lighthouse.get("tested_url") or route.get("audit_url") or route.get("url"),
            "observed_lcp_ms": observed_lcp_ms,
            "lighthouse_lcp_ms": lighthouse_lcp_ms,
            "selector": selector,
            "tag": tag,
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
            "lcp_breakdown": breakdown,
            "lcp_discovery": discovery,
            "dominant_phase": phase,
            "lighthouse_cls_sources": lh_cls,
        }
        route_rows.append(row)

        route_lcp = max(
            [value for value in [observed_lcp_ms, lighthouse_lcp_ms] if value is not None],
            default=None,
        )
        if route_lcp is not None and route_lcp > 2500:
            warnings.append(f"{label} mobile LCP was {route_lcp / 1000:.2f}s in at least one diagnostic run.")

        if element.get("tag") == "img":
            if str(element.get("loading", "")).lower() == "lazy":
                candidate(candidates, "lcp-image-lazy", "Do not lazy-load the measured LCP image", "A browser-reported LCP image was marked for lazy loading.", label, 100, selector)
            if str(element.get("fetch_priority", "")).lower() != "high":
                candidate(candidates, "lcp-image-priority", "Review explicit priority for the measured LCP image", "The measured LCP image did not expose fetchpriority=high.", label, 70, selector)
            if not element.get("width_attribute") or not element.get("height_attribute"):
                candidate(candidates, "lcp-image-dimensions", "Add intrinsic dimensions to the measured LCP image", "The measured LCP image lacked a width or height attribute.", label, 65, selector)

        if discovery.get("requestDiscoverable") is False:
            candidate(candidates, "lcp-delayed-discovery", "Make the LCP resource discoverable in the initial document", "Lighthouse reported that the LCP request was not discoverable in the initial HTML.", label, 95, selector)
        if discovery.get("priorityHinted") is False:
            candidate(candidates, "lcp-image-priority", "Review explicit priority for the measured LCP image", "Lighthouse reported that the LCP resource was not priority hinted.", label, 75, selector)
        if discovery.get("eagerlyLoaded") is False:
            candidate(candidates, "lcp-image-lazy", "Do not lazy-load the measured LCP image", "Lighthouse reported that the LCP resource was not eagerly loaded.", label, 100, selector)

        if breakdown.get("resourceLoadDelay", 0) > 1000:
            candidate(candidates, "lcp-delayed-discovery", "Make the LCP resource discoverable in the initial document", "Lighthouse attributed more than one second of LCP to resource-load delay.", label, 95, f"resource delay {fmt_seconds(breakdown['resourceLoadDelay'])}: {selector}")
        if breakdown.get("elementRenderDelay", 0) > 1000:
            candidate(candidates, "lcp-render-delay", "Reduce LCP element render delay", "Lighthouse attributed more than one second of LCP to rendering after the resource or text was available.", label, 85, f"render delay {fmt_seconds(breakdown['elementRenderDelay'])}: {selector}")

        if resource:
            resource_start = resource.get("start_time")
            if resource_start is not None and resource_start > 1000:
                candidate(candidates, "lcp-delayed-discovery", "Make the LCP resource discoverable in the initial document", "The observed LCP resource began more than one second after navigation start.", label, 90, f"start {resource_start:.0f}ms: {resource.get('name', '')}")
            transfer = resource.get("transfer_size") or resource.get("encoded_body_size")
            if transfer and transfer > 500 * 1024:
                candidate(candidates, "lcp-resource-size", "Reduce or responsively deliver the LCP resource", "The measured LCP resource transferred more than 500 KiB.", label, 80, f"{fmt_bytes(transfer)}: {resource.get('name', '')}")
            resource_url = resource.get("name", "")
            if resource_url and host(resource_url) not in {"www.cheekycommodoregamer.co.uk", "cheekycommodoregamer.co.uk"}:
                candidate(candidates, "lcp-third-party", "Remove third-party dependency from the LCP path", "The measured LCP resource was served by a third-party host.", label, 85, resource_url)

        navigation = browser.get("navigation") or {}
        response_start = navigation.get("response_start")
        if response_start is not None and response_start > 800:
            candidate(candidates, "document-response-time", "Investigate document response delay", "The HTML response began more than 800ms after navigation start under the audit profile.", label, 55, f"responseStart {response_start:.0f}ms")

        route_cls = max([value for value in [browser_cls, lighthouse_cls] if value is not None], default=None)
        if route_cls is not None and route_cls > 0.1:
            warnings.append(f"{label} mobile CLS was {route_cls:.3f} in at least one diagnostic run.")

        for source in lh_cls:
            cls_sources.append({"route": label, "selector": source["selector"], "total_value": source["score"], "occurrences": 1, "origin": "Lighthouse", "causes": source["causes"]})
            if any("Web font" in cause for cause in source["causes"]):
                candidate(candidates, "cls-web-font", "Stabilise web-font loading", "Lighthouse identified a web font as a layout-shift cause.", label, 90, f"{source['selector']}: {', '.join(source['causes'])}")
            elif source["score"] > 0.05:
                candidate(candidates, f"cls-source:{source['selector']}", f"Stabilise {source['selector']}", "Lighthouse attributed more than 0.05 layout-shift score to this element.", label, 80, f"score {source['score']:.3f}")

        for source in browser.get("shift_sources") or []:
            selector_value = source.get("selector", "[unknown]")
            cls_sources.append({"route": label, "selector": selector_value, "total_value": source.get("total_value", 0), "occurrences": source.get("occurrences", 0), "origin": "browser", "causes": []})
            if route_cls is not None and route_cls > 0.1 and selector_value not in {"a", "::after", "[unknown]"} and source.get("total_value", 0) > 0.05:
                candidate(candidates, f"cls-source:{selector_value}", f"Stabilise {selector_value}", "The element appeared in a high-value browser-observed layout-shift source group.", label, 70, f"{source.get('occurrences', 0)} occurrence(s), source value {source.get('total_value', 0):.3f}")

        if route.get("family") == "game":
            game_patterns.append({
                "label": label,
                "selector": selector or "[none]",
                "tag": tag or "[none]",
                "host": host(lcp.get("url") or element.get("src") or ""),
                "loading": element.get("loading") or "",
                "fetch_priority": element.get("fetch_priority") or "",
                "lcp_ms": route_lcp,
                "cls": route_cls,
                "dominant_phase": phase,
                "tested_url": row["tested_url"],
            })

    valid_game_patterns = [item for item in game_patterns if item["selector"] != "[none]"]
    selector_counts = Counter(item["selector"] for item in valid_game_patterns)
    tag_counts = Counter(item["tag"] for item in valid_game_patterns)
    host_counts = Counter(item["host"] for item in valid_game_patterns)
    common_game_issue = None
    if valid_game_patterns:
        most_selector, selector_count = selector_counts.most_common(1)[0]
        if selector_count >= math.ceil(len(game_patterns) * 0.6):
            common_game_issue = {"selector": most_selector, "count": selector_count, "total": len(game_patterns), "tag": tag_counts.most_common(1)[0][0], "host": host_counts.most_common(1)[0][0]}

    ranked_candidates = sorted(candidates.values(), key=lambda item: (-item["severity"], -len(item["routes"]), item["title"]))
    for index, item in enumerate(ranked_candidates, start=1):
        item["rank"] = index

    verdict = "INCOMPLETE" if failures else ("PASS WITH FINDINGS" if warnings else "PASS")
    lines = [
        "# Phase 8A LCP and Layout-Shift Diagnostic", "", "## Verdict", "", f"**{verdict}**", "",
        f"This read-only diagnostic inspected current `main` commit `{args.main_sha}`. It measured mobile LCP elements, resource timing and layout-shift sources on four core routes and five deterministic single-game pages, then correlated those observations with Lighthouse performance diagnostics.", "",
        f"- Routes tested: **{len(routes)}**", f"- Browser diagnostic failures: **{sum(1 for item in browser_items.values() if item.get('error'))}**", f"- Lighthouse failures: **{sum(1 for item in lighthouse_items.values() if item.get('error'))}**", f"- Findings recorded: **{len(warnings)}**", f"- Ranked correction candidates: **{len(ranked_candidates)}**", "",
        "Canonical game URLs use the site's existing redirect shell. To inspect the rendered shared game template without contaminating LCP attribution with that redirect, the five game diagnostics tested the final `/games/game.html?id=...` destination directly.", "",
        "Lab measurements are diagnostic evidence, not field Core Web Vitals. Search Console or CrUX remains the source for production-user experience.", "", "## Route attribution", "",
        "| Route | Family | Observed LCP | Lighthouse LCP | LCP element | Dominant LCP phase | Observed CLS | Lighthouse CLS |",
        "|---|---|---:|---:|---|---|---:|---:|",
    ]
    for row in route_rows:
        phase = row.get("dominant_phase") or {}
        phase_text = f"{phase.get('label')} {fmt_seconds(phase.get('duration_ms'))}" if phase else "n/a"
        lines.append(f"| {safe_cell(row['label'])} | {safe_cell(row['family'])} | {fmt_seconds(row['observed_lcp_ms'])} | {fmt_seconds(row['lighthouse_lcp_ms'])} | {safe_cell(row['selector'] or row['tag'])} | {safe_cell(phase_text)} | {fmt_cls(row['browser_cls'])} | {fmt_cls(row['lighthouse_cls'])} |")

    lines.extend(["", "## Single-game comparison", ""])
    if game_patterns:
        lines.extend(["| Game route | LCP selector | Tag | Loading | Fetch priority | Dominant phase | LCP | CLS |", "|---|---|---|---|---|---|---:|---:|"])
        for item in game_patterns:
            phase = item.get("dominant_phase") or {}
            phase_text = f"{phase.get('label')} {fmt_seconds(phase.get('duration_ms'))}" if phase else "n/a"
            lines.append(f"| {safe_cell(item['label'])} | {safe_cell(item['selector'])} | {safe_cell(item['tag'])} | {safe_cell(item['loading'])} | {safe_cell(item['fetch_priority'])} | {safe_cell(phase_text)} | {fmt_seconds(item['lcp_ms'])} | {fmt_cls(item['cls'])} |")
        lines.append("")
        if common_game_issue:
            lines.append(f"The same LCP selector `{common_game_issue['selector']}` appeared on **{common_game_issue['count']} of {common_game_issue['total']}** tested game pages. This supports treating it as shared-template behaviour rather than a Zeewolf-only result.")
        else:
            lines.append("No single identified LCP selector dominated at least 60% of the tested game pages; route-specific treatment may be required.")
    else:
        lines.append("No game-page result was available.")

    lines.extend(["", "## Highest layout-shift sources", ""])
    if cls_sources:
        lines.extend(["| Route | Source | Selector | Score/value | Cause |", "|---|---|---|---:|---|"])
        for source in sorted(cls_sources, key=lambda item: item["total_value"], reverse=True)[:25]:
            lines.append(f"| {safe_cell(source['route'])} | {source['origin']} | `{safe_cell(source['selector'])}` | {source['total_value']:.3f} | {safe_cell(', '.join(source.get('causes') or []))} |")
    else:
        lines.append("No browser or Lighthouse layout-shift source was recorded.")

    lines.extend(["", "## Ranked correction candidates", ""])
    if ranked_candidates:
        for item in ranked_candidates:
            lines.extend([f"### {item['rank']}. {item['title']}", "", item["reason"], "", f"Affected routes: {', '.join(item['routes'])}."])
            if item["evidence"]:
                lines.extend(["", "Evidence:"])
                for evidence in item["evidence"][:10]:
                    lines.append(f"- `{safe_cell(evidence)}`")
            lines.append("")
    else:
        lines.append("No bounded correction candidate was identified from the captured evidence.")

    lines.extend(["## Recommended next bounded PR", ""])
    if ranked_candidates:
        top = ranked_candidates[0]
        lines.append(f"Start with **{top['title']}** on only the affected page family. Re-run the same Phase 8A routes and require lower LCP or CLS without changing the Omega presentation, routes or game data.")
    else:
        lines.append("Do not start a correction PR until another diagnostic run identifies a repeatable source.")

    lines.extend(["", "## Findings", ""])
    lines.extend([f"- {warning}" for warning in warnings] or ["- No route exceeded the audit LCP or CLS reference in the captured runs."])
    lines.extend(["", "## Diagnostic failures", ""])
    lines.extend([f"- {failure}" for failure in failures] or ["- None"])
    lines.extend(["", "## Safety", "", "- No public HTML, CSS, JavaScript, image, game record, route or sitemap was changed.", "- `index.html`, `home.html`, `resources/css/intro.css`, `js/index-intro.js` and `games/games.json` were hash-protected.", "- Screenshots, full Lighthouse reports and raw browser timing remain workflow artifacts rather than public-site files.", "- Any correction must use a separate bounded PR with explicit approval.", ""])

    evidence = {
        "phase": "8A", "main_sha": args.main_sha, "verdict": verdict, "methodology": data.get("methodology"),
        "route_rows": route_rows, "game_patterns": game_patterns, "common_game_issue": common_game_issue,
        "layout_shift_sources": sorted(cls_sources, key=lambda item: item["total_value"], reverse=True),
        "ranked_candidates": ranked_candidates, "warnings": warnings, "failures": failures, "raw_diagnostic": data,
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
