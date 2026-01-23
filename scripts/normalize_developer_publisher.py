#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
normalize_developer_publisher.py

Normalises duplicate developer/publisher fields in games.json.

Rules:
1. If game.developer == credits.developer -> remove game.developer
2. If credits.developer == any credits.publisher -> remove credits.developer
3. Never remove non-duplicate values
4. Backup before modifying

Usage:
  python scripts/normalize_developer_publisher.py
"""

import json
import os
import shutil


GAMES_PATH = "games/games.json"
BACKUP_PATH = "games/games.json.backup-pre-devpub-normalize"


def read_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def backup_file(src, dst):
    if not os.path.exists(dst):
        shutil.copy2(src, dst)
        print(f"[OK] Backup created: {dst}")
    else:
        print(f"[OK] Backup already exists: {dst}")


def normalise_string(s):
    if not isinstance(s, str):
        return ""
    return s.strip().lower()


def main():

    if not os.path.exists(GAMES_PATH):
        print(f"[ERROR] Missing {GAMES_PATH}")
        return 2

    backup_file(GAMES_PATH, BACKUP_PATH)

    games = read_json(GAMES_PATH)

    if not isinstance(games, list):
        print("[ERROR] games.json must be an array")
        return 2

    removed_top_dev = 0
    removed_credit_dev = 0

    for game in games:

        top_dev = game.get("developer", "")
        credits = game.get("credits", {})

        if not isinstance(credits, dict):
            continue

        credit_dev = credits.get("developer", "")
        publishers = credits.get("publisher", [])

        top_dev_norm = normalise_string(top_dev)
        credit_dev_norm = normalise_string(credit_dev)

        pub_norm = [
            normalise_string(p)
            for p in publishers
            if isinstance(p, str)
        ]

        # Rule 1: Remove duplicate top-level developer
        if top_dev_norm and credit_dev_norm:
            if top_dev_norm == credit_dev_norm:
                del game["developer"]
                removed_top_dev += 1

        # Rule 2: Remove credit developer if same as publisher
        if credit_dev_norm and pub_norm:
            if credit_dev_norm in pub_norm:
                del credits["developer"]
                removed_credit_dev += 1

    write_json(GAMES_PATH, games)

    print("\n[DONE] Developer/Publisher normalisation complete")
    print(f"  top-level developer removed: {removed_top_dev}")
    print(f"  credits.developer removed:   {removed_credit_dev}")
    print(f"  output: {GAMES_PATH}")
    print(f"  backup: {BACKUP_PATH}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
