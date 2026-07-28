#!/usr/bin/env python3
"""Phase 1 review-only canonical and indexing analysis.

This script reuses the Phase 0 public-site inventory, classifies canonical
collisions and produces recommendations. It does not edit public pages,
redirects, sitemaps, navigation, game data or the intro loader.
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlparse

import phase0_site_audit as audit

ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "docs" / "seo-baseline"
PHASE0_JSON = REPORT_DIR / "phase-0-baseline.json"
PHASE1_JSON = REPORT_DIR / "phase-1-canonical-review.json"
PHASE1_MD = REPORT_DIR / "phase-1-canonical-review.md"

# Match the public-site scope used by Phase 0.
audit.EXCLUDED_TOP_LEVEL.update({
    "docs",
    "resources",
    "scripts",
    "templates",
})
audit.EXCLUDED_NAME_PARTS = audit.EXCLUDED_NAME_PARTS + (
    "index_temp",
    "_temp.html",
    "-temp.html",
)


def normalise_path(value: str) -> str:
    path = urlparse(value or "").path or "/"
    path = re.sub(r"/{2,}", "/", path)
    if path.endswith("/index.html"):
        path = path[:-10]
    return path or "/"


def flat_folder_key(file_name: str) -> str:
    if file_name.endswith("/index.html"):
        return file_name[:-11]
    if file_name.endswith(".html"):
        return file_name[:-5]
    return file_name


def has_flat_folder_pair(files: list[str]) -> bool:
    flat = {name[:-5] for name in files if name.endswith(".html") and not name.endswith("/index.html")}
    folders = {name[:-11] for name in files if name.endswith("/index.html")}
    return bool(flat & folders)


def page_route(page: dict) -> str:
    return normalise_path(page.get("url_path") or page.get("url") or "")


def classify_group(canonical: str, pages: list[dict]) -> dict:
    canonical_path = normalise_path(canonical)
    files = sorted(page["file"] for page in pages)
    routes = sorted({page_route(page) for page in pages})
    owners = sorted(page["file"] for page in pages if page_route(page) == canonical_path)
    all_games = all(file_name.startswith("games/") for file_name in files)
    all_demo = all(file_name.startswith("amiga-demo-music/") for file_name in files)
    fallback_files = {
        "games/game.html",
        "music/composer.html",
        "games/publisher.html",
    }
    has_fallback = any(file_name in fallback_files for file_name in files)
    flat_folder = has_flat_folder_pair(files)
    root_alias = canonical_path == "/" and any(
        file_name in {"index.html", "home.html", "complete-index.html"} for file_name in files
    )

    if has_fallback:
        category = "dynamic fallback claims a canonical"
        confidence = "high"
        risk = "high"
        batch = "C — dynamic fallbacks"
        action = (
            "Keep the dynamic fallback available for runtime use, but make it noindex and stop it "
            "from claiming an individual content canonical. Preserve each generated content route."
        )
    elif flat_folder:
        category = "flat-file and folder duplicate"
        confidence = "high"
        risk = "low" if owners else "medium"
        batch = "A — matched route duplicates"
        action = (
            "Retain the canonical owner, demote the matching alternate route to a noindex redirect "
            "stub or hosting redirect, and update internal links to the canonical route."
        )
    elif all_games and owners:
        category = "legacy game-slug alias"
        confidence = "high"
        risk = "medium"
        batch = "B — game slug aliases"
        action = (
            "Retain the existing canonical game route. Preserve each legacy slug as a noindex redirect "
            "stub and replace internal links that still target the alias."
        )
    elif all_demo and owners:
        category = "legacy demo-music alias"
        confidence = "high"
        risk = "medium"
        batch = "B — content slug aliases"
        action = (
            "Retain the canonical folder route and demote the alternate demo route to a noindex redirect "
            "stub after confirming that both pages represent the same item."
        )
    elif root_alias:
        category = "homepage route alias"
        confidence = "high"
        risk = "medium"
        batch = "D — static route decisions"
        action = (
            "Retain one public homepage canonical. Other root implementations must not remain separately "
            "indexable; preserve loader behaviour while applying noindex or server redirects only after testing."
        )
    elif owners:
        category = "multiple pages claim an existing canonical"
        confidence = "medium"
        risk = "medium"
        batch = "D — manual route decisions"
        action = (
            "Compare page purpose and content. Retain the canonical owner and demote only confirmed aliases; "
            "do not redirect pages that serve a distinct user purpose."
        )
    else:
        category = "canonical target has no matching route owner"
        confidence = "medium"
        risk = "high"
        batch = "E — unresolved canonical targets"
        action = (
            "Do not automate. Confirm the intended destination, whether it exists in generated output, and "
            "whether the canonical should be changed or the missing route restored."
        )

    return {
        "canonical": canonical,
        "canonical_path": canonical_path,
        "files": files,
        "routes": routes,
        "canonical_owner_files": owners,
        "category": category,
        "confidence": confidence,
        "risk": risk,
        "batch": batch,
        "recommended_action": action,
    }


def escape_cell(value: str) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def main() -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    # Generate a current full inventory using the already-merged Phase 0 logic.
    audit.main()
    findings = json.loads(PHASE0_JSON.read_text(encoding="utf-8"))
    pages = findings.get("pages", [])
    page_by_file = {page["file"]: page for page in pages}

    groups: list[dict] = []
    for canonical, files in sorted(findings.get("duplicate_indexable_canonicals", {}).items()):
        group_pages = [page_by_file[file_name] for file_name in files if file_name in page_by_file]
        if len(group_pages) > 1:
            groups.append(classify_group(canonical, group_pages))

    groups.sort(key=lambda group: (group["batch"], group["canonical"]))
    category_counts = Counter(group["category"] for group in groups)
    batch_counts = Counter(group["batch"] for group in groups)
    risk_counts = Counter(group["risk"] for group in groups)

    missing_canonicals = sorted(
        findings.get("missing_canonicals", []),
        key=lambda page: page.get("file", ""),
    )
    sitemap_missing = sorted(
        findings.get("sitemap_missing", []),
        key=lambda page: page.get("file", ""),
    )

    summary = {
        "canonical_collision_groups": len(groups),
        "collision_pages": sum(len(group["files"]) for group in groups),
        "high_risk_groups": risk_counts.get("high", 0),
        "medium_risk_groups": risk_counts.get("medium", 0),
        "low_risk_groups": risk_counts.get("low", 0),
        "indexable_pages_missing_canonicals": len(missing_canonicals),
        "indexable_pages_missing_from_sitemaps": len(sitemap_missing),
        "category_counts": dict(sorted(category_counts.items())),
        "batch_counts": dict(sorted(batch_counts.items())),
    }

    payload = {
        "summary": summary,
        "groups": groups,
        "missing_canonicals": missing_canonicals,
        "sitemap_missing": sitemap_missing,
        "guardrails": [
            "No public route is changed by this review.",
            "No file should be deleted solely because it shares a canonical.",
            "Aliases must preserve visitors and external links through redirects or noindex redirect stubs.",
            "Dynamic fallback pages require separate testing from static slug aliases.",
            "The intro-loader stack is outside Phase 1 unless explicitly authorised.",
        ],
    }
    PHASE1_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    md: list[str] = [
        "# Phase 1 Canonical and Indexing Review",
        "",
        "This is a review-only report. It does not alter public pages, redirects, canonicals, sitemaps or game data.",
        "",
        "## Executive summary",
        "",
        "| Check | Count |",
        "|---|---:|",
        f"| Canonical collision groups | **{summary['canonical_collision_groups']}** |",
        f"| Indexable pages participating in collisions | **{summary['collision_pages']}** |",
        f"| High-risk groups | **{summary['high_risk_groups']}** |",
        f"| Medium-risk groups | **{summary['medium_risk_groups']}** |",
        f"| Low-risk groups | **{summary['low_risk_groups']}** |",
        f"| Indexable pages missing canonicals | **{summary['indexable_pages_missing_canonicals']}** |",
        f"| Indexable pages missing from sitemaps | **{summary['indexable_pages_missing_from_sitemaps']}** |",
        "",
        "## Classification",
        "",
        "| Category | Groups |",
        "|---|---:|",
    ]
    for category, count in sorted(category_counts.items()):
        md.append(f"| {escape_cell(category)} | **{count}** |")

    md.extend([
        "",
        "## Recommended correction batches",
        "",
        "| Batch | Groups | Purpose |",
        "|---|---:|---|",
    ])
    batch_purpose = {
        "A — matched route duplicates": "Matched flat-file/folder routes with a resolvable canonical owner.",
        "B — content slug aliases": "Legacy content slugs that appear to represent the same item.",
        "B — game slug aliases": "Legacy game slug variants pointing at an existing game route.",
        "C — dynamic fallbacks": "Runtime fallback pages that must not claim individual content canonicals.",
        "D — manual route decisions": "Pages requiring content-purpose comparison before demotion.",
        "D — static route decisions": "Root or static route decisions that may affect loader behaviour.",
        "E — unresolved canonical targets": "Canonical destinations with no matching route owner.",
    }
    for batch, count in sorted(batch_counts.items()):
        md.append(f"| {escape_cell(batch)} | **{count}** | {escape_cell(batch_purpose.get(batch, 'Manual review required.'))} |")

    md.extend([
        "",
        "## Collision groups",
        "",
        "| Batch | Risk | Canonical | Files claiming it | Owner present | Recommendation |",
        "|---|---|---|---|---|---|",
    ])
    for group in groups:
        files = "<br>".join(f"`{file_name}`" for file_name in group["files"])
        owner = "Yes" if group["canonical_owner_files"] else "No"
        md.append(
            "| "
            + " | ".join([
                escape_cell(group["batch"]),
                escape_cell(group["risk"]),
                f"`{escape_cell(group['canonical_path'])}`",
                files,
                owner,
                escape_cell(group["recommended_action"]),
            ])
            + " |"
        )

    md.extend([
        "",
        "## Indexable pages missing canonical tags",
        "",
    ])
    if missing_canonicals:
        for page in missing_canonicals:
            md.append(f"- `{page.get('file', '')}` — route `{page.get('url_path', '')}`")
    else:
        md.append("None detected.")

    md.extend([
        "",
        "## Indexable pages missing from sitemaps",
        "",
    ])
    if sitemap_missing:
        for page in sitemap_missing:
            md.append(f"- `{page.get('file', '')}` — canonical `{page.get('canonical_path') or page.get('url_path', '')}`")
    else:
        md.append("None detected.")

    md.extend([
        "",
        "## Phase 1 safeguards",
        "",
        "- Do not delete duplicate-route files automatically.",
        "- Preserve legacy inbound links through a redirect or a noindex redirect stub.",
        "- Update internal links before or alongside any route demotion.",
        "- Keep dynamic fallback handling separate from static alias cleanup.",
        "- Do not touch `games/games.json`, navigation, thumbnail rules or the intro-loader stack.",
        "- Implement corrections in separate PRs, beginning with the lowest-risk batch.",
        "",
        "## Next gate",
        "",
        "After this review is approved, Phase 1A should correct only Batch A matched route duplicates, with before/after audit counts and rollback notes.",
    ])

    PHASE1_MD.write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
