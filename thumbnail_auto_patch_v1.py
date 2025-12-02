import os
import json
import re
from collections import Counter

# ============================================
# CONFIG
# ============================================
JSON_PATH = os.path.join("games", "games.json")
IMG_DIR = os.path.join("resources", "images", "thumbnails", "all")
OUTPUT_JSON = os.path.join("games", "games_fixed.json")
REPORT_FILE = "thumbnail_autopatch_report.txt"
BACKUP_JSON = os.path.join("games", "games_backup_before_autopatch.json")

# ============================================
# UTILITIES
# ============================================

def normalise_name(name: str) -> str:
    """
    Aggressive normaliser:
    - lowercases
    - strips extension
    - removes all non-alphanumeric characters
    """
    base = os.path.splitext(name)[0]
    return re.sub(r"[^a-z0-9]+", "", base.lower())

def find_best_thumbnail(requested: str, file_list, file_set, lower_map):
    """
    Given a requested thumbnail path string (from JSON),
    try to find the best-matching real file in IMG_DIR.
    Returns the *filename only* (no path), or None if no good match.
    """
    if not requested:
        return None

    req = requested.strip()
    if not req:
        return None

    # Only care about the basename
    filename = os.path.basename(req)

    # 1) Exact match
    if filename in file_set:
        return filename

    # 2) Case-insensitive match
    low = filename.lower()
    if low in lower_map:
        return lower_map[low]

    name, ext = os.path.splitext(filename)

    # 3) Try alternative extensions (jpg, png, jpeg)
    alt_exts = [".jpg", ".png", ".jpeg"]
    for e in alt_exts:
        candidate = name + e
        if candidate in file_set:
            return candidate
        if candidate.lower() in lower_map:
            return lower_map[candidate.lower()]

    # 4) Strip trailing junk characters like "_", "!", "-", etc.
    stripped = re.sub(r"[^a-zA-Z0-9]+$", "", name)
    if stripped != name:
        for e in [ext] + alt_exts:
            cand = stripped + e
            if cand in file_set:
                return cand
            if cand.lower() in lower_map:
                return lower_map[cand.lower()]

    # 5) Super-normalised name: compare against all files
    norm_req = normalise_name(filename)
    if not norm_req:
        return None

    candidates = []
    for f in file_list:
        norm_f = normalise_name(f)
        if norm_f == norm_req:
            # perfect normalised match
            return f

        # If they share a large portion of the characters, consider it
        # (very simple similarity score)
        if norm_req and norm_f:
            common = len(set(norm_req) & set(norm_f))
            score = common / max(len(norm_req), len(norm_f))
            if score >= 0.8:
                candidates.append((score, f))

    if candidates:
        # take the highest scoring candidate
        candidates.sort(reverse=True, key=lambda x: x[0])
        return candidates[0][1]

    return None

# ============================================
# MAIN LOGIC
# ============================================

def main():
    if not os.path.exists(JSON_PATH):
        print(f"ERROR: Cannot find {JSON_PATH}")
        return

    if not os.path.isdir(IMG_DIR):
        print(f"ERROR: Cannot find directory {IMG_DIR}")
        return

    print(f"Loading JSON from {JSON_PATH}...")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        games = json.load(f)

    print(f"Loaded {len(games)} games.")

    print(f"Scanning thumbnails in {IMG_DIR}...")
    files = sorted(os.listdir(IMG_DIR))
    file_set = set(files)
    lower_map = {f.lower(): f for f in files}

    # Stats
    unchanged = 0
    fixed_exact_case = 0
    fixed_extension = 0   # (not specifically separated, but left for future)
    fixed_smart = 0
    missing_total = 0

    changes = []
    unresolved = []

    # BACKUP original JSON
    if not os.path.exists(BACKUP_JSON):
        print(f"Creating backup at {BACKUP_JSON}...")
        with open(BACKUP_JSON, "w", encoding="utf-8") as bf:
            json.dump(games, bf, ensure_ascii=False, indent=2)

    # Process each game
    for game in games:
        orig_thumb = (game.get("thumbnail") or "").strip()
        if not orig_thumb:
            unresolved.append((game.get("id"), "NO_THUMBNAIL_FIELD"))
            missing_total += 1
            continue

        # Extract original filename
        orig_filename = os.path.basename(orig_thumb)

        # Try to find best matching file
        best = find_best_thumbnail(orig_thumb, files, file_set, lower_map)

        if best is None:
            # keep original, but report as unresolved
            unresolved.append((game.get("id"), orig_filename))
            missing_total += 1
            continue

        # If best == orig_filename (exact), we don't change anything
        if best == orig_filename:
            unchanged += 1
            continue

        # Case-insensitive same?
        if best.lower() == orig_filename.lower():
            fixed_exact_case += 1
        else:
            fixed_smart += 1

        # Rebuild the full path:
        # Preserve the prefix from the original thumbnail, but swap the basename.
        # Example: /ccgamer_website_new/resources/images/thumbnails/all/army_moves_.jpg
        # becomes: /ccgamer_website_new/resources/images/thumbnails/all/army_moves.jpg
        prefix = orig_thumb.rsplit("/", 1)[0]
        new_thumb = prefix + "/" + best

        game["thumbnail"] = new_thumb

        changes.append((game.get("id"), orig_filename, best))

    # Write fixed JSON
    print(f"Writing fixed JSON to {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, "w", encoding="utf-8") as outf:
        json.dump(games, outf, ensure_ascii=False, indent=2)

    # Write report
    print(f"Writing report to {REPORT_FILE}...")
    with open(REPORT_FILE, "w", encoding="utf-8") as rf:
        rf.write("====== THUMBNAIL AUTO-PATCH REPORT v1 ======\n\n")
        rf.write(f"Total games: {len(games)}\n")
        rf.write(f"Unchanged thumbnails: {unchanged}\n")
        rf.write(f"Fixed by exact-case match: {fixed_exact_case}\n")
        rf.write(f"Fixed by smart matching (normalised names etc.): {fixed_smart}\n")
        rf.write(f"Still unresolved / missing: {missing_total}\n\n")

        rf.write("=== CHANGES APPLIED ===\n")
        if changes:
            for gid, old, new in changes:
                rf.write(f"[FIXED] {gid}\n  OLD: {old}\n  NEW: {new}\n\n")
        else:
            rf.write("No changes were necessary.\n\n")

        rf.write("=== UNRESOLVED ENTRIES ===\n")
        if unresolved:
            for gid, issue in unresolved:
                rf.write(f"[UNRESOLVED] {gid} → {issue}\n")
        else:
            rf.write("None. All thumbnails resolved.\n")

    print("\n====== AUTO-PATCH COMPLETE ======")
    print(f"Fixed JSON: {OUTPUT_JSON}")
    print(f"Report: {REPORT_FILE}")
    print("Original JSON backed up at:", BACKUP_JSON)


if __name__ == "__main__":
    main()
