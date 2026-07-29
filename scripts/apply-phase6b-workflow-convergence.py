#!/usr/bin/env python3
"""Apply Phase 6B baseline-growth and single-writer workflow rules."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "scripts" / "validate-year-platform-discovery.js"
INTEGRATOR = ROOT / "scripts" / "integrate-year-platform-discovery.js"
TRANSACTION = ROOT / "scripts" / "phase6b_games_editor_transaction.py"
LEGACY_WORKFLOWS = [
    ".github/workflows/publisher-archives.yml",
    ".github/workflows/developer-archives.yml",
    ".github/workflows/composer-archives.yml",
    ".github/workflows/game-downloads.yml",
    ".github/workflows/year-platform-archives.yml",
]


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if new in source:
        return source
    if source.count(old) != 1:
        raise SystemExit(f"Could not locate exactly one {label} anchor.")
    return source.replace(old, new, 1)


def write_if_changed(path: Path, content: str) -> bool:
    current = path.read_text(encoding="utf-8")
    if current == content:
        return False
    path.write_text(content, encoding="utf-8")
    return True


def patch_validator() -> bool:
    source = VALIDATOR.read_text(encoding="utf-8")
    compare_anchor = """function compareExactList(actual, expected, label, problems) {
    if (actual.length !== expected.length) {
        problems.push(`${label} count mismatch: ${actual.length} != ${expected.length}`);
        return;
    }
    expected.forEach((value, index) => {
        if (actual[index] !== value) {
            problems.push(`${label} differs at position ${index + 1}: ${actual[index]} != ${value}`);
        }
    });
}
"""
    compare_block = compare_anchor + """
function comparePreservedSubsequence(current, baseline, label, problems) {
    let cursor = 0;
    current.forEach((value) => {
        if (cursor < baseline.length && value === baseline[cursor]) cursor += 1;
    });
    if (cursor !== baseline.length) {
        const missing = baseline.slice(cursor, cursor + 10);
        problems.push(`${label} lost or reordered baseline values near position ${cursor + 1}: ${missing.join(", ")}`);
    }
}

function isGamePublishingRegistryEntry(entry) {
    const value = String(entry || "").replace(/^\/+/, "");
    return /^(?:games\/(?:publishers|developers|downloads|years|platforms)\/|music\/)/.test(value);
}

function isGamePublishingSitemapUrl(url) {
    const value = String(url || "");
    return /\/games\/(?:publishers|developers|downloads|years|platforms)\//.test(value)
        || /\/music\//.test(value);
}
"""
    source = replace_once(source, compare_anchor, compare_block, "preserved-subsequence helper")

    old_registry = """function validateBaselineRegistry(current, baseline, problems) {
    const baselineForeign = baseline.filter((entry) => !isOwnedArchiveEntry(entry));
    const currentForeign = current.filter((entry) => !isOwnedArchiveEntry(entry));
    const expectedForeign = baselineForeign.filter((entry) => entry !== PHASE5B_EXCLUDED_REGISTRY_ENTRY);
    const comparableCurrent = currentForeign.filter((entry) => entry !== PHASE5B_EXCLUDED_REGISTRY_ENTRY);

    compareExactList(comparableCurrent, expectedForeign, "Non-year/platform registry order", problems);
    if (currentForeign.includes(PHASE5B_EXCLUDED_REGISTRY_ENTRY)) {
        problems.push(`Phase 5B noindex utility remains in the static registry: ${PHASE5B_EXCLUDED_REGISTRY_ENTRY}`);
    }
}
"""
    new_registry = """function validateBaselineRegistry(current, baseline, problems) {
    const baselineForeign = baseline.filter((entry) => !isOwnedArchiveEntry(entry));
    const currentForeign = current.filter((entry) => !isOwnedArchiveEntry(entry));
    const expectedUnrelated = baselineForeign.filter((entry) =>
        entry !== PHASE5B_EXCLUDED_REGISTRY_ENTRY && !isGamePublishingRegistryEntry(entry)
    );
    const currentUnrelated = currentForeign.filter((entry) =>
        entry !== PHASE5B_EXCLUDED_REGISTRY_ENTRY && !isGamePublishingRegistryEntry(entry)
    );

    comparePreservedSubsequence(currentUnrelated, expectedUnrelated, "Unrelated registry order", problems);
    if (currentForeign.includes(PHASE5B_EXCLUDED_REGISTRY_ENTRY)) {
        problems.push(`Phase 5B noindex utility remains in the static registry: ${PHASE5B_EXCLUDED_REGISTRY_ENTRY}`);
    }
}
"""
    source = replace_once(source, old_registry, new_registry, "growth-safe registry baseline")

    old_sitemap = """function validateBaselineSitemap(currentXml, baselineXml, label, problems) {
    const currentLocs = extractLocs(currentXml);
    const baselineLocs = extractLocs(baselineXml);
    const expectedLocs = baselineLocs.filter((url) => url !== PHASE5B_EXCLUDED_SITEMAP_URL);
    const comparableCurrent = currentLocs.filter((url) => url !== PHASE5B_EXCLUDED_SITEMAP_URL);

    compareExactList(comparableCurrent, expectedLocs, `${label} URL order`, problems);
    if (currentLocs.includes(PHASE5B_EXCLUDED_SITEMAP_URL)) {
        problems.push(`Phase 5B noindex utility remains in ${label}: ${PHASE5B_EXCLUDED_SITEMAP_URL}`);
    }
}
"""
    new_sitemap = """function validateBaselineSitemap(currentXml, baselineXml, label, problems) {
    const currentLocs = extractLocs(currentXml);
    const baselineLocs = extractLocs(baselineXml);
    let expectedLocs = baselineLocs.filter((url) => url !== PHASE5B_EXCLUDED_SITEMAP_URL);
    let comparableCurrent = currentLocs.filter((url) => url !== PHASE5B_EXCLUDED_SITEMAP_URL);

    if (label === "sitemap-pages.xml") {
        expectedLocs = expectedLocs.filter((url) => !isGamePublishingSitemapUrl(url));
        comparableCurrent = comparableCurrent.filter((url) => !isGamePublishingSitemapUrl(url));
    }
    comparePreservedSubsequence(comparableCurrent, expectedLocs, `${label} preserved URL order`, problems);
    if (currentLocs.includes(PHASE5B_EXCLUDED_SITEMAP_URL)) {
        problems.push(`Phase 5B noindex utility remains in ${label}: ${PHASE5B_EXCLUDED_SITEMAP_URL}`);
    }
}
"""
    source = replace_once(source, old_sitemap, new_sitemap, "growth-safe sitemap baseline")
    source = source.replace(
        "- Stable-order checks for registry entries and sitemap URLs owned by other workflows.",
        "- Truly unrelated baseline registry and sitemap entries must remain present in their original relative order; game-owned archive routes are regenerated and validated from source data.",
    )
    return write_if_changed(VALIDATOR, source)


def patch_integrator_copy() -> bool:
    source = INTEGRATOR.read_text(encoding="utf-8")
    source = source.replace(
        "    if (next.includes(\"games/years/2023/index.html\")) {\n        fail(\"The noindex 2023 route must not be registered as an indexable static page.\");\n    }\n",
        "    const noindexYearEntries = (metadata.years || [])\n        .filter((group) => group && group.indexable !== true)\n        .map((group) => `games/years/${group.year}/index.html`);\n    noindexYearEntries.forEach((entry) => {\n        if (next.includes(entry)) fail(`Noindex year route must not be registered: ${entry}`);\n    });\n",
    )
    source = source.replace(
        "- Kept `/games/years/2023/` out of the static registry and sitemap while it remains `noindex,follow`.",
        "- Kept every single-game `noindex,follow` year route out of the static registry and sitemap.",
    )
    source = source.replace(
        "- No sitemap inclusion for the noindex 2023 route.",
        "- No sitemap inclusion for any noindex year route.",
    )
    return write_if_changed(INTEGRATOR, source)


def patch_transaction_diagnostics() -> bool:
    source = TRANSACTION.read_text(encoding="utf-8")
    source = source.replace('"output_tail": output[-12000:]', '"output_tail": output[-60000:]')
    old = """    if not all_checks:
        failed = {
            result["variant"]: [name for name, passed in result["checks"].items() if not passed]
            for result in transactions
        }
        raise SystemExit(f"Phase 6B publishing transaction failed: {failed}")
"""
    new = """    if not all_checks:
        for result in transactions:
            if not result["command"].get("passed"):
                print()
                print(f"--- {result['variant'].upper()} AUTHORITATIVE COMMAND OUTPUT ---")
                print(result["command"].get("output_tail", ""))
                print(f"--- END {result['variant'].upper()} OUTPUT ---")
                print()
        failed = {
            result["variant"]: [name for name, passed in result["checks"].items() if not passed]
            for result in transactions
        }
        raise SystemExit(f"Phase 6B publishing transaction failed: {failed}")
"""
    source = replace_once(source, old, new, "transaction diagnostics")
    return write_if_changed(TRANSACTION, source)


def patch_workflow(relative: str) -> bool:
    path = ROOT / relative
    source = path.read_text(encoding="utf-8")
    source = source.replace('      - "games/games.json"\n', "")
    pattern = re.compile(r"  push:\n(?:(?!  pull_request:)[\s\S])*?  pull_request:\n", re.M)
    next_source, count = pattern.subn("  pull_request:\n", source, count=1)
    if count == 0 and "  push:" in source:
        raise SystemExit(f"Could not remove automatic push writer from {relative}")
    header = "# Game catalogue changes are generated by the central Phase 6B publishing workflow.\n"
    if not next_source.startswith(header):
        next_source = header + next_source
    return write_if_changed(path, next_source)


def main() -> None:
    changed: list[str] = []
    if patch_validator():
        changed.append(VALIDATOR.relative_to(ROOT).as_posix())
    if patch_integrator_copy():
        changed.append(INTEGRATOR.relative_to(ROOT).as_posix())
    if patch_transaction_diagnostics():
        changed.append(TRANSACTION.relative_to(ROOT).as_posix())
    for relative in LEGACY_WORKFLOWS:
        if patch_workflow(relative):
            changed.append(relative)
    print("Phase 6B convergence files:")
    for relative in changed:
        print(f"- {relative}")


if __name__ == "__main__":
    main()
