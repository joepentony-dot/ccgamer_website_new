import json
import os

# ==========================================
# CONFIG — update if your paths differ
# ==========================================

PROJECT_ROOT = "."
JSON_PATH = os.path.join(PROJECT_ROOT, "games", "games.json")
THUMB_DIR = os.path.join(PROJECT_ROOT, "resources", "images", "thumbnails", "all")

# ==========================================
# LOAD JSON
# ==========================================

with open(JSON_PATH, "r", encoding="utf-8") as f:
    games = json.load(f)

# ==========================================
# NORMALISE thumbnail paths inside JSON
# games.json uses e.g.:
# "/ccgamer_website_new/resources/images/thumbnails/all/1942.jpg"
#
# We only want the filename: 1942.jpg
# ==========================================

def extract_filename(path):
    return os.path.basename(path).strip()

# All filenames that JSON expects
json_thumbs = {extract_filename(g.get("thumbnail", "")): g for g in games}

# All actual files present on disk
disk_thumbs = set(os.listdir(THUMB_DIR))

# ==========================================
# FIND: JSON entries whose thumbnails DO NOT exist
# ==========================================

missing_files = []
for filename, game in json_thumbs.items():
    if filename not in disk_thumbs:
        missing_files.append((filename, game["title"]))

# ==========================================
# FIND: Files on disk that are NOT referenced in JSON
# ==========================================

unused_files = [f for f in disk_thumbs if f not in json_thumbs]

# ==========================================
# OUTPUT
# ==========================================

print("\n==============================")
print(" MISSING THUMBNAILS (JSON → Disk)")
print("==============================\n")

if missing_files:
    for filename, title in missing_files:
        print(f"❌ {filename}  ←  used by: {title}")
else:
    print("🎉 No missing thumbnails — all JSON files exist on disk!")

print("\n==============================")
print(" UNUSED THUMBNAILS (Disk → JSON)")
print("==============================\n")

if unused_files:
    for filename in unused_files:
        print(f"• {filename}")
else:
    print("🎉 No orphaned thumbnail files — every disk file is used!")
