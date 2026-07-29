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
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD_TARGET = ROOT / "scripts" / "build-games.js"
REBUILD_TARGET = ROOT / "scripts" / "rebuild-games.js"
COMPOSER_TARGET = ROOT / "scripts" / "generate-composer-pages.js"


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


def update_rebuild_games() -> None:
    source = REBUILD_TARGET.read_text(encoding="utf-8")
    updated = source.replace('  ["generate-retro-pages.js"],\n', "")
    if updated != source:
        REBUILD_TARGET.write_text(updated, encoding="utf-8")
        print("Removed unrelated retro-page generation from scripts/rebuild-games.js")
    else:
        print("scripts/rebuild-games.js already excludes unrelated retro pages.")


def main() -> None:
    update_build_games()
    update_composer_generator()
    update_rebuild_games()


if __name__ == "__main__":
    main()
