import json
import os
import re
from collections import defaultdict

GAMES_JSON = "games.json"
GAMES_DIR = "."

# -----------------------------
# Helpers
# -----------------------------

def normalise_title(title: str) -> str:
    """
    Normalise titles so we can detect conceptual duplicates.
    This does NOT affect keep/delete logic.
    """
    t = title.lower()
    t = re.sub(r"[':!]", "", t)          # remove punctuation
    t = re.sub(r"\bii\b", "2", t)        # roman II -> 2
    t = re.sub(r"\biii\b", "3", t)       # roman III -> 3
    t = re.sub(r"\s+", " ", t).strip()
    return t

# -----------------------------
# Load games.json
# -----------------------------

with open(GAMES_JSON, "r", encoding="utf-8") as f:
    games = json.load(f)

slugs = set(game["slug"] for game in games)
slug_to_title = {game["slug"]: game["title"] for game in games}

# For duplicate detection
normalised_title_map = defaultdict(list)
for game in games:
    normalised_title_map[normalise_title(game["title"])].append(game["slug"])

# -----------------------------
# Scan /games directory
# -----------------------------

html_files = [
    f for f in os.listdir(GAMES_DIR)
    if f.endswith(".html") and f not in ("index.html", "game.html")
]

file_slugs = {f[:-5]: f for f in html_files}  # strip .html

# -----------------------------
# Categorise
# -----------------------------

keep = []
delete = []

for slug, filename in file_slugs.items():
    if slug in slugs:
        keep.append(filename)
    else:
        delete.append(filename)

duplicates = {
    title: slugs
    for title, slugs in normalised_title_map.items()
    if len(slugs) > 1
}

# -----------------------------
# Output
# -----------------------------

print("\n✅ KEEP (matches games.json slugs)")
print("================================")
if keep:
    for f in sorted(keep):
        print(f)
else:
    print("None")

print("\n❌ DELETE (no matching slug in games.json)")
print("========================================")
if delete:
    for f in sorted(delete):
        print(f)
else:
    print("None")

print("\n⚠️ DUPLICATES (same title, different slug styles)")
print("===============================================")
if duplicates:
    for title, slug_list in duplicates.items():
        print(f"\nTitle group: {title}")
        for s in slug_list:
            print(f"  - {s}")
else:
    print("None")

print("\n--- Summary ---")
print(f"KEEP: {len(keep)}")
print(f"DELETE: {len(delete)}")
print(f"DUPLICATE GROUPS: {len(duplicates)}")