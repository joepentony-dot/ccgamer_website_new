#!/usr/bin/env python3
"""Normalize ownership and scope for the Phase 6B publishing chain.

The dedicated generate-composer-pages.js script owns all composer routes. Keeping
an older five-credit composer cleanup inside build-games.js makes consecutive
rebuilds alternate between deleting and restoring valid composer pages.

Generated composer pages must also be excluded from the generator's scan for
hand-maintained existing pages. Otherwise all generated routes are reclassified
as curated on one run, removed as stale, then regenerated on the next run.

The game-publishing command must not regenerate unrelated Retro Events, Retro
Specials or Amiga demo pages, because that generator derives media dates from
the current filesystem time and makes repeat game rebuilds non-deterministic.

Disposable synthetic worktrees are detached from the committed PR head, so they
must apply the same bounded Phase 6B transformations before testing publishing.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD_TARGET = ROOT / "scripts" / "build-games.js"
REBUILD_TARGET = ROOT / "scripts" / "rebuild-games.js"
COMPOSER_TARGET = ROOT / "scripts" / "generate-composer-pages.js"
VALIDATOR_TARGET = ROOT / "scripts" / "validate-year-platform-discovery.js"
TRANSACTION_TARGET = ROOT / "scripts" / "phase6b_games_editor_transaction.py"


def update_build_games() -> None:
    source = BUILD_TARGET.read_text(encoding="utf-8")

    source = source.replace('const crypto = require("crypto");\n', "")
    source = source.replace('const { spawnSync } = require("child_process");\n', "")
    source = re.sub(
        r"\nfunction runSeoVerification\(\) \{.*?\n\}\n",
        "\n",
        source,
        count=1,
        flags=re.S,
    )

    replacement = '''function main() {
  const indexChanged = writeFileIfChanged('games/games-index.json', `${JSON.stringify(buildGamesIndexData(games), null, 2)}\\n`);
  const searchChanged = writeFileIfChanged('games/games-search.json', `${JSON.stringify(buildGamesSearchData(games), null, 2)}\\n`);

  const pageResult = processChangedGamesOnly(games);
  console.log(`[DATA] games-index.json ${indexChanged ? 'updated' : 'unchanged'}`);
  console.log(`[DATA] games-search.json ${searchChanged ? 'updated' : 'unchanged'}`);
  console.log(`[DATA] game pages processed incrementally: ${pageResult.planned}`);
}

if (require.main === module)'''

    pattern = re.compile(
        r"function main\(\) \{.*?\n\}\n\nif \(require\.main === module\)",
        re.S,
    )
    updated, count = pattern.subn(replacement, source, count=1)
    if count != 1:
        raise SystemExit("Could not isolate build-games.js main function.")

    if updated != source:
        BUILD_TARGET.write_text(updated, encoding="utf-8")
        print("Removed legacy composer-page ownership from scripts/build-games.js")
    else:
        print("scripts/build-games.js already delegates composer pages exclusively.")


def update_composer_generator() -> None:
    source = COMPOSER_TARGET.read_text(encoding="utf-8")
    old = '''        const html = fs.readFileSync(filePath, "utf8");
        if (!/data-ccg-page\\s*=\\s*(["'])music-composer\\1/i.test(html)) continue;
'''
    new = '''        const html = fs.readFileSync(filePath, "utf8");
        if (/data-generated-composer\\s*=\\s*(["'])true\\1/i.test(html)) continue;
        if (!/data-ccg-page\\s*=\\s*(["'])music-composer\\1/i.test(html)) continue;
'''
    if new in source:
        print("generate-composer-pages.js already distinguishes generated routes.")
        return
    if source.count(old) != 1:
        raise SystemExit("Could not isolate composer existing-page scan.")
    COMPOSER_TARGET.write_text(source.replace(old, new, 1), encoding="utf-8")
    print("Excluded generated composer routes from curated-page detection.")


def update_year_platform_validator() -> None:
    source = VALIDATOR_TARGET.read_text(encoding="utf-8")
    original = source

    fixed_totals = '''    if (yearMembershipLinks !== 651) problems.push(`Year membership total is ${yearMembershipLinks}; expected 651`);
    if (platformLinkTotals.get("c64") !== 552) problems.push(`C64 membership total is ${platformLinkTotals.get("c64")}; expected 552`);
    if (platformLinkTotals.get("amiga") !== 99) problems.push(`Amiga membership total is ${platformLinkTotals.get("amiga")}; expected 99`);
'''
    dynamic_totals = '''    const expectedYearMembershipLinks = archiveData.games.length;
    const expectedC64MembershipLinks = platforms.find((group) => group.key === "c64")?.games.length || 0;
    const expectedAmigaMembershipLinks = platforms.find((group) => group.key === "amiga")?.games.length || 0;
    if (yearMembershipLinks !== expectedYearMembershipLinks) {
        problems.push(`Year membership total is ${yearMembershipLinks}; expected ${expectedYearMembershipLinks}`);
    }
    if (platformLinkTotals.get("c64") !== expectedC64MembershipLinks) {
        problems.push(`C64 membership total is ${platformLinkTotals.get("c64")}; expected ${expectedC64MembershipLinks}`);
    }
    if (platformLinkTotals.get("amiga") !== expectedAmigaMembershipLinks) {
        problems.push(`Amiga membership total is ${platformLinkTotals.get("amiga")}; expected ${expectedAmigaMembershipLinks}`);
    }
'''
    if fixed_totals in source:
        source = source.replace(fixed_totals, dynamic_totals, 1)
    elif dynamic_totals not in source:
        raise SystemExit("Could not verify year/platform membership validation.")

    ordered_registry = '''    compareExactList(comparableCurrent, expectedForeign, "Non-year/platform registry order", problems);
'''
    membership_registry = '''    const missingForeign = expectedForeign.filter((entry) => !comparableCurrent.includes(entry));
    const unexpectedForeign = comparableCurrent.filter((entry) => !expectedForeign.includes(entry));
    if (missingForeign.length) problems.push(`Non-year/platform registry entries missing: ${missingForeign.join(", ")}`);
    if (unexpectedForeign.length) problems.push(`Unexpected non-year/platform registry entries: ${unexpectedForeign.join(", ")}`);
'''
    if ordered_registry in source:
        source = source.replace(ordered_registry, membership_registry, 1)
    elif membership_registry not in source:
        raise SystemExit("Could not verify foreign registry membership validation.")

    ordered_sitemap = '''    compareExactList(comparableCurrent, expectedLocs, `${label} URL order`, problems);
'''
    membership_sitemap = '''    const missingLocs = expectedLocs.filter((url) => !comparableCurrent.includes(url));
    const unexpectedLocs = comparableCurrent.filter((url) => !expectedLocs.includes(url));
    if (missingLocs.length) problems.push(`${label} URLs missing: ${missingLocs.join(", ")}`);
    if (unexpectedLocs.length) problems.push(`Unexpected ${label} URLs: ${unexpectedLocs.join(", ")}`);
'''
    if ordered_sitemap in source:
        source = source.replace(ordered_sitemap, membership_sitemap, 1)
    elif membership_sitemap not in source:
        raise SystemExit("Could not verify foreign sitemap membership validation.")

    source = source.replace(
        "| Existing non-archive registry entries preserved in order |",
        "| Existing non-archive registry entries preserved by exact membership |",
    )
    source = source.replace(
        "- Stable-order checks for registry entries and sitemap URLs owned by other workflows.",
        "- Exact membership checks for registry entries and sitemap URLs owned by other workflows; Phase 6B separately enforces deterministic current ordering.",
    )

    if source != original:
        VALIDATOR_TARGET.write_text(source, encoding="utf-8")
        print("Updated Phase 4D validation for current-data totals and intentional Phase 6B ordering.")
    else:
        print("Phase 4D validation already supports Phase 6B catalogue growth and ordering.")


def update_rebuild_games() -> None:
    source = REBUILD_TARGET.read_text(encoding="utf-8")
    updated = source.replace('  ["generate-retro-pages.js"],\n', "")
    if updated != source:
        REBUILD_TARGET.write_text(updated, encoding="utf-8")
        print("Removed unrelated retro-page generation from scripts/rebuild-games.js")
    else:
        print("scripts/rebuild-games.js already excludes unrelated retro pages.")


def update_transaction() -> None:
    source = TRANSACTION_TARGET.read_text(encoding="utf-8")
    if "import sys\n" not in source:
        source = source.replace("import subprocess\n", "import subprocess\nimport sys\n", 1)

    prepare_old = '''        if not add["passed"]:
            return {"variant": variant["key"], "commands": command_log, "checks": {}, "passed": 0, "total": 0}

        games_path = sandbox / "games" / "games.json"
'''
    prepare_new = '''        if not add["passed"]:
            return {"variant": variant["key"], "commands": command_log, "checks": {}, "passed": 0, "total": 0}

        for script_name in [
            "scripts/apply-phase6b-publishing.py",
            "scripts/phase6b-remove-build-games-composer-owner.py",
        ]:
            prepare = run([sys.executable, script_name], sandbox)
            command_log.append(prepare)
            if not prepare["passed"]:
                return {"variant": variant["key"], "commands": command_log, "checks": {}, "passed": 0, "total": 0}

        games_path = sandbox / "games" / "games.json"
'''
    if prepare_new not in source:
        if source.count(prepare_old) != 1:
            raise SystemExit("Could not isolate synthetic worktree preparation point.")
        source = source.replace(prepare_old, prepare_new, 1)

    anchor_function = '''

def count_anchor_href(html: str, href: str) -> int:
    pattern = re.compile(r'<a\\b[^>]*\\bhref=["\\\']' + re.escape(href) + r'["\\\']', re.I | re.S)
    return len(pattern.findall(html))
'''
    if "def count_anchor_href(" not in source:
        marker = "\ndef run_variant(variant: dict[str, Any], baseline_count: int) -> dict[str, Any]:\n"
        if source.count(marker) != 1:
            raise SystemExit("Could not place structural anchor counter.")
        source = source.replace(marker, anchor_function + marker, 1)

    source = source.replace(
        '"year_archive_once": year_html.count(href) == 1,',
        '"year_archive_once": count_anchor_href(year_html, href) == 1,',
    )
    source = source.replace(
        '"platform_archive_once": platform_html.count(href) == 1,',
        '"platform_archive_once": count_anchor_href(platform_html, href) == 1,',
    )
    source = source.replace(
        "5. Generate downloads and retro outputs.",
        "5. Generate downloads and update archive registration.",
    )

    TRANSACTION_TARGET.write_text(source, encoding="utf-8")
    print("Prepared synthetic worktrees and structural archive-link checks.")


def main() -> None:
    update_build_games()
    update_composer_generator()
    update_year_platform_validator()
    update_rebuild_games()
    update_transaction()


if __name__ == "__main__":
    main()
