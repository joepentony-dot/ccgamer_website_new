import json
import os
import shutil
import re

ROOT = "resources/images/thumbnails"
ALL_DIR = os.path.join(ROOT, "all")

GAMES_JSON = "games/games.json"
OUTPUT_JSON = "games/games_fixed.json"
REPORT_FILE = "thumbnail_fixer_report.txt"

def slugify(name):
    """Convert game titles to safe lowercase filenames."""
    name = name.lower()
    name = re.sub(r'[^a-z0-9]+', '_', name)
    name = re.sub(r'_+', '_', name).strip("_")
    return name

def find_image(filename_base):
    """Search the entire repo for any matching image file."""
    for root, dirs, files in os.walk("resources/images"):
        for file in files:
            f_lower = file.lower()
            if filename_base in f_lower:
                return os.path.join(root, file)
    return None

def ensure_all_dir():
    if not os.path.exists(ALL_DIR):
        os.makedirs(ALL_DIR)

def safe_copy(src, dst):
    """Windows-safe copy: overwrite if names differ only by case or underscore."""
    if os.path.abspath(src).lower() == os.path.abspath(dst).lower():
        return  # same file on Windows → do nothing
    try:
        shutil.copy(src, dst)
    except shutil.SameFileError:
        # Force overwrite
        os.remove(dst)
        shutil.copy(src, dst)

def run():
    ensure_all_dir()

    with open(GAMES_JSON, "r", encoding="utf-8") as f:
        games = json.load(f)

    report = []
    fixed = 0
    missing = 0

    for game in games:
        title = game.get("title", "unknown")
        safe_base = slugify(title)

        found = find_image(safe_base)

        if found:
            original_file = os.path.basename(found)
            new_filename = re.sub(r'[^a-z0-9\.]+', '_', original_file.lower())

            new_path = os.path.join(ALL_DIR, new_filename)

            # Windows-safe copy
            safe_copy(found, new_path)

            # update JSON
            game["thumblink"] = f"resources/images/thumbnails/all/{new_filename}"

            report.append(f"[OK] {title} → {new_filename}")
            fixed += 1
        else:
            report.append(f"[MISSING] {title} → No thumbnail found")
            missing += 1

    # Save fixed JSON
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(games, f, indent=4)

    # Save report
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(report))
        f.write(f"\n\nTOTAL OK: " + str(fixed))
        f.write(f"\nTOTAL MISSING: " + str(missing))

    print("DONE! JSON and report generated.")

if __name__ == "__main__":
    run()
