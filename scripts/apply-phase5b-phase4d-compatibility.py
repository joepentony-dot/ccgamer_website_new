#!/usr/bin/env python3
"""Apply the bounded Phase 5B compatibility update to the Phase 4D validator."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "scripts" / "validate-year-platform-discovery.js"

CONSTANT_ANCHOR = '''const phase4dReportPath = path.join(repoRoot, "docs", "seo-baseline", "phase-4d-year-platform-validation.md");
'''
CONSTANT_BLOCK = '''const phase4dReportPath = path.join(repoRoot, "docs", "seo-baseline", "phase-4d-year-platform-validation.md");
const PHASE5B_EXCLUDED_REGISTRY_ENTRY = "viewer/manual.html";
const PHASE5B_EXCLUDED_SITEMAP_URL = `${SITE_ORIGIN}/viewer/manual.html`;
'''

OLD_REGISTRY = '''function validateBaselineRegistry(current, baseline, problems) {
    const baselineForeign = baseline.filter((entry) => !isOwnedArchiveEntry(entry));
    const currentForeign = current.filter((entry) => !isOwnedArchiveEntry(entry));
    compareExactList(currentForeign, baselineForeign, "Non-year/platform registry order", problems);
}
'''
NEW_REGISTRY = '''function validateBaselineRegistry(current, baseline, problems) {
    const baselineForeign = baseline.filter((entry) => !isOwnedArchiveEntry(entry));
    const currentForeign = current.filter((entry) => !isOwnedArchiveEntry(entry));
    const expectedForeign = baselineForeign.filter((entry) => entry !== PHASE5B_EXCLUDED_REGISTRY_ENTRY);
    const comparableCurrent = currentForeign.filter((entry) => entry !== PHASE5B_EXCLUDED_REGISTRY_ENTRY);

    compareExactList(comparableCurrent, expectedForeign, "Non-year/platform registry order", problems);
    if (currentForeign.includes(PHASE5B_EXCLUDED_REGISTRY_ENTRY)) {
        problems.push(`Phase 5B noindex utility remains in the static registry: ${PHASE5B_EXCLUDED_REGISTRY_ENTRY}`);
    }
}
'''

OLD_SITEMAP = '''function validateBaselineSitemap(currentXml, baselineXml, label, problems) {
    const currentLocs = extractLocs(currentXml);
    const baselineLocs = extractLocs(baselineXml);
    compareExactList(currentLocs, baselineLocs, `${label} URL order`, problems);
}
'''
NEW_SITEMAP = '''function validateBaselineSitemap(currentXml, baselineXml, label, problems) {
    const currentLocs = extractLocs(currentXml);
    const baselineLocs = extractLocs(baselineXml);
    const expectedLocs = baselineLocs.filter((url) => url !== PHASE5B_EXCLUDED_SITEMAP_URL);
    const comparableCurrent = currentLocs.filter((url) => url !== PHASE5B_EXCLUDED_SITEMAP_URL);

    compareExactList(comparableCurrent, expectedLocs, `${label} URL order`, problems);
    if (currentLocs.includes(PHASE5B_EXCLUDED_SITEMAP_URL)) {
        problems.push(`Phase 5B noindex utility remains in ${label}: ${PHASE5B_EXCLUDED_SITEMAP_URL}`);
    }
}
'''

OLD_REPORT_BULLET = "- Stable-order checks for registry entries and sitemap URLs owned by other workflows.\n"
NEW_REPORT_BULLET = (
    "- Stable-order checks for registry entries and sitemap URLs owned by other workflows.\n"
    "- Phase 5B compatibility permits only the reviewed manual-viewer utility exclusion and rejects its reintroduction.\n"
)


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if new in source:
        return source
    if source.count(old) != 1:
        raise SystemExit(f"Could not locate exactly one {label} insertion point.")
    return source.replace(old, new, 1)


def main() -> None:
    if not TARGET.exists():
        raise SystemExit(f"Missing target: {TARGET.relative_to(ROOT)}")

    source = TARGET.read_text(encoding="utf-8")
    updated = replace_once(source, CONSTANT_ANCHOR, CONSTANT_BLOCK, "constant")
    updated = replace_once(updated, OLD_REGISTRY, NEW_REGISTRY, "registry validator")
    updated = replace_once(updated, OLD_SITEMAP, NEW_SITEMAP, "sitemap validator")
    updated = replace_once(updated, OLD_REPORT_BULLET, NEW_REPORT_BULLET, "report bullet")

    required = [
        'const PHASE5B_EXCLUDED_REGISTRY_ENTRY = "viewer/manual.html";',
        'const PHASE5B_EXCLUDED_SITEMAP_URL = `${SITE_ORIGIN}/viewer/manual.html`;',
        "const expectedForeign = baselineForeign.filter",
        "const expectedLocs = baselineLocs.filter",
        "rejects its reintroduction",
    ]
    missing = [needle for needle in required if needle not in updated]
    if missing:
        raise SystemExit(f"Phase 4D compatibility output is incomplete: {missing}")

    if updated != source:
        TARGET.write_text(updated, encoding="utf-8")
        print("Updated scripts/validate-year-platform-discovery.js")
    else:
        print("Phase 4D compatibility is already current")


if __name__ == "__main__":
    main()
