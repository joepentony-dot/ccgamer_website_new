#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
canonicalize_dev_publisher.py

Normalises developer/publisher fields in games.json
using lemon-metadata.json as authority.

Rules:
- If lemon developer == lemon publisher -> keep publisher only
- If different -> keep both
- Lemon always overrides games.json
- Creates backup
"""

import json
import shutil
import os


GAMES_PATH = "games/games.json"
LEMON_PATH = "data/lemon-metadata.json"

BACKUP_PATH = "games/games.json.backup-pre-canonical-devpub"


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def norm(s):
    if not isinstance(s, str):
        return ""
    return s.strip().lower()


def main():

    if not os.path.exists(GAMES_PATH):
        print("[ERROR] games.json missing")
        return 2

    if not os.path.exists(LEMON_PATH):
        print("[ERROR] lemon-metadata.json missing")
        return 2

    # Backup
    if not os.path.exists(BACKUP_PATH):
        shutil.copy2(GAMES_PATH, BACKUP_PATH)
        print(f"[OK] Backup created: {BACKUP_PATH}")

    games = load_json(GAMES_PATH)
    lemon = load_json(LEMON_PATH)

    lemon_map = {}

    # Build lookup by slug
    for slug, data in lemon.items():
        lemon_map[slug] = data

    changed = 0
    removed_dev = 0
    kept_both = 0

    for game in games:

        slug = game.get("slug") or game.get("id")

        if not slug:
            continue

        lemon_entry = lemon_map.get(slug)

        if not lemon_entry:
            continue

        lemon_dev = norm(lemon_entry.get("developer"))
        lemon_pubs = lemon_entry.get("publisher", [])

        lemon_pubs_norm = [norm(p) for p in lemon_pubs]

        credits = game.get("credits")

        if not isinstance(credits, dict):
            credits = {}
            game["credits"] = credits

        # Apply lemon publisher
        if lemon_pubs:
            credits["publisher"] = lemon_pubs.copy()

        # Apply lemon developer logic
        if lemon_dev:

            # Same as publisher?
            if lemon_dev in lemon_pubs_norm:
                # Remove developer
                if "developer" in credits:
                    del credits["developer"]
                    removed_dev += 1

            else:
                # Keep developer
                credits["developer"] = lemon_entry["developer"]
                kept_both += 1

        # Remove top-level developer (always prefer credits)
        if "developer" in game:
            del game["developer"]

        changed += 1

    save_json(GAMES_PATH, games)

    print("\n[DONE] Canonical dev/publisher pass complete")
    print(f"  records processed: {changed}")
    print(f"  developers removed: {removed_dev}")
    print(f"  both kept: {kept_both}")
    print(f"  output: {GAMES_PATH}")
    print(f"  backup: {BACKUP_PATH}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
