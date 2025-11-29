import os
import json

# ============================================================
# CCG Thumbnail Fixer (FINAL VERSION)
# - Scans each thumbnail folder
# - Builds a mapping of filename → correct folder
# - Updates games.json thumbnail paths
# - Outputs games_fixed.json
# ============================================================

# ROOT PATH TO YOUR WEBSITE FOLDER (edit if needed)
ROOT = "."

THUMB_ROOT = os.path.join(ROOT, "resources", "images", "thumbnails")

# Your new clean folder names:
FOLDERS = [
    "arcade",
    "action-adventure",
    "adventure",
    "bpjs",
    "cartridge",
    "casino",
    "fighting",
    "horror",
    "licensed",
    "platform",
    "puzzle",
    "quiz",
    "racing",
    "rpg",
    "shoot-em-up",
    "sports",
    "strategy",
    "top-picks",
]

# Load games.json
games_path = os.path.join(ROOT, "games", "games.json")

with open(games_path, "r", encoding="utf-8") as f:
    games = json.load(f)

# Build filename → folder lookup
thumbnail_map = {}

print("Scanning thumbnail folders...")

for folder in FOLDERS:
    folder_path = os.path.join(THUMB_ROOT, folder)

    if not os.path.isdir(folder_path):
        print(f"[WARNING] Folder not found: {folder_path}")
        continue

    for file in os.listdir(folder_path):
        if file.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            thumbnail_map[file.lower()] = folder

print(f"Found {len(thumbnail_map)} thumbnail files.")

# Fix JSON entries
missing = 0
updated = 0

for game in games:
    thumb = game.get("thumbnail", "").strip()

    if not thumb:
        continue

    # Extract just filename
    filename = os.path.basename(thumb).lower()

    if filename in thumbnail_map:
        folder = thumbnail_map[filename]
        new_path = f"resources/images/thumbnails/{folder}/{filename}"

        if game["thumbnail"] != new_path:
            game["thumbnail"] = new_path
            updated += 1
    else:
        print(f"[MISSING] {filename} not found in thumbnail folders.")
        missing += 1

print("======================================")
print(f"Updated thumbnail paths: {updated}")
print(f"Missing/Unmatched thumbnails: {missing}")
print("======================================")

# Save output file
output_path = os.path.join(ROOT, "games", "games_fixed.json")

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(games, f, indent=4, ensure_ascii=False)

print(f"\nDONE! → New file written:")
print(output_path)
