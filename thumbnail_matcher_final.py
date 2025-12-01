import json
import os
import re

# === CONFIG ===
JSON_PATH = "games/games.json"
THUMB_DIR = "resources/images/thumbnails/all"   # folder containing all thumbnails

# === NORMALISER FUNCTION ===
def norm(s: str) -> str:
    """Normalize names by lowercasing and removing non-alphanumeric characters."""
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return s.strip()

# === LOAD JSON ===
with open(JSON_PATH, "r", encoding="utf-8") as f:
    games = json.load(f)

# === LOAD REAL THUMBNAIL FILENAMES ===
real_files = [
    f for f in os.listdir(THUMB_DIR)
    if f.lower().endswith((".jpg", ".jpeg", ".png"))
]

# Create a lookup dict using normalized names → real filenames
lookup = {norm(os.path.splitext(f)[0]): f for f in real_files}

unmatched = []
updated = 0

# === PROCESS EACH GAME ===
for g in games:
    title = g.get("title", "")
    current_thumb = os.path.basename(
        g.get("thumbnail") or g.get("thumblink") or ""
    )

    # Normalized keys
    key_title = norm(os.path.splitext(title)[0])
    key_thumb = norm(os.path.splitext(current_thumb)[0])

    resolved = None

    # 1) Try matching using the existing thumbnail filename
    if key_thumb in lookup:
        resolved = lookup[key_thumb]

    # 2) Try matching using the game title
    elif key_title in lookup:
        resolved = lookup[key_title]

    # Apply match
    if resolved:
        g["thumbnail"] = f"{THUMB_DIR}/{resolved}"
        updated += 1
    else:
        unmatched.append({
            "id": g.get("id"),
            "title": title,
            "requested_thumb": current_thumb,
            "norm_title": key_title,
            "norm_thumb": key_thumb,
        })

# === SAVE FIXED JSON ===
with open("games/games_fixed.json", "w", encoding="utf-8") as f:
    json.dump(games, f, indent=2)

# === SAVE MATCH REPORT ===
with open("thumbnail_match_report_final.txt", "w", encoding="utf-8") as f:
    f.write(f"Total games: {len(games)}\n")
    f.write(f"Resolved thumbnails: {updated}\n")
    f.write(f"Unmatched thumbnails: {len(unmatched)}\n\n")
    f.write("=== UNMATCHED ITEMS ===\n")
    for item in unmatched:
        f.write(json.dumps(item) + "\n")

print("✔ Thumbnail matching complete!")
print(f"✔ Updated: {updated}")
print(f"❗ Unmatched: {len(unmatched)}")
print("📄 Report saved to thumbnail_match_report_final.txt")
