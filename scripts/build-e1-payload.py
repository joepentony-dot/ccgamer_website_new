#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
required = [
    root / "js" / "easter-eggs" / "datasette-loader.js",
    root / "resources" / "css" / "easter-eggs-datasette.css",
    root / "scripts" / "test-easter-egg-e1-datasette.mjs",
]
missing = [path for path in required if not path.is_file()]
if missing:
    raise SystemExit("Phase E1 source files are missing: " + ", ".join(str(path.relative_to(root)) for path in missing))
print("Phase E1 source files already exist; no payload reconstruction required.")
Path(__file__).unlink()
print("Removed transient Phase E1 build entrypoint.")
