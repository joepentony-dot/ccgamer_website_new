#!/usr/bin/env python3
from __future__ import annotations

import base64
import gzip
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / "scripts" / "e1_payload"
TARGETS = {
    "datasette-loader.js.gz.b64.part*": ROOT / "js" / "easter-eggs" / "datasette-loader.js",
    "easter-eggs-datasette.css.gz.b64": ROOT / "resources" / "css" / "easter-eggs-datasette.css",
    "test-easter-egg-e1-datasette.mjs.gz.b64": ROOT / "scripts" / "test-easter-egg-e1-datasette.mjs",
}

for pattern, target in TARGETS.items():
    parts = sorted(PAYLOAD.glob(pattern))
    if not parts:
        raise SystemExit(f"Missing payload for {pattern}")
    encoded = "".join(part.read_text(encoding="utf-8").strip() for part in parts)
    data = gzip.decompress(base64.b64decode(encoded))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    print(f"Generated {target.relative_to(ROOT)} ({len(data)} bytes)")

shutil.rmtree(PAYLOAD)
Path(__file__).unlink()
print("Removed temporary Phase E1 payload files.")
